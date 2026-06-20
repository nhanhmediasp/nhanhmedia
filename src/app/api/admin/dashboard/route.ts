import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/dashboard
 *
 * Endpoint nhẹ, tối ưu riêng cho Dashboard admin.
 * Tách khỏi /api/admin/reports để dashboard không bị block bởi logic nặng.
 * Dùng: aggregate() / groupBy() / count() — KHÔNG findMany() toàn bảng.
 */
export async function GET() {
  try {
    console.time('[dashboard] total');

    const now = new Date();
    const startOfToday      = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday        = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth      = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth        = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLast15Days = new Date(startOfToday.getTime() - 14 * 86_400_000);

    // Last 7 days (D-6 → today)
    const startOfLast7Days  = new Date(startOfToday.getTime() - 6 * 86_400_000);
    // Prev 7 days (D-13 → D-7)
    const startOfPrev7Days  = new Date(startOfToday.getTime() - 13 * 86_400_000);
    const endOfPrev7Days    = new Date(startOfToday.getTime() - 7 * 86_400_000);
    endOfPrev7Days.setHours(23, 59, 59, 999);
    // 7 days ago (single day, compare with today)
    const startOf7DaysAgo   = new Date(startOfToday.getTime() - 7 * 86_400_000);
    const endOf7DaysAgo     = new Date(startOf7DaysAgo);
    endOf7DaysAgo.setHours(23, 59, 59, 999);

    // ── Raw SQL helpers để tính SUM(COALESCE(custom_price, price)) ────────
    const revenueQuery = (gte: Date, lte: Date) =>
      prisma.$queryRaw<{ total: number }[]>(
        Prisma.sql`SELECT COALESCE(SUM(COALESCE(custom_price, price)), 0)::float AS total
                   FROM orders WHERE created_at >= ${gte} AND created_at <= ${lte}`
      );

    // ── Phase 1: Tất cả KPI queries song song ─────────────────────────────
    console.time('[dashboard] kpi');
    const [
      todayRevRaw, todayRenewAgg,
      monthRevRaw, monthRenewAgg,
      last7RevRaw, last7RenewAgg,
      prev7RevRaw, prev7RenewAgg,
      daysAgoRevRaw, daysAgoRenewAgg,
      totalCustomers, totalOrders, expiringSoonCount,
    ] = await Promise.all([
      revenueQuery(startOfToday, endOfToday),
      prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOfToday, lte: endOfToday } } }),

      revenueQuery(startOfMonth, endOfMonth),
      prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOfMonth, lte: endOfMonth } } }),

      revenueQuery(startOfLast7Days, endOfToday),
      prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOfLast7Days, lte: endOfToday } } }),

      revenueQuery(startOfPrev7Days, endOfPrev7Days),
      prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOfPrev7Days, lte: endOfPrev7Days } } }),

      revenueQuery(startOf7DaysAgo, endOf7DaysAgo),
      prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOf7DaysAgo, lte: endOf7DaysAgo } } }),

      prisma.customer.count(),
      prisma.order.count(),
      prisma.order.count({
        where: {
          OR: [
            { status: 'expired_soon' },
            { status: { in: ['running', 'new', 'processing'] }, endDate: { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) } },
          ],
        },
      }),
    ]);
    console.timeEnd('[dashboard] kpi');

    const toNum = (raw: { total: number }[]) => Number(raw[0]?.total ?? 0);
    const revToday    = toNum(todayRevRaw)   + (todayRenewAgg._sum.price   ?? 0);
    const revMonth    = toNum(monthRevRaw)   + (monthRenewAgg._sum.price   ?? 0);
    const revLast7    = toNum(last7RevRaw)   + (last7RenewAgg._sum.price   ?? 0);
    const revPrev7    = toNum(prev7RevRaw)   + (prev7RenewAgg._sum.price   ?? 0);
    const rev7DaysAgo = toNum(daysAgoRevRaw) + (daysAgoRenewAgg._sum.price ?? 0);

    const calcGrowth = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

    // ── Phase 2: Charts + Rankings + Recent orders (song song) ────────────
    console.time('[dashboard] charts');
    const [dailyOrders, dailyRenewals, topProductsGroup, topCreatorsGroup, statusGroupBy, recentOrdersRaw] = await Promise.all([
      // Chart: chỉ 15 ngày
      prisma.order.findMany({
        where:   { createdAt: { gte: startOfLast15Days, lte: endOfToday } },
        select:  { createdAt: true, price: true, customPrice: true, importPrice: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.orderRenewal.findMany({
        where:   { createdAt: { gte: startOfLast15Days, lte: endOfToday } },
        select:  { createdAt: true, price: true },
        orderBy: { createdAt: 'asc' },
      }),
      // Top 5 products (groupBy)
      prisma.order.groupBy({
        by:      ['productId'],
        _sum:    { price: true, customPrice: true },
        orderBy: { _sum: { price: 'desc' } },
        take:    5,
      }),
      // Top 5 creators (groupBy)
      prisma.order.groupBy({
        by:      ['createdByUserId'],
        _sum:    { price: true, customPrice: true },
        orderBy: { _sum: { price: 'desc' } },
        take:    5,
      }),
      // Status distribution (groupBy – không findMany toàn bảng)
      prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      // 5 đơn gần nhất
      prisma.order.findMany({
        take: 5, orderBy: { createdAt: 'desc' },
        select: {
          orderCode: true, createdAt: true, price: true, customPrice: true,
          status: true, startDate: true, endDate: true,
          customer:      { select: { name: true, phone: true } },
          product:       { select: { name: true } },
          variant:       { select: { name: true } },
          createdByUser: { select: { name: true, role: true } },
        },
      }),
    ]);
    console.timeEnd('[dashboard] charts');

    // Resolve names
    const [products, creators] = await Promise.all([
      topProductsGroup.length ? prisma.product.findMany({ where: { id: { in: topProductsGroup.map(p => p.productId) } }, select: { id: true, name: true } }) : [],
      topCreatorsGroup.length ? prisma.user.findMany({ where: { id: { in: topCreatorsGroup.map(c => c.createdByUserId) } }, select: { id: true, name: true, role: true } }) : [],
    ]);
    const productMap = new Map(products.map(p => [p.id, p.name]));
    const creatorMap = new Map(creators.map(u => [u.id, u]));

    // Build daily chart
    const formatDayKey = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    const dailyMap = new Map<string, { revenue: number; importPrice: number; profit: number }>();
    const cursor = new Date(startOfLast15Days);
    while (cursor <= endOfToday) {
      dailyMap.set(formatDayKey(cursor), { revenue: 0, importPrice: 0, profit: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const o of dailyOrders) {
      const slot = dailyMap.get(formatDayKey(new Date(o.createdAt)));
      if (slot) {
        const val = o.customPrice ?? o.price; const imp = o.importPrice ?? 0;
        slot.revenue += val; slot.importPrice += imp; slot.profit += val - imp;
      }
    }
    for (const r of dailyRenewals) {
      const slot = dailyMap.get(formatDayKey(new Date(r.createdAt)));
      if (slot) { slot.revenue += r.price; slot.profit += r.price; }
    }
    const dailyRevenue = Array.from(dailyMap.entries()).map(([label, s]) => ({
      label, value: s.revenue, revenue: s.revenue, importPrice: s.importPrice, profit: s.profit,
    }));

    // Rankings
    const topProducts = topProductsGroup.map(p => ({
      label: productMap.get(p.productId) ?? p.productId,
      value: (p._sum.customPrice ?? 0) || (p._sum.price ?? 0),
    })).sort((a, b) => b.value - a.value);

    const topCreators = topCreatorsGroup.map(c => {
      const user = creatorMap.get(c.createdByUserId);
      return {
        label:    user?.name ?? c.createdByUserId,
        value:    (c._sum.customPrice ?? 0) || (c._sum.price ?? 0),
        subLabel: user?.role === 'collaborator' ? 'CTV' : user?.role === 'agency' ? 'Đại lý' : 'Thành viên',
      };
    }).sort((a, b) => b.value - a.value);

    const STATUS_COLORS: Record<string, string> = { new: '#64748b', processing: '#3b82f6', running: '#10b981', expired_soon: '#f59e0b', expired: '#ef4444', cancelled: '#94a3b8' };
    const STATUS_LABELS: Record<string, string> = { new: 'Mới tạo', processing: 'Đang xử lý', running: 'Đang chạy', expired_soon: 'Sắp hết hạn', expired: 'Đã hết hạn', cancelled: 'Đã hủy' };
    const orderStatusDistribution = statusGroupBy.map(s => ({ label: STATUS_LABELS[s.status] ?? s.status, value: s._count.id, color: STATUS_COLORS[s.status] ?? '#94a3b8' }));

    const recentOrders = recentOrdersRaw.map(o => ({
      createdAt: o.createdAt, orderCode: o.orderCode,
      customerName: o.customer.name, customerPhone: o.customer.phone,
      creatorName: o.createdByUser.name, creatorRole: o.createdByUser.role,
      productName: o.product.name, variantName: o.variant.name,
      cost: o.customPrice ?? o.price, status: o.status,
      startDate: o.startDate, endDate: o.endDate,
    }));

    console.timeEnd('[dashboard] total');

    return NextResponse.json({
      overview: {
        revenueToday:           revToday,
        revenueMonth:           revMonth,
        revenueLast7Days:       revLast7,
        revenuePrev7Days:       revPrev7,
        revenueLast7DaysGrowth: calcGrowth(revLast7, revPrev7),
        revenueTodayGrowth:     calcGrowth(revToday, rev7DaysAgo),
        totalCustomers,
        totalOrders,
        expiringSoonCount,
      },
      filteredReport: { orders: recentOrders },
      charts: {
        dailyRevenue,
        monthlyRevenue: [],
        topProducts,
        topCreators,
        topCustomers: [],
        orderStatusDistribution,
      },
    });
  } catch (error) {
    console.error('[dashboard] error:', error);
    return NextResponse.json({ error: 'Lỗi tải dữ liệu dashboard.' }, { status: 500 });
  }
}
