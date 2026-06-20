import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateEndDate } from '../../route';
import { createAuditLog } from '@/lib/audit';

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

    const body = await req.json();
    const { variantId, startDateOption, customPrice } = body;

    if (!variantId || !startDateOption) {
      return NextResponse.json({ error: 'Thiếu thông tin gia hạn bắt buộc.' }, { status: 400 });
    }

    // 1. Fetch order details
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
    }

    const isAdmin = role === 'admin';

    // Permission check: users can only renew their own orders
    if (!isAdmin && order.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Bạn không có quyền gia hạn đơn hàng này.' }, { status: 403 });
    }

    // 2. Fetch variant and calculate pricing
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        prices: {
          where: { role: role === 'admin' ? 'member' : role },
        },
      },
    });

    if (!variant) {
      return NextResponse.json({ error: 'Gói gia hạn không tồn tại.' }, { status: 400 });
    }

    const rolePriceRecord = variant.prices[0];
    const originalPrice = rolePriceRecord ? rolePriceRecord.price : 0;

    const finalPrice = originalPrice;
    const finalCustomPrice = isAdmin && customPrice !== undefined && customPrice !== '' ? parseFloat(customPrice) : null;
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

    const oldValues = {
      variantId: order.variantId,
      endDate: order.endDate,
      status: order.status,
      price: order.price,
      customPrice: order.customPrice
    };

    // 4. Record renewal and update order in a transaction
    await prisma.$transaction(async (tx) => {
      // A) Create renewal log
      await tx.orderRenewal.create({
        data: {
          orderId: id,
          oldEndDate: order.endDate,
          newEndDate: newEndDate,
          variantId: variantId,
          price: renewalRevenue,
          renewedByUserId: userId,
        },
      });

      // B) Update order details
      await tx.order.update({
        where: { id },
        data: {
          variantId: variantId,
          endDate: newEndDate,
          status: 'running', // Reset status to running (đang chạy) since it is renewed!
          // Note: we can keep original order price, or update it. Let's update order details to match current package:
          price: finalPrice,
          customPrice: finalCustomPrice,
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
          customPrice: updatedOrder.customPrice
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

