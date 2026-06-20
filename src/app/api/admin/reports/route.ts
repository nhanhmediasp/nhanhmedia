import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const creatorId = searchParams.get('creatorId');
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    // Parse date filters
    let startFilterDate: Date | null = null;
    let endFilterDate: Date | null = null;

    if (startDateParam) {
      startFilterDate = new Date(startDateParam);
      startFilterDate.setHours(0, 0, 0, 0);
    }
    if (endDateParam) {
      endFilterDate = new Date(endDateParam);
      endFilterDate.setHours(23, 59, 59, 999);
    }

    // Build query filters for Orders
    const orderWhere: any = {};
    if (creatorId) orderWhere.createdByUserId = creatorId;
    if (productId) orderWhere.productId = productId;
    if (status) orderWhere.status = status;

    if (startFilterDate || endFilterDate) {
      orderWhere.createdAt = {};
      if (startFilterDate) orderWhere.createdAt.gte = startFilterDate;
      if (endFilterDate) orderWhere.createdAt.lte = endFilterDate;
    }

    // Build query filters for Renewals (renewals are also a source of revenue!)
    const renewalWhere: any = {};
    if (creatorId) renewalWhere.renewedByUserId = creatorId;
    if (startFilterDate || endFilterDate) {
      renewalWhere.createdAt = {};
      if (startFilterDate) renewalWhere.createdAt.gte = startFilterDate;
      if (endFilterDate) renewalWhere.createdAt.lte = endFilterDate;
    }

    // 1. Fetch filtered orders and renewals
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        customer: true,
        product: true,
        variant: true,
        createdByUser: { select: { name: true, role: true } },
      },
    });

    const renewals = await prisma.orderRenewal.findMany({
      where: renewalWhere,
      include: {
        renewedByUser: { select: { name: true, role: true } },
        variant: { include: { product: true } },
        order: {
          include: { customer: true },
        },
      },
    });

    // 2. Fetch aggregates for general overview (Today, Month, Year, total customer, expiring soon)
    const now = new Date();
    
    // Today boundary
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Month boundary
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Year boundary
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    // Query Overview Revenues
    const [
      ordersToday,
      ordersMonth,
      ordersYear,
      renewalsToday,
      renewalsMonth,
      renewalsYear,
      totalCustomers,
      totalOrders,
      expiringSoonCount,
    ] = await Promise.all([
      // Orders created today
      prisma.order.findMany({ where: { createdAt: { gte: startOfToday, lte: endOfToday } } }),
      // Orders created this month
      prisma.order.findMany({ where: { createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
      // Orders created this year
      prisma.order.findMany({ where: { createdAt: { gte: startOfYear, lte: endOfYear } } }),
      // Renewals today
      prisma.orderRenewal.findMany({ where: { createdAt: { gte: startOfToday, lte: endOfToday } } }),
      // Renewals this month
      prisma.orderRenewal.findMany({ where: { createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
      // Renewals this year
      prisma.orderRenewal.findMany({ where: { createdAt: { gte: startOfYear, lte: endOfYear } } }),
      // Totals
      prisma.customer.count(),
      prisma.order.count(),
      // Expiring in next 7 days or status is expired_soon
      prisma.order.count({
        where: {
          OR: [
            { status: 'expired_soon' },
            {
              status: { in: ['running', 'new', 'processing'] },
              endDate: {
                gte: now,
                lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
      }),
    ]);

    // Sum revenue today/month/year
    const sumOrderRev = (arr: any[]) => arr.reduce((s, o) => s + (o.customPrice !== null ? o.customPrice : o.price), 0);
    const sumRenewalRev = (arr: any[]) => arr.reduce((s, r) => s + r.price, 0);

    const revenueToday = sumOrderRev(ordersToday) + sumRenewalRev(renewalsToday);
    const revenueMonth = sumOrderRev(ordersMonth) + sumRenewalRev(renewalsMonth);
    const revenueYear = sumOrderRev(ordersYear) + sumRenewalRev(renewalsYear);

    // 3. Process charts data based on active filters
    // Daily revenue (last 15 days or filter period)
    const dailyMap = new Map<string, number>();
    const formatDayKey = (date: Date) => {
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    // If no start date filter, default to 15 days ago
    const minDate = startFilterDate || new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    // Initialize day slots
    const tempDate = new Date(minDate);
    const maxDate = endFilterDate || now;
    while (tempDate <= maxDate) {
      dailyMap.set(formatDayKey(tempDate), 0);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Populate day values from orders
    orders.forEach((o) => {
      const dayKey = formatDayKey(new Date(o.createdAt));
      if (dailyMap.has(dayKey)) {
        const val = o.customPrice !== null ? o.customPrice : o.price;
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + val);
      }
    });

    // Populate day values from renewals
    renewals.forEach((r) => {
      const dayKey = formatDayKey(new Date(r.createdAt));
      if (dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + r.price);
      }
    });

    const dailyRevenue = Array.from(dailyMap.entries()).map(([label, value]) => ({ label, value }));

    // Monthly revenue (for the current year)
    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      monthlyMap.set(`Thg ${i + 1}`, 0);
    }

    orders.forEach((o) => {
      const oDate = new Date(o.createdAt);
      if (oDate.getFullYear() === now.getFullYear()) {
        const key = `Thg ${oDate.getMonth() + 1}`;
        const val = o.customPrice !== null ? o.customPrice : o.price;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + val);
      }
    });

    renewals.forEach((r) => {
      const rDate = new Date(r.createdAt);
      if (rDate.getFullYear() === now.getFullYear()) {
        const key = `Thg ${rDate.getMonth() + 1}`;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + r.price);
      }
    });

    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([label, value]) => ({ label, value }));

    // Top Products ranking
    const productRevenueMap = new Map<string, number>();
    orders.forEach((o) => {
      const val = o.customPrice !== null ? o.customPrice : o.price;
      productRevenueMap.set(o.product.name, (productRevenueMap.get(o.product.name) || 0) + val);
    });

    renewals.forEach((r) => {
      const prodName = r.variant.product.name;
      productRevenueMap.set(prodName, (productRevenueMap.get(prodName) || 0) + r.price);
    });

    const topProducts = Array.from(productRevenueMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Top Sellers/Creators ranking
    const creatorRevenueMap = new Map<string, { value: number; role: string }>();
    orders.forEach((o) => {
      const val = o.customPrice !== null ? o.customPrice : o.price;
      const current = creatorRevenueMap.get(o.createdByUser.name) || { value: 0, role: o.createdByUser.role };
      creatorRevenueMap.set(o.createdByUser.name, {
        value: current.value + val,
        role: o.createdByUser.role,
      });
    });

    renewals.forEach((r) => {
      const current = creatorRevenueMap.get(r.renewedByUser.name) || { value: 0, role: r.renewedByUser.role };
      creatorRevenueMap.set(r.renewedByUser.name, {
        value: current.value + r.price,
        role: r.renewedByUser.role,
      });
    });

    const topCreators = Array.from(creatorRevenueMap.entries())
      .map(([label, info]) => ({ label, value: info.value, subLabel: info.role === 'collaborator' ? 'CTV' : info.role === 'agency' ? 'Đại lý' : 'Thành viên' }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Top Customers ranking
    const customerRevenueMap = new Map<string, { value: number; phone: string; count: number }>();
    orders.forEach((o) => {
      if (o.customer) {
        const val = o.customPrice !== null ? o.customPrice : o.price;
        const current = customerRevenueMap.get(o.customer.name) || { value: 0, phone: o.customer.phone, count: 0 };
        customerRevenueMap.set(o.customer.name, {
          value: current.value + val,
          phone: o.customer.phone,
          count: current.count + 1,
        });
      }
    });

    renewals.forEach((r) => {
      if (r.order?.customer) {
        const customerName = r.order.customer.name;
        const current = customerRevenueMap.get(customerName) || { value: 0, phone: r.order.customer.phone, count: 0 };
        customerRevenueMap.set(customerName, {
          value: current.value + r.price,
          phone: r.order.customer.phone,
          count: current.count + 1,
        });
      }
    });

    const topCustomers = Array.from(customerRevenueMap.entries())
      .map(([label, info]) => ({
        label,
        value: info.value,
        subLabel: `${info.phone} (${info.count} đơn)`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Orders status distribution count
    const statusCounts = {
      new: 0,
      processing: 0,
      running: 0,
      expired_soon: 0,
      expired: 0,
      cancelled: 0,
    };

    const allOrders = await prisma.order.findMany({ select: { status: true } });
    allOrders.forEach((o) => {
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

    // Compute active filters total revenue
    const totalFilteredRevenue = orders.reduce((sum, o) => sum + (o.customPrice !== null ? o.customPrice : o.price), 0) +
      renewals.reduce((sum, r) => sum + r.price, 0);

    const totalFilteredImport = orders.reduce((sum, o) => sum + (o.importPrice || 0), 0);
    const totalFilteredProfit = totalFilteredRevenue - totalFilteredImport;

    return NextResponse.json({
      overview: {
        revenueToday,
        revenueMonth,
        revenueYear,
        totalCustomers,
        totalOrders,
        expiringSoonCount,
      },
      filteredReport: {
        totalRevenue: totalFilteredRevenue,
        totalProfit: totalFilteredProfit,
        orderCount: orders.length,
        orders: orders.map((o) => ({
          createdAt: o.createdAt,
          orderCode: o.orderCode,
          customerName: o.customer.name,
          customerPhone: o.customer.phone,
          creatorName: o.createdByUser.name,
          creatorRole: o.createdByUser.role,
          productName: o.product.name,
          variantName: o.variant.name,
          cost: o.customPrice !== null ? o.customPrice : o.price,
          importPrice: o.importPrice || 0,
          profit: (o.customPrice !== null ? o.customPrice : o.price) - (o.importPrice || 0),
          status: o.status,
          startDate: o.startDate,
          endDate: o.endDate,
        })),
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
    console.error('Reports endpoint error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ tải báo cáo thống kê.' }, { status: 500 });
  }
}
