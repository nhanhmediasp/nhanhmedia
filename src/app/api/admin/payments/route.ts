import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const matchedFilter = searchParams.get('matched') || 'all'; // all, matched, unmatched

    const whereClause: any = {};

    // 1. Build date range filter
    const now = new Date();
    let startDate = new Date();
    startDate.setDate(now.getDate() - 30); // Default last 30 days
    let endDate = now;

    if (fromStr) {
      const parsedFrom = new Date(fromStr);
      if (!isNaN(parsedFrom.getTime())) {
        startDate = parsedFrom;
      }
    }
    if (toStr) {
      const parsedTo = new Date(toStr);
      if (!isNaN(parsedTo.getTime())) {
        parsedTo.setHours(23, 59, 59, 999);
        endDate = parsedTo;
      }
    }

    whereClause.transactionAt = {
      gte: startDate,
      lte: endDate,
    };

    // 2. Build matched filter
    if (matchedFilter === 'matched') {
      whereClause.matched = true;
    } else if (matchedFilter === 'unmatched') {
      whereClause.matched = false;
    }

    // 3. Query Transactions
    const transactions = await prisma.paymentTransaction.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            orderCode: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { transactionAt: 'desc' },
    });

    // 4. Calculate aggregates
    let totalAmount = 0;
    let totalCount = transactions.length;
    let unmatchedCount = 0;

    // Grouping by date for chart data
    const dailyMap = new Map<string, number>();

    // Initialize all dates in range with 0 to prevent gaps in chart
    const tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      const dateKey = tempDate.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
      dailyMap.set(dateKey, 0);
      tempDate.setDate(tempDate.getDate() + 1);
    }

    transactions.forEach((tx) => {
      totalAmount += tx.amount;
      if (!tx.matched) {
        unmatchedCount++;
      }

      // Add to dailyStats
      const dateKey = new Date(tx.transactionAt).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const currentDailySum = dailyMap.get(dateKey) || 0;
      dailyMap.set(dateKey, currentDailySum + tx.amount);
    });

    // Convert daily stats map to array
    const dailyStats = Array.from(dailyMap.entries()).map(([label, value]) => ({
      label,
      value,
    })).sort((a, b) => {
      // Sort by date key ascending
      const dateA = a.label.split('/').reverse().join('-');
      const dateB = b.label.split('/').reverse().join('-');
      return dateA.localeCompare(dateB);
    });

    return NextResponse.json({
      transactions,
      totalCount,
      totalAmount,
      unmatchedCount,
      dailyStats,
    });
  } catch (error) {
    console.error('Get payment reports error:', error);
    return NextResponse.json({ error: 'Lỗi khi tải báo cáo thanh toán.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Thiếu thông tin yêu cầu.' }, { status: 400 });
    }

    const allowedStatuses = ['success', 'refunded', 'failed'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ.' }, { status: 400 });
    }

    const updatedTx = await prisma.paymentTransaction.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({
      message: 'Cập nhật trạng thái giao dịch thành công!',
      transaction: updatedTx
    });
  } catch (error: any) {
    console.error('Update payment transaction error:', error);
    return NextResponse.json({ error: `Lỗi khi cập nhật trạng thái: ${error?.message || error}` }, { status: 500 });
  }
}
