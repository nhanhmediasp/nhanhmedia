import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/reports
 *
 * Đã tối ưu:
 * - Prisma.$queryRaw với Prisma.sql tagged template (type-safe, injection-safe)
 *   để tính SUM(COALESCE(custom_price, price)) chính xác
 * - groupBy() thay vì findMany() + JS reduce để tính rankings
 * - Tất cả query độc lập trong Promise.all()
 * - Paginated detail list (mặc định 20 bản ghi, tối đa 50)
 * - Daily/monthly chart chỉ query trong khoảng thời gian cần thiết
 * - console.time() đo từng phần
 */
export async function GET(req: Request) {
  try {
    console.time('[reports] total');

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam   = searchParams.get('endDate');
    const creatorId      = searchParams.get('creatorId');
    const productId      = searchParams.get('productId');
    const statusFilter   = searchParams.get('status');
    const supplierId     = searchParams.get('supplierId');
    const page           = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize       = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // ── Parse date filters ─────────────────────────────────────────────────
    let startFilterDate: Date | undefined;
    let endFilterDate: Date | undefined;
    if (startDateParam) {
      startFilterDate = new Date(startDateParam);
      startFilterDate.setHours(0, 0, 0, 0);
    }
    if (endDateParam) {
      endFilterDate = new Date(endDateParam);
      endFilterDate.setHours(23, 59, 59, 999);
    }

    const now = new Date();
    const chartStart = startFilterDate ?? new Date(now.getTime() - 14 * 86_400_000);
    const chartEnd   = endFilterDate   ?? now;

    // ── Build Prisma where objects ─────────────────────────────────────────
    const orderWhere: Prisma.OrderWhereInput = {
      ...(creatorId  ? { createdByUserId: creatorId  } : {}),
      ...(productId  ? { productId: productId          } : {}),
      ...(statusFilter ? { status: statusFilter        } : {}),
      ...(supplierId ? { supplierId: supplierId         } : {}),
      ...(startFilterDate || endFilterDate ? {
        createdAt: {
          ...(startFilterDate ? { gte: startFilterDate } : {}),
          ...(endFilterDate   ? { lte: endFilterDate   } : {}),
        },
      } : {}),
    };

    const renewalWhere: Prisma.OrderRenewalWhereInput = {
      ...(creatorId  ? { renewedByUserId: creatorId            } : {}),
      ...(supplierId ? { order: { supplierId: supplierId }      } : {}),
      ...(startFilterDate || endFilterDate ? {
        createdAt: {
          ...(startFilterDate ? { gte: startFilterDate } : {}),
          ...(endFilterDate   ? { lte: endFilterDate   } : {}),
        },
      } : {}),
    };

    // ── Build raw SQL WHERE clauses for SUM(COALESCE) ─────────────────────
    // Prisma aggregate không hỗ trợ COALESCE nên cần rawQuery
    const whereParts: Prisma.Sql[] = [];
    if (creatorId)      whereParts.push(Prisma.sql`created_by_user_id = ${creatorId}::uuid`);
    if (productId)      whereParts.push(Prisma.sql`product_id = ${productId}::uuid`);
    if (statusFilter)   whereParts.push(Prisma.sql`status = ${statusFilter}`);
    if (supplierId)     whereParts.push(Prisma.sql`supplier_id = ${supplierId}::uuid`);
    if (startFilterDate) whereParts.push(Prisma.sql`created_at >= ${startFilterDate}`);
    if (endFilterDate)   whereParts.push(Prisma.sql`created_at <= ${endFilterDate}`);

    const rawWhere = whereParts.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereParts, ' AND ')}`
      : Prisma.empty;

    // ── Phase 1: Tất cả queries chạy song song ────────────────────────────
    console.time('[reports] phase1 parallel');

    const [
      // SUM(COALESCE(custom_price, price)) – chính xác cho tổng revenue
      revenueRaw,
      // Renewal revenue
      renewalsAgg,
      // Import price aggregate
      ordersImportAgg,
      // Count orders có importPrice
      ordersWithImportCount,
      // Paginated detail list
      detailOrders,
      detailOrdersTotal,
      // Chart data (chỉ trong chartStart → chartEnd)
      chartOrders,
      chartRenewals,
      // Top rankings (groupBy – không scan toàn bảng)
      topProductsGroup,
      topCreatorsGroup,
      topCustomersGroup,
      // Status distribution (groupBy thay vì findMany toàn bảng)
      statusGroupBy,
    ] = await Promise.all([

      // ① Tổng revenue dùng COALESCE (chính xác khi mix price/customPrice)
      prisma.$queryRaw<{ total: number }[]>(
        Prisma.sql`SELECT COALESCE(SUM(COALESCE(custom_price, price)), 0)::float AS total FROM orders ${rawWhere}`
      ),

      // ② Renewal SUM
      prisma.orderRenewal.aggregate({
        _sum: { price: true },
        where: renewalWhere,
      }),

      // ③ Import price SUM (chỉ rows có importPrice != null)
      prisma.order.aggregate({
        _sum: { importPrice: true },
        where: { ...orderWhere, importPrice: { not: null } },
      }),

      // ④ Count có importPrice
      prisma.order.count({ where: { ...orderWhere, importPrice: { not: null } } }),

      // ⑤ Paginated detail orders (chỉ select field cần dùng)
      prisma.order.findMany({
        where: orderWhere,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          orderCode:  true,
          createdAt:  true,
          price:      true,
          customPrice:true,
          importPrice:true,
          status:     true,
          startDate:  true,
          endDate:    true,
          customer:      { select: { name: true, phone: true } },
          product:       { select: { name: true } },
          variant:       { select: { name: true } },
          createdByUser: { select: { name: true, role: true } },
        },
      }),

      // ⑥ Total count cho pagination
      prisma.order.count({ where: orderWhere }),

      // ⑦ Chart orders – CHỈ trong khoảng thời gian chart (tối đa 15 ngày nếu không lọc)
      prisma.order.findMany({
        where: {
          ...orderWhere,
          createdAt: { gte: chartStart, lte: chartEnd },
        },
        select: { createdAt: true, price: true, customPrice: true, importPrice: true },
        orderBy: { createdAt: 'asc' },
      }),

      // ⑧ Chart renewals
      prisma.orderRenewal.findMany({
        where: {
          ...renewalWhere,
          createdAt: { gte: chartStart, lte: chartEnd },
        },
        select: { createdAt: true, price: true },
        orderBy: { createdAt: 'asc' },
      }),

      // ⑨ Top 5 products (groupBy – không load toàn bộ)
      prisma.order.groupBy({
        by: ['productId'],
        where: orderWhere,
        _sum: { price: true, customPrice: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 5,
      }),

      // ⑩ Top 5 creators (groupBy)
      prisma.order.groupBy({
        by: ['createdByUserId'],
        where: orderWhere,
        _sum: { price: true, customPrice: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 5,
      }),

      // ⑪ Top 5 customers (groupBy)
      prisma.order.groupBy({
        by: ['customerId'],
        where: orderWhere,
        _sum: { price: true, customPrice: true },
        _count: { id: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 5,
      }),

      // ⑫ Status distribution (groupBy – thay vì findMany toàn bảng)
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    console.timeEnd('[reports] phase1 parallel');

    // ── Phase 2: Resolve entity names (song song) ─────────────────────────
    console.time('[reports] phase2 resolve names');
    const productIds  = topProductsGroup.map(p => p.productId);
    const creatorIds  = topCreatorsGroup.map(c => c.createdByUserId);
    const customerIds = topCustomersGroup.map(c => c.customerId);

    const [products, creators, customers] = await Promise.all([
      productIds.length  ? prisma.product.findMany({ where: { id: { in: productIds  } }, select: { id: true, name: true } }) : [],
      creatorIds.length  ? prisma.user.findMany(   { where: { id: { in: creatorIds  } }, select: { id: true, name: true, role: true } }) : [],
      customerIds.length ? prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, phone: true } }) : [],
    ]);
    console.timeEnd('[reports] phase2 resolve names');

    // ── Tính revenue ───────────────────────────────────────────────────────
    console.time('[reports] total revenue');
    const totalOrderRevenue    = Number(revenueRaw[0]?.total ?? 0);
    const totalRenewalRevenue  = renewalsAgg._sum.price ?? 0;
    const totalFilteredRevenue = totalOrderRevenue + totalRenewalRevenue;
    const totalImport          = ordersImportAgg._sum.importPrice ?? 0;
    const totalFilteredProfit  = totalFilteredRevenue - totalImport;
    console.timeEnd('[reports] total revenue');

    // ── Daily chart build ──────────────────────────────────────────────────
    console.time('[reports] daily revenue');
    const formatDayKey = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    const dailyMap = new Map<string, { revenue: number; importPrice: number; profit: number }>();
    const cur = new Date(chartStart);
    while (cur <= chartEnd) {
      dailyMap.set(formatDayKey(cur), { revenue: 0, importPrice: 0, profit: 0 });
      cur.setDate(cur.getDate() + 1);
    }
    for (const o of chartOrders) {
      const slot = dailyMap.get(formatDayKey(new Date(o.createdAt)));
      if (slot) {
        const val = o.customPrice ?? o.price;
        const imp = o.importPrice ?? 0;
        slot.revenue     += val;
        slot.importPrice += imp;
        slot.profit      += val - imp;
      }
    }
    for (const r of chartRenewals) {
      const slot = dailyMap.get(formatDayKey(new Date(r.createdAt)));
      if (slot) { slot.revenue += r.price; slot.profit += r.price; }
    }
    const dailyRevenue = Array.from(dailyMap.entries()).map(([label, s]) => ({
      label, value: s.revenue, revenue: s.revenue, importPrice: s.importPrice, profit: s.profit,
    }));
    console.timeEnd('[reports] daily revenue');

    // ── Monthly chart ──────────────────────────────────────────────────────
    console.time('[reports] monthly revenue');
    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) monthlyMap.set(`Thg ${i + 1}`, 0);
    for (const o of chartOrders) {
      const d = new Date(o.createdAt);
      if (d.getFullYear() === now.getFullYear()) {
        const key = `Thg ${d.getMonth() + 1}`;
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (o.customPrice ?? o.price));
      }
    }
    for (const r of chartRenewals) {
      const d = new Date(r.createdAt);
      if (d.getFullYear() === now.getFullYear()) {
        const key = `Thg ${d.getMonth() + 1}`;
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + r.price);
      }
    }
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([label, value]) => ({ label, value }));
    console.timeEnd('[reports] monthly revenue');

    // ── Build rankings ─────────────────────────────────────────────────────
    const productMap  = new Map(products.map(p  => [p.id, p.name]));
    const creatorMap  = new Map(creators.map(u  => [u.id, u]));
    const customerMap = new Map(customers.map(c => [c.id, c]));

    const topProducts = topProductsGroup.map(p => ({
      label: productMap.get(p.productId) ?? p.productId,
      value: (p._sum.customPrice ?? 0) || (p._sum.price ?? 0),
    })).sort((a, b) => b.value - a.value);

    const topCreators = topCreatorsGroup.map(c => {
      const user = creatorMap.get(c.createdByUserId);
      return {
        label: user?.name ?? c.createdByUserId,
        value: (c._sum.customPrice ?? 0) || (c._sum.price ?? 0),
        subLabel: user?.role === 'collaborator' ? 'CTV'
                : user?.role === 'agency'       ? 'Đại lý'
                : 'Thành viên',
      };
    }).sort((a, b) => b.value - a.value);

    const topCustomers = topCustomersGroup.map(c => {
      const cust = customerMap.get(c.customerId);
      return {
        label: cust?.name ?? c.customerId,
        value: (c._sum.customPrice ?? 0) || (c._sum.price ?? 0),
        subLabel: `${cust?.phone ?? ''} (${c._count.id} đơn)`,
      };
    }).sort((a, b) => b.value - a.value);

    // Status distribution
    const STATUS_COLORS: Record<string, string> = {
      new: '#64748b', processing: '#3b82f6', running: '#10b981',
      expired_soon: '#f59e0b', expired: '#ef4444', cancelled: '#94a3b8',
    };
    const STATUS_LABELS: Record<string, string> = {
      new: 'Mới tạo', processing: 'Đang xử lý', running: 'Đang chạy',
      expired_soon: 'Sắp hết hạn', expired: 'Đã hết hạn', cancelled: 'Đã hủy',
    };
    const orderStatusDistribution = statusGroupBy.map(s => ({
      label: STATUS_LABELS[s.status] ?? s.status,
      value: s._count.id,
      color: STATUS_COLORS[s.status] ?? '#94a3b8',
    }));

    // ── Format detail list ─────────────────────────────────────────────────
    const formattedOrders = detailOrders.map(o => ({
      createdAt:    o.createdAt,
      orderCode:    o.orderCode,
      customerName: o.customer.name,
      customerPhone:o.customer.phone,
      creatorName:  o.createdByUser.name,
      creatorRole:  o.createdByUser.role,
      productName:  o.product.name,
      variantName:  o.variant.name,
      cost:         o.customPrice ?? o.price,
      importPrice:  o.importPrice,
      profit:       o.importPrice != null ? (o.customPrice ?? o.price) - o.importPrice : null,
      status:       o.status,
      startDate:    o.startDate,
      endDate:      o.endDate,
    }));

    console.timeEnd('[reports] total');

    return NextResponse.json({
      filteredReport: {
        totalRevenue:          totalFilteredRevenue,
        totalProfit:           totalFilteredProfit,
        totalImport,
        ordersWithImportPrice: ordersWithImportCount,
        orderCount:            detailOrdersTotal,
        totalPages:            Math.ceil(detailOrdersTotal / pageSize),
        currentPage:           page,
        pageSize,
        orders:                formattedOrders,
      },
      charts: {
        dailyRevenue,
        monthlyRevenue,
        topProducts,
        topCreators,
        topCustomers,
        orderStatusDistribution,
      },
    });
  } catch (error) {
    console.error('[reports] error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ tải báo cáo thống kê.' }, { status: 500 });
  }
}
