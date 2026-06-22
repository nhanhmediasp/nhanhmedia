import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const now = new Date();
    
    // Boundary dates
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Fetch personal overview metrics
    const [
      ordersToday,
      ordersMonth,
      renewalsToday,
      renewalsMonth,
      allMyOrders,
      allMyRenewals,
      myCustomerCount,
    ] = await Promise.all([
      // Orders today
      prisma.order.findMany({ where: { createdByUserId: userId, createdAt: { gte: startOfToday, lte: endOfToday } } }),
      // Orders month
      prisma.order.findMany({ where: { createdByUserId: userId, createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
      // Renewals today
      prisma.orderRenewal.findMany({ where: { renewedByUserId: userId, createdAt: { gte: startOfToday, lte: endOfToday } } }),
      // Renewals month
      prisma.orderRenewal.findMany({ where: { renewedByUserId: userId, createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
      // Totals
      prisma.order.findMany({
        where: { createdByUserId: userId },
        include: { product: true, variant: true, customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orderRenewal.findMany({
        where: { renewedByUserId: userId },
        include: { variant: { include: { product: true } } },
      }),
      // Total customers created by this user
      prisma.customer.count({ where: { createdByUserId: userId } }),
    ]);

    const sumOrderRev = (arr: any[]) => arr.reduce((s, o) => s + (o.customPrice !== null ? o.customPrice : o.price), 0);
    const sumRenewalRev = (arr: any[]) => arr.reduce((s, r) => s + r.price, 0);

    const revenueToday = sumOrderRev(ordersToday) + sumRenewalRev(renewalsToday);
    const revenueMonth = sumOrderRev(ordersMonth) + sumRenewalRev(renewalsMonth);
    const totalOrdersCount = allMyOrders.length;
    const expiringSoonCount = allMyOrders.filter(o => o.status.toLowerCase() === 'expired_soon').length;

    // Total lifetime revenue
    const lifetimeRevenue = sumOrderRev(allMyOrders) + sumRenewalRev(allMyRenewals);

    // 2. Personal Chart Data (last 15 days daily revenue)
    const dailyMap = new Map<string, number>();
    const formatDayKey = (date: Date) => {
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    const fifteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const tempDate = new Date(fifteenDaysAgo);
    while (tempDate <= now) {
      dailyMap.set(formatDayKey(tempDate), 0);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    allMyOrders.forEach((o) => {
      const dayKey = formatDayKey(new Date(o.createdAt));
      if (dailyMap.has(dayKey)) {
        const val = o.customPrice !== null ? o.customPrice : o.price;
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + val);
      }
    });

    allMyRenewals.forEach((r) => {
      const dayKey = formatDayKey(new Date(r.createdAt));
      if (dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + r.price);
      }
    });

    const dailyRevenue = Array.from(dailyMap.entries()).map(([label, value]) => ({ label, value }));

    // Top Selling Products personally
    const productRevenueMap = new Map<string, number>();
    allMyOrders.forEach((o) => {
      const val = o.customPrice !== null ? o.customPrice : o.price;
      productRevenueMap.set(o.product.name, (productRevenueMap.get(o.product.name) || 0) + val);
    });

    allMyRenewals.forEach((r) => {
      const prodName = r.variant.product.name;
      productRevenueMap.set(prodName, (productRevenueMap.get(prodName) || 0) + r.price);
    });

    const topProducts = Array.from(productRevenueMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Personal orders status counts
    const statusCounts = { new: 0, processing: 0, running: 0, expired_soon: 0, expired: 0, cancelled: 0 };
    allMyOrders.forEach((o) => {
      const st = o.status.toLowerCase() as keyof typeof statusCounts;
      if (statusCounts[st] !== undefined) {
        statusCounts[st]++;
      }
    });

    const orderStatusDistribution = [
      { label: 'Mới tạo', value: statusCounts.new, color: '#64748b' },
      { label: 'Đang xử lý', value: statusCounts.processing, color: '#3b82f6' },
      { label: 'Đang chạy', value: statusCounts.running, color: '#10b981' },
      { label: 'Sắp hết hạn', value: statusCounts.expired_soon, color: '#f59e0b' },
      { label: 'Đã hết hạn', value: statusCounts.expired, color: '#ef4444' },
      { label: 'Đã hủy', value: statusCounts.cancelled, color: '#94a3b8' },
    ];

    return NextResponse.json({
      overview: {
        revenueToday,
        revenueMonth,
        lifetimeRevenue,
        totalOrdersCount,
        myCustomerCount,
        expiringSoonCount,
      },
      charts: {
        dailyRevenue,
        topProducts,
        orderStatusDistribution,
      },
      orders: allMyOrders.map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        customerName: o.customer.name,
        customerPhone: o.customer.phone,
        productName: o.product.name,
        variantName: o.variant.name,
        cost: o.customPrice !== null ? o.customPrice : o.price,
        status: o.status,
        startDate: o.startDate,
        endDate: o.endDate,
        createdAt: o.createdAt,
      })),
    });
  } catch (error) {
    console.error('My revenue endpoint error:', error);
    return NextResponse.json({ error: 'Lỗi tải báo cáo doanh thu cá nhân.' }, { status: 500 });
  }
}
