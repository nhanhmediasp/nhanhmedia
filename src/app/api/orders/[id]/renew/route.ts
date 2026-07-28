import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateEndDate } from '@/lib/datetime';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền gia hạn.' }, { status: 403 });
    }

    const body = await req.json();
    const { variantId, startDateOption, customPrice, amountPaid: amountPaidInput } = body;

    if (
      typeof variantId !== 'string' ||
      !variantId ||
      (startDateOption !== 'old_end_date' && startDateOption !== 'today')
    ) {
      return NextResponse.json({ error: 'Thiếu thông tin gia hạn bắt buộc.' }, { status: 400 });
    }

    // 1. Fetch order details
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
    }

    // 2. Fetch variant and calculate pricing
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: { id: true, status: true },
        },
        prices: {
          where: { role: 'member' },
        },
      },
    });

    if (
      !variant ||
      variant.productId !== order.productId ||
      variant.status !== 'active' ||
      variant.product.status !== 'active'
    ) {
      return NextResponse.json({ error: 'Gói gia hạn không tồn tại.' }, { status: 400 });
    }

    const rolePriceRecord = variant.prices[0];
    if (!rolePriceRecord) {
      return NextResponse.json(
        { error: 'Gói gia hạn chưa có giá bán mặc định.' },
        { status: 400 }
      );
    }
    const originalPrice = rolePriceRecord.price;

    const finalPrice = originalPrice;
    const finalCustomPrice =
      customPrice !== undefined && customPrice !== ''
        ? Number(customPrice)
        : null;
    if (
      finalCustomPrice !== null &&
      (!Number.isFinite(finalCustomPrice) || finalCustomPrice < 0)
    ) {
      return NextResponse.json({ error: 'Giá gia hạn không hợp lệ.' }, { status: 400 });
    }
    const renewalRevenue = finalCustomPrice !== null ? finalCustomPrice : finalPrice;

    // 3. Determine start date and calculate new end date
    let renewalStartDate = new Date();
    if (startDateOption === 'old_end_date') {
      // If order is already expired, we might want to start from today,
      // but otherwise start from current end date to preserve time.
      const currentEndDate = new Date(order.endDate);
      // If currentEndDate is in the past, starting from it might result in a past newEndDate.
      // But standard business practice is to add duration to the old expiration date.
      renewalStartDate = currentEndDate;
    } else {
      // Start from today
      renewalStartDate = new Date();
    }

    const newEndDate = calculateEndDate(renewalStartDate, variant.durationValue, variant.durationUnit);

    const parsedAmountPaid =
      amountPaidInput !== undefined &&
      amountPaidInput !== null &&
      amountPaidInput !== ''
        ? Number(amountPaidInput)
        : renewalRevenue;

    if (!Number.isFinite(parsedAmountPaid) || parsedAmountPaid < 0) {
      return NextResponse.json({ error: 'Số tiền đã thu không hợp lệ.' }, { status: 400 });
    }
    const newAmountPaid = parsedAmountPaid;

    // Chưa thu đủ thì không thể coi là đang chạy
    const newStatus = newAmountPaid >= renewalRevenue ? 'running' : 'processing';

    const oldValues = {
      variantId: order.variantId,
      endDate: order.endDate,
      status: order.status,
      price: order.price,
      customPrice: order.customPrice,
      amountPaid: order.amountPaid,
    };

    // 4. Record renewal and update order in a transaction
    await prisma.$transaction(async (tx) => {
      // A) Create renewal log
      await tx.orderRenewal.create({
        data: {
          orderId: id,
          oldEndDate: order.endDate,
          newEndDate: newEndDate,
          variantId: variant.id,
          price: renewalRevenue,
          renewedByUserId: userId,
        },
      });

      // B) Update order details
      await tx.order.update({
        where: { id },
        data: {
          variantId: variant.id,
          endDate: newEndDate,
          status: newStatus,
          // Giá đơn được ghi đè theo gói mới, nên công nợ cũng phải tính lại
          // theo kỳ mới thay vì mang số tiền của kỳ trước sang.
          price: finalPrice,
          customPrice: finalCustomPrice,
          amountPaid: newAmountPaid,
        },
      });
    });

    const updatedOrder = await prisma.order.findUnique({ where: { id } });
    if (updatedOrder) {
      await createAuditLog({
        action: 'RENEW_ORDER',
        actionLabel: 'Gia hạn đơn hàng',
        module: 'orders',
        entityType: 'Order',
        entityId: id,
        entityName: updatedOrder.orderCode,
        description: `Đã gia hạn đơn hàng ${updatedOrder.orderCode} đến ngày ${newEndDate.toLocaleDateString('vi-VN')}`,
        oldValues,
        newValues: {
          variantId: updatedOrder.variantId,
          endDate: updatedOrder.endDate,
          status: updatedOrder.status,
          price: updatedOrder.price,
          customPrice: updatedOrder.customPrice,
          amountPaid: updatedOrder.amountPaid,
        },
        request: req,
        status: 'success'
      });
    }

    return NextResponse.json({
      message: 'Gia hạn dịch vụ thành công!',
      newEndDate: newEndDate.toISOString(),
    });
  } catch (error) {
    console.error('Renew order error:', error);
    return NextResponse.json({ error: 'Lỗi gia hạn dịch vụ.' }, { status: 500 });
  }
}

