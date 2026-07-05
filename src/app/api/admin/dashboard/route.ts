import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/dashboard?section=critical  → KPIs + counts + 5 recent orders (~50-150ms)
 * GET /api/admin/dashboard?section=charts    → daily chart + rankings + status dist (~200-400ms)
 * GET /api/admin/dashboard                   → cả hai (legacy, backward compat)
 *
 * Tối ưu:
 * - Tất cả queries độc lập chạy trong 1 Promise.all() duy nhất (không còn 3 phases tuần tự)
 * - groupBy rankings dùng rawQuery với JOIN để tránh round-trip thứ 2 resolve names
 * - Cache-Control 30s cho critical data (KPIs ít thay đổi trong 30s)
 * - section=critical chỉ chạy 13 queries nhẹ, trả về < 100ms
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section') ?? 'all'; // 'critical' | 'charts' | 'all'

    console.time(`[dashboard:${section}] total`);

    const now = new Date();
    const startOfToday      = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday        = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth      = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth        = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const startOfLast15Days = new Date(startOfToday.getTime() - 14 * 86_400_000);
    const startOfLast7Days  = new Date(startOfToday.getTime() - 6 * 86_400_000);
    const startOfPrev7Days  = new Date(startOfToday.getTime() - 13 * 86_400_000);
    const endOfPrev7Days    = new Date(startOfToday.getTime() - 7 * 86_400_000 + 86_399_999);
    const startOf7DaysAgo   = new Date(startOfToday.getTime() - 7 * 86_400_000);
    const endOf7DaysAgo     = new Date(startOf7DaysAgo.getTime() + 86_399_999);

    // ── Helper: SUM(COALESCE(custom_price, price)) trong khoảng thời gian ──
    const revenueQuery = (gte: Date, lte: Date) =>
      prisma.$queryRaw<{ total: number }[]>(
        Prisma.sql`SELECT COALESCE(SUM(COALESCE(custom_price, price)), 0)::float AS total
                   FROM orders WHERE created_at >= ${gte} AND created_at <= ${lte}`
      );

    // ── Helper: Project budget & costs ──
    const projectStatsQuery = async (gte: Date, lte: Date) => {
      const [budgetAgg, websiteCostAgg, toolCostAgg] = await Promise.all([
        prisma.project.aggregate({
          _sum: { budget: true },
          where: { createdAt: { gte, lte } },
        }),
        prisma.websiteCost.aggregate({
          _sum: { amount: true },
          where: { date: { gte, lte } },
        }),
        prisma.toolCost.aggregate({
          _sum: { cost: true },
          where: { createdAt: { gte, lte } },
        }),
      ]);
      const budget = budgetAgg._sum.budget ?? 0;
      const costs = (websiteCostAgg._sum.amount ?? 0) + (toolCostAgg._sum.cost ?? 0);
      return { budget, costs, profit: budget - costs };
    };

    // ════════════════════════════════════════════════════════════════════════
    // CRITICAL SECTION: KPIs + counts + recent orders
    // ════════════════════════════════════════════════════════════════════════
    if (section === 'critical' || section === 'all') {
      console.time(`[dashboard:${section}] kpi`);
    }

    // Luôn cần critical data (dù section là 'charts', cũng không query)
    const criticalPromise = (section === 'critical' || section === 'all')
      ? Promise.all([
          // ① Revenue today
          revenueQuery(startOfToday, endOfToday),
          prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOfToday, lte: endOfToday } } }),
          // ② Revenue this month
          revenueQuery(startOfMonth, endOfMonth),
          prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
          // ③ Revenue last 7 days
          revenueQuery(startOfLast7Days, endOfToday),
          prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOfLast7Days, lte: endOfToday } } }),
          // ④ Revenue prev 7 days (growth comparison)
          revenueQuery(startOfPrev7Days, endOfPrev7Days),
          prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOfPrev7Days, lte: endOfPrev7Days } } }),
          // ⑤ Revenue 7 days ago (today growth comparison)
          revenueQuery(startOf7DaysAgo, endOf7DaysAgo),
          prisma.orderRenewal.aggregate({ _sum: { price: true }, where: { createdAt: { gte: startOf7DaysAgo, lte: endOf7DaysAgo } } }),
          // ⑥ Counts
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
          // ⑦ 5 đơn gần nhất (critical – hiển thị ngay)
          prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              orderCode: true, createdAt: true, price: true, customPrice: true,
              status: true, startDate: true, endDate: true,
              customer:      { select: { name: true, phone: true } },
              product:       { select: { name: true } },
              variant:       { select: { name: true } },
              createdByUser: { select: { name: true, role: true } },
            },
          }),
        ])
      : null;

    const projectPromises = (section === 'critical' || section === 'all')
      ? Promise.all([
          // ① Today
          projectStatsQuery(startOfToday, endOfToday),
          // ② This Month
          projectStatsQuery(startOfMonth, endOfMonth),
          // ③ Last 7 Days
          projectStatsQuery(startOfLast7Days, endOfToday),
          // ④ Prev 7 Days
          projectStatsQuery(startOfPrev7Days, endOfPrev7Days),
          // ⑤ 7 Days ago
          projectStatsQuery(startOf7DaysAgo, endOf7DaysAgo),
          // ⑥ Total projects count
          prisma.project.count(),
          // ⑦ Total running projects count
          prisma.project.count({ where: { status: 'running' } }),
          // ⑧ Product expenses this month
          prisma.order.aggregate({
            _sum: { importPrice: true },
            where: { createdAt: { gte: startOfMonth, lte: endOfMonth } }
          }),
        ])
      : null;

    // ════════════════════════════════════════════════════════════════════════
    // CHARTS SECTION: daily chart + rankings + status (lazy-loadable)
    // ════════════════════════════════════════════════════════════════════════

    // Top products với JOIN name – tránh round-trip thứ 2
    const topProductsQuery = () =>
      prisma.$queryRaw<{ product_name: string; total: number }[]>(Prisma.sql`
        SELECT p.name AS product_name,
               COALESCE(SUM(COALESCE(o.custom_price, o.price)), 0)::float AS total
        FROM orders o
        JOIN products p ON p.id = o.product_id
        GROUP BY p.id, p.name
        ORDER BY total DESC
        LIMIT 5
      `);

    // Top creators với JOIN name
    const topCreatorsQuery = () =>
      prisma.$queryRaw<{ user_name: string; user_role: string; total: number }[]>(Prisma.sql`
        SELECT u.name AS user_name, u.role AS user_role,
               COALESCE(SUM(COALESCE(o.custom_price, o.price)), 0)::float AS total
        FROM orders o
        JOIN users u ON u.id = o.created_by_user_id
        GROUP BY u.id, u.name, u.role
        ORDER BY total DESC
        LIMIT 5
      `);

    const chartsPromise = (section === 'charts' || section === 'all')
      ? Promise.all([
          // ① Daily orders (15 ngày) – chỉ select field cần thiết
          prisma.order.findMany({
            where:   { createdAt: { gte: startOfLast15Days, lte: endOfToday } },
            select:  { createdAt: true, price: true, customPrice: true, importPrice: true },
            orderBy: { createdAt: 'asc' },
          }),
          // ② Daily renewals (15 ngày)
          prisma.orderRenewal.findMany({
            where:   { createdAt: { gte: startOfLast15Days, lte: endOfToday } },
            select:  { createdAt: true, price: true },
            orderBy: { createdAt: 'asc' },
          }),
          // ③ Top 5 products (rawQuery với JOIN – không cần round-trip thứ 2)
          topProductsQuery(),
          // ④ Top 5 creators (rawQuery với JOIN)
          topCreatorsQuery(),
          // ⑤ Status distribution (groupBy – không full scan vì có index)
          prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
        ])
      : null;

    const projectChartsPromise = (section === 'charts' || section === 'all')
      ? Promise.all([
          // ① Projects in last 15 days
          prisma.project.findMany({
            where: { createdAt: { gte: startOfLast15Days, lte: endOfToday } },
            select: { createdAt: true, budget: true },
          }),
          // ② Website costs in last 15 days
          prisma.websiteCost.findMany({
            where: { date: { gte: startOfLast15Days, lte: endOfToday } },
            select: { date: true, amount: true },
          }),
          // ③ Tool costs in last 15 days
          prisma.toolCost.findMany({
            where: { createdAt: { gte: startOfLast15Days, lte: endOfToday } },
            select: { createdAt: true, cost: true },
          }),
          // ④ Top 5 projects by budget
          prisma.project.findMany({
            take: 5,
            orderBy: { budget: 'desc' },
            select: { name: true, budget: true, progress: true },
          }),
          // ⑤ Project status distribution
          prisma.project.groupBy({
            by: ['status'],
            _count: { id: true },
          }),
        ])
      : null;

    // Chạy song song tất cả các sections
    const [criticalResults, chartsResults, projectResults, projectChartsResults] = await Promise.all([
      criticalPromise,
      chartsPromise,
      projectPromises,
      projectChartsPromise,
    ]);

    if (section === 'critical' || section === 'all') {
      console.timeEnd(`[dashboard:${section}] kpi`);
    }

    // ── Xử lý critical data ────────────────────────────────────────────────
    let overviewData: Record<string, unknown> | null = null;
    let recentOrdersData: unknown[] = [];

    if (criticalResults && projectResults) {
      console.time(`[dashboard:${section}] revenue stats`);
      const [
        todayRevRaw, todayRenewAgg,
        monthRevRaw, monthRenewAgg,
        last7RevRaw, last7RenewAgg,
        prev7RevRaw, prev7RenewAgg,
        daysAgoRevRaw, daysAgoRenewAgg,
        totalCustomers, totalOrders, expiringSoonCount,
        recentOrdersRaw,
      ] = criticalResults;

      const [
        projToday, projMonth, projLast7, projPrev7, proj7DaysAgo,
        totalProjects, runningProjectsCount, productExpensesMonthAgg
      ] = projectResults as any;

      const toNum = (raw: { total: number }[]) => Number(raw[0]?.total ?? 0);
      
      const productRevenueToday = toNum(todayRevRaw) + (todayRenewAgg._sum.price ?? 0);
      const productRevenueMonth = toNum(monthRevRaw) + (monthRenewAgg._sum.price ?? 0);
      const projectRevenueToday = projToday.budget;
      const projectRevenueMonth = projMonth.budget;

      const revToday    = productRevenueToday + projectRevenueToday;
      const revMonth    = productRevenueMonth + projectRevenueMonth;
      const revLast7    = toNum(last7RevRaw)   + (last7RenewAgg._sum.price   ?? 0) + projLast7.budget;
      const revPrev7    = toNum(prev7RevRaw)   + (prev7RenewAgg._sum.price   ?? 0) + projPrev7.budget;
      const rev7DaysAgo = toNum(daysAgoRevRaw) + (daysAgoRenewAgg._sum.price ?? 0) + proj7DaysAgo.budget;

      const productExpensesMonth = productExpensesMonthAgg._sum.importPrice ?? 0;
      const projectExpensesMonth = projMonth.costs;
      const expensesMonth = productExpensesMonth + projectExpensesMonth;
      const profitMonth = revMonth - expensesMonth;

      const calcGrowth = (cur: number, prev: number) =>
        prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;

      overviewData = {
        revenueToday:           revToday,
        revenueMonth:           revMonth,
        revenueLast7Days:       revLast7,
        revenuePrev7Days:       revPrev7,
        revenueLast7DaysGrowth: calcGrowth(revLast7, revPrev7),
        revenueTodayGrowth:     calcGrowth(revToday, rev7DaysAgo),
        totalCustomers,
        totalOrders,
        expiringSoonCount,
        // Project metrics
        totalProjects,
        runningProjectsCount,
        productRevenueMonth,
        projectRevenueMonth,
        expensesMonth,
        profitMonth,
      };

      recentOrdersData = (recentOrdersRaw as typeof criticalResults[13]).map(o => ({
        createdAt:    o.createdAt,
        orderCode:    o.orderCode,
        customerName: o.customer.name,
        customerPhone:o.customer.phone,
        creatorName:  o.createdByUser.name,
        creatorRole:  o.createdByUser.role,
        productName:  o.product.name,
        variantName:  o.variant.name,
        cost:         o.customPrice ?? o.price,
        status:       o.status,
        startDate:    o.startDate,
        endDate:      o.endDate,
      }));
      console.timeEnd(`[dashboard:${section}] revenue stats`);
    }

    // ── Xử lý charts data ─────────────────────────────────────────────────
    let chartsData: Record<string, unknown> | null = null;

    if (chartsResults && projectChartsResults) {
      console.time(`[dashboard:${section}] charts build`);
      const [dailyOrders, dailyRenewals, topProductsRaw, topCreatorsRaw, statusGroupBy] = chartsResults;
      const [dailyProjects, dailyWebsiteCosts, dailyToolCosts, topProjectsRaw, projectStatusGroupBy] = projectChartsResults;

      // Daily chart
      const formatDayKey = (d: Date) =>
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

      const dailyMap = new Map<string, {
        productRevenue: number;
        projectRevenue: number;
        productCosts: number;
        projectCosts: number;
      }>();

      const cursor = new Date(startOfLast15Days);
      while (cursor <= endOfToday) {
        dailyMap.set(formatDayKey(cursor), {
          productRevenue: 0,
          projectRevenue: 0,
          productCosts: 0,
          projectCosts: 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      for (const o of dailyOrders) {
        const slot = dailyMap.get(formatDayKey(new Date(o.createdAt)));
        if (slot) {
          slot.productRevenue += o.customPrice ?? o.price;
          slot.productCosts += o.importPrice ?? 0;
        }
      }

      for (const r of dailyRenewals) {
        const slot = dailyMap.get(formatDayKey(new Date(r.createdAt)));
        if (slot) {
          slot.productRevenue += r.price;
        }
      }

      for (const p of dailyProjects) {
        const slot = dailyMap.get(formatDayKey(new Date(p.createdAt)));
        if (slot) {
          slot.projectRevenue += p.budget;
        }
      }

      for (const w of dailyWebsiteCosts) {
        const slot = dailyMap.get(formatDayKey(new Date(w.date)));
        if (slot) {
          slot.projectCosts += w.amount;
        }
      }

      for (const t of dailyToolCosts) {
        const slot = dailyMap.get(formatDayKey(new Date(t.createdAt)));
        if (slot) {
          slot.projectCosts += t.cost;
        }
      }

      const dailyRevenue = Array.from(dailyMap.entries()).map(([label, s]) => {
        const totalRevenue = s.productRevenue + s.projectRevenue;
        const totalCosts = s.productCosts + s.projectCosts;
        return {
          label,
          value: totalRevenue,
          productRevenue: s.productRevenue,
          projectRevenue: s.projectRevenue,
          productCosts: s.productCosts,
          projectCosts: s.projectCosts,
          profit: totalRevenue - totalCosts,
        };
      });

      // Rankings
      const topProducts = (topProductsRaw as { product_name: string; total: number }[]).map(p => ({
        label: p.product_name, value: Number(p.total),
      }));

      const ROLE_LABEL: Record<string, string> = { collaborator: 'CTV', agency: 'Đại lý', member: 'Thành viên', admin: 'Admin' };
      const topCreators = (topCreatorsRaw as { user_name: string; user_role: string; total: number }[]).map(c => ({
        label:    c.user_name,
        value:    Number(c.total),
        subLabel: ROLE_LABEL[c.user_role] ?? c.user_role,
      }));

      const topProjects = (topProjectsRaw as { name: string; budget: number; progress: number }[]).map(p => ({
        label: p.name,
        value: p.budget,
        subLabel: `Tiến độ: ${p.progress}%`,
      }));

      // Status distribution
      const STATUS_COLORS: Record<string, string> = {
        new: '#64748b', processing: '#3b82f6', running: '#10b981',
        expired_soon: '#f59e0b', expired: '#ef4444', cancelled: '#94a3b8',
      };
      const STATUS_LABELS: Record<string, string> = {
        new: 'Mới tạo', processing: 'Đang xử lý', running: 'Đang chạy',
        expired_soon: 'Sắp hết hạn', expired: 'Đã hết hạn', cancelled: 'Đã hủy',
      };
      const orderStatusDistribution = (statusGroupBy as { status: string; _count: { id: number } }[]).map(s => ({
        label: STATUS_LABELS[s.status] ?? s.status,
        value: s._count.id,
        color: STATUS_COLORS[s.status] ?? '#94a3b8',
      }));

      const PROJ_STATUS_COLORS: Record<string, string> = {
        running: '#10b981', completed: '#3b82f6', paused: '#f59e0b',
      };
      const PROJ_STATUS_LABELS: Record<string, string> = {
        running: 'Đang chạy', completed: 'Hoàn thành', paused: 'Tạm dừng',
      };
      const projectStatusDistribution = (projectStatusGroupBy as { status: string; _count: { id: number } }[]).map(s => ({
        label: PROJ_STATUS_LABELS[s.status] ?? s.status,
        value: s._count.id,
        color: PROJ_STATUS_COLORS[s.status] ?? '#94a3b8',
      }));

      chartsData = {
        dailyRevenue,
        monthlyRevenue: [],
        topProducts,
        topCreators,
        topProjects,
        topCustomers: [],
        orderStatusDistribution,
        projectStatusDistribution,
      };
      console.timeEnd(`[dashboard:${section}] charts build`);
    }

    console.timeEnd(`[dashboard:${section}] total`);

    // ── Response với Cache-Control ─────────────────────────────────────────
    // Critical data: cache 30s (ít thay đổi)
    // Charts data: cache 60s (thống kê tổng, ít real-time hơn)
    const cacheSeconds = section === 'critical' ? 30 : section === 'charts' ? 60 : 30;

    return NextResponse.json(
      {
        ...(overviewData  ? { overview: overviewData }                        : {}),
        ...(recentOrdersData.length > 0 ? { filteredReport: { orders: recentOrdersData } } : { filteredReport: { orders: [] } }),
        ...(chartsData    ? { charts: chartsData }                            : {}),
      },
      {
        headers: {
          'Cache-Control': `private, max-age=${cacheSeconds}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (error) {
    console.error('[dashboard] error:', error);
    return NextResponse.json({ error: 'Lỗi tải dữ liệu dashboard.' }, { status: 500 });
  }
}
