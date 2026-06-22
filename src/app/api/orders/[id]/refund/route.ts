import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    // 1. Fetch order details
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
    }

    if (order.status === 'refunded') {
      return NextResponse.json({ error: 'Đơn hàng này đã được xử lý hoàn tiền / bảo hành.' }, { status: 400 });
    }

    const isAdmin = role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Chỉ có Quản trị viên (Admin) mới có quyền thực hiện bảo hành.' }, { status: 403 });
    }

    // 2. Perform refund calculations
    const start = new Date(order.startDate).getTime();
    const end = new Date(order.endDate).getTime();
    const now = new Date().getTime();

    // Duration of the order in days
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    // Total purchase price
    const orderPrice = order.customPrice !== null ? order.customPrice : order.price;

    // Price per day
    const pricePerDay = orderPrice / totalDays;

    // Remaining days
    let remainingDays = 0;
    if (now < start) {
      remainingDays = totalDays;
    } else if (now > end) {
      remainingDays = 0;
    } else {
      remainingDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    }

    const usedDays = totalDays - remainingDays;
    const usedValue = usedDays * pricePerDay;
    const refundAmount = Math.max(0, Math.round((order.amountPaid ?? 0) - usedValue));

    // 3. Update order in database
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'refunded',
        refundAmount,
        refundedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Xử lý bảo hành / hoàn tiền thành công!',
      order: updatedOrder,
      refundAmount,
      remainingDays,
      pricePerDay,
    });
  } catch (error) {
    console.error('Refund order error:', error);
    return NextResponse.json({ error: 'Lỗi xử lý hoàn tiền đơn hàng.' }, { status: 500 });
  }
}
