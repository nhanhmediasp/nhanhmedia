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
    const type           = searchParams.get('type') ?? 'all'; // 'all' | 'product' | 'project'
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

    const projectWhere: Prisma.ProjectWhereInput = {
      ...(startFilterDate || endFilterDate ? {
        createdAt: {
          ...(startFilterDate ? { gte: startFilterDate } : {}),
          ...(endFilterDate   ? { lte: endFilterDate   } : {}),
        },
      } : {}),
    };

    // ── Build raw SQL WHERE clauses for SUM(COALESCE) ─────────────────────
    const whereParts: Prisma.Sql[] = [];
    if (creatorId)      whereParts.push(Prisma.sql`created_by_user_id = ${creatorId}`);
    if (productId)      whereParts.push(Prisma.sql`product_id = ${productId}`);
    if (statusFilter)   whereParts.push(Prisma.sql`status = ${statusFilter}`);
    if (supplierId)     whereParts.push(Prisma.sql`supplier_id = ${supplierId}`);
    if (startFilterDate) whereParts.push(Prisma.sql`created_at >= ${startFilterDate}`);
    if (endFilterDate)   whereParts.push(Prisma.sql`created_at <= ${endFilterDate}`);

    const rawWhere = whereParts.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(whereParts, ' AND ')}`
      : Prisma.empty;

    const runProducts = type === 'all' || type === 'product';
    const runProjects = type === 'all' || type === 'project';

    // ── Phase 1: Tất cả queries chạy song song ────────────────────────────
    console.time('[reports] phase1 parallel');

    const productPromises = runProducts
      ? Promise.all([
          prisma.$queryRaw<{ total: number }[]>(
            Prisma.sql`SELECT COALESCE(SUM(COALESCE(custom_price, price)), 0)::float AS total FROM orders ${rawWhere}`
          ),
          prisma.orderRenewal.aggregate({ _sum: { price: true }, where: renewalWhere }),
          prisma.order.aggregate({
            _sum: { importPrice: true },
            where: { ...orderWhere, importPrice: { not: null } },
          }),
          prisma.order.count({ where: { ...orderWhere, importPrice: { not: null } } }),
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
          prisma.order.count({ where: orderWhere }),
          prisma.order.findMany({
            where: { ...orderWhere, createdAt: { gte: chartStart, lte: chartEnd } },
            select: { createdAt: true, price: true, customPrice: true, importPrice: true },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.orderRenewal.findMany({
            where: { ...renewalWhere, createdAt: { gte: chartStart, lte: chartEnd } },
            select: { createdAt: true, price: true },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.order.groupBy({
            by: ['productId'],
            where: orderWhere,
            _sum: { price: true, customPrice: true },
            orderBy: { _sum: { price: 'desc' } },
            take: 5,
          }),
          prisma.order.groupBy({
            by: ['createdByUserId'],
            where: orderWhere,
            _sum: { price: true, customPrice: true },
            orderBy: { _sum: { price: 'desc' } },
            take: 5,
          }),
          prisma.order.groupBy({
            by: ['customerId'],
            where: orderWhere,
            _sum: { price: true, customPrice: true },
            _count: { id: true },
            orderBy: { _sum: { price: 'desc' } },
            take: 5,
          }),
          prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
          prisma.customer.count(),
        ])
      : Promise.resolve([
          [{ total: 0 }],
          { _sum: { price: null } },
          { _sum: { importPrice: null } },
          0,
          [],
          0,
          [],
          [],
          [],
          [],
          [],
          [],
          0,
        ]);

    const projectPromises = runProjects
      ? Promise.all([
          prisma.project.aggregate({ _sum: { budget: true }, where: projectWhere }),
          prisma.websiteCost.aggregate({ _sum: { amount: true }, where: { project: projectWhere } }),
          prisma.toolCost.aggregate({ _sum: { cost: true }, where: { project: projectWhere } }),
          prisma.project.findMany({
            where: projectWhere,
            take: pageSize,
            skip: (page - 1) * pageSize,
            orderBy: { createdAt: 'desc' },
            include: {
              customer: true,
              category: true,
              websiteCosts: { select: { amount: true } },
              toolCosts: { select: { cost: true } },
            }
          }),
          prisma.project.count({ where: projectWhere }),
          prisma.project.findMany({
            where: { ...projectWhere, createdAt: { gte: chartStart, lte: chartEnd } },
            select: { createdAt: true, budget: true },
            orderBy: { createdAt: 'asc' },
          }),
          prisma.websiteCost.findMany({
            where: { project: projectWhere, date: { gte: chartStart, lte: chartEnd } },
            select: { date: true, amount: true },
          }),
          prisma.toolCost.findMany({
            where: { project: projectWhere, createdAt: { gte: chartStart, lte: chartEnd } },
            select: { createdAt: true, cost: true },
          }),
        ])
      : Promise.resolve([
          { _sum: { budget: null } },
          { _sum: { amount: null } },
          { _sum: { cost: null } },
          [],
          0,
          [],
          [],
          [],
        ]);

    const [productResults, projectResults] = await Promise.all([
      productPromises,
      projectPromises,
    ]);

    console.timeEnd('[reports] phase1 parallel');

    // Unpack products
    const [
      revenueRaw,
      renewalsAgg,
      ordersImportAgg,
      ordersWithImportCount,
      detailOrders,
      detailOrdersTotal,
      chartOrders,
      chartRenewals,
      topProductsGroup,
      topCreatorsGroup,
      topCustomersGroup,
      statusGroupBy,
      totalCustomersCount,
    ] = productResults as any;

    // Unpack projects
    const [
      projectsBudgetAgg,
      websiteCostsAgg,
      toolCostsAgg,
      detailProjects,
      detailProjectsTotal,
      chartProjects,
      chartWebsiteCosts,
      chartToolCosts,
    ] = projectResults as any;

    // ── Phase 2: Resolve entity names (song song) ─────────────────────────
    console.time('[reports] phase2 resolve names');
    const productIds  = topProductsGroup.map((p: any) => p.productId);
    const creatorIds  = topCreatorsGroup.map((c: any) => c.createdByUserId);
    const customerIds = topCustomersGroup.map((c: any) => c.customerId);

    const [products, creators, customers] = await Promise.all([
      productIds.length  ? prisma.product.findMany({ where: { id: { in: productIds  } }, select: { id: true, name: true } }) : [],
      creatorIds.length  ? prisma.user.findMany(   { where: { id: { in: creatorIds  } }, select: { id: true, name: true, role: true } }) : [],
      customerIds.length ? prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true, phone: true } }) : [],
    ]);
    console.timeEnd('[reports] phase2 resolve names');

    // ── Tính toán tài chính ────────────────────────────────────────────────
    console.time('[reports] financial calculations');
    const totalOrderRevenue    = Number(revenueRaw[0]?.total ?? 0);
    const totalRenewalRevenue  = renewalsAgg._sum.price ?? 0;
    const totalProductRevenue  = totalOrderRevenue + totalRenewalRevenue;
    const totalProjectRevenue  = projectsBudgetAgg._sum.budget ?? 0;
    const totalFilteredRevenue = totalProductRevenue + totalProjectRevenue;

    const totalProductImport   = ordersImportAgg._sum.importPrice ?? 0;
    const totalProjectCosts    = (websiteCostsAgg._sum.amount ?? 0) + (toolCostsAgg._sum.cost ?? 0);
    const totalExpenses        = totalProductImport + totalProjectCosts;

    const totalFilteredProfit  = totalFilteredRevenue - totalExpenses;
    console.timeEnd('[reports] financial calculations');

    // ── Daily chart build ──────────────────────────────────────────────────
    console.time('[reports] daily revenue');
    const formatDayKey = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    const dailyMap = new Map<string, {
      productRevenue: number;
      projectRevenue: number;
      productCosts: number;
      projectCosts: number;
    }>();

    const cur = new Date(chartStart);
    while (cur <= chartEnd) {
      dailyMap.set(formatDayKey(cur), {
        productRevenue: 0,
        projectRevenue: 0,
        productCosts: 0,
        projectCosts: 0,
      });
      cur.setDate(cur.getDate() + 1);
    }

    for (const o of chartOrders) {
      const slot = dailyMap.get(formatDayKey(new Date(o.createdAt)));
      if (slot) {
        slot.productRevenue += o.customPrice ?? o.price;
        slot.productCosts += o.importPrice ?? 0;
      }
    }
    for (const r of chartRenewals) {
      const slot = dailyMap.get(formatDayKey(new Date(r.createdAt)));
      if (slot) {
        slot.productRevenue += r.price;
      }
    }
    for (const p of chartProjects) {
      const slot = dailyMap.get(formatDayKey(new Date(p.createdAt)));
      if (slot) {
        slot.projectRevenue += p.budget;
      }
    }
    for (const w of chartWebsiteCosts) {
      const slot = dailyMap.get(formatDayKey(new Date(w.date)));
      if (slot) {
        slot.projectCosts += w.amount;
      }
    }
    for (const t of chartToolCosts) {
      const slot = dailyMap.get(formatDayKey(new Date(t.createdAt)));
      if (slot) {
        slot.projectCosts += t.cost;
      }
    }

    const dailyRevenue = Array.from(dailyMap.entries()).map(([label, s]) => {
      const revenue = s.productRevenue + s.projectRevenue;
      const costs = s.productCosts + s.projectCosts;
      return {
        label,
        value: revenue,
        revenue,
        productRevenue: s.productRevenue,
        projectRevenue: s.projectRevenue,
        importPrice: costs,
        productCosts: s.productCosts,
        projectCosts: s.projectCosts,
        profit: revenue - costs,
      };
    });
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
    for (const p of chartProjects) {
      const d = new Date(p.createdAt);
      if (d.getFullYear() === now.getFullYear()) {
        const key = `Thg ${d.getMonth() + 1}`;
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + p.budget);
      }
    }
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([label, value]) => ({ label, value }));
    console.timeEnd('[reports] monthly revenue');

    // ── Build rankings ─────────────────────────────────────────────────────
    const productMap  = new Map(products.map(p  => [p.id, p.name]));
    const creatorMap  = new Map(creators.map(u  => [u.id, u]));
    const customerMap = new Map(customers.map(c => [c.id, c]));

    const topProducts = topProductsGroup.map((p: any) => ({
      label: productMap.get(p.productId) ?? p.productId,
      value: (p._sum.customPrice ?? 0) || (p._sum.price ?? 0),
    })).sort((a: any, b: any) => b.value - a.value);

    const topCreators = topCreatorsGroup.map((c: any) => {
      const user = creatorMap.get(c.createdByUserId);
      return {
        label: user?.name ?? c.createdByUserId,
        value: (c._sum.customPrice ?? 0) || (c._sum.price ?? 0),
        subLabel: user?.role === 'collaborator' ? 'CTV'
                : user?.role === 'agency'       ? 'Đại lý'
                : 'Thành viên',
      };
    }).sort((a: any, b: any) => b.value - a.value);

    const topCustomers = topCustomersGroup.map((c: any) => {
      const cust = customerMap.get(c.customerId);
      return {
        label: cust?.name ?? c.customerId,
        value: (c._sum.customPrice ?? 0) || (c._sum.price ?? 0),
        subLabel: `${cust?.phone ?? ''} (${c._count.id} đơn)`,
      };
    }).sort((a: any, b: any) => b.value - a.value);

    // Status distribution
    const STATUS_COLORS: Record<string, string> = {
      new: '#64748b', processing: '#3b82f6', running: '#10b981',
      expired_soon: '#f59e0b', expired: '#ef4444', cancelled: '#94a3b8',
    };
    const STATUS_LABELS: Record<string, string> = {
      new: 'Mới tạo', processing: 'Đang xử lý', running: 'Đang chạy',
      expired_soon: 'Sắp hết hạn', expired: 'Đã hết hạn', cancelled: 'Đã hủy',
    };
    const orderStatusDistribution = statusGroupBy.map((s: any) => ({
      label: STATUS_LABELS[s.status] ?? s.status,
      value: s._count.id,
      color: STATUS_COLORS[s.status] ?? '#94a3b8',
    }));

    // ── Format detail lists ────────────────────────────────────────────────
    const formattedOrders = detailOrders.map((o: any) => ({
      createdAt:    o.createdAt,
      orderCode:    o.orderCode,
      customerName: o.customer.name,
      customerPhone: o.customer.phone,
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

    const formattedProjects = detailProjects.map((p: any) => {
      const webCostSum = p.websiteCosts.reduce((acc: number, curr: any) => acc + curr.amount, 0);
      const toolCostSum = p.toolCosts.reduce((acc: number, curr: any) => acc + curr.cost, 0);
      const totalCost = webCostSum + toolCostSum;
      return {
        id: p.id,
        name: p.name,
        customerName: p.customer?.name || 'N/A',
        categoryName: p.category?.name || 'N/A',
        budget: p.budget,
        totalCost,
        profit: p.budget - totalCost,
        status: p.status,
        progress: p.progress,
        createdAt: p.createdAt,
      };
    });

    console.timeEnd('[reports] total');

    return NextResponse.json({
      type,
      filteredReport: {
        totalRevenue:          totalFilteredRevenue,
        totalProfit:           totalFilteredProfit,
        totalImport:           totalExpenses,
        ordersWithImportPrice: ordersWithImportCount,
        orderCount:            detailOrdersTotal,
        projectCount:          detailProjectsTotal,
        totalCustomers:        totalCustomersCount,
        totalPages:            type === 'project' ? Math.ceil(detailProjectsTotal / pageSize) : Math.ceil(detailOrdersTotal / pageSize),
        currentPage:           page,
        pageSize,
        orders:                formattedOrders,
        projects:              formattedProjects,
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
