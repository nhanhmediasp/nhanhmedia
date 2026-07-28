import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { notifyTelegramAdmin, esc } from '@/lib/telegram';
import { createOrderWithUniqueCode } from '@/lib/order-code';
import { calculateEndDate } from '@/lib/datetime';

export { calculateEndDate };

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền truy cập.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const createdByUserId = searchParams.get('createdByUserId');
    const status = searchParams.get('status');
    const productId = searchParams.get('productId');
    const searchTerm = searchParams.get('searchTerm');

    const whereClause: any = {};

    if (createdByUserId) {
      whereClause.createdByUserId = createdByUserId;
    }

    if (customerId) whereClause.customerId = customerId;
    if (status) whereClause.status = status;
    if (productId) whereClause.productId = productId;

    if (searchTerm) {
      // PostgreSQL: `contains` sinh ra LIKE (CÓ phân biệt hoa/thường),
      // khác với SQLite/MySQL. Bắt buộc có mode: 'insensitive' (→ ILIKE).
      whereClause.OR = [
        { orderCode: { contains: searchTerm, mode: 'insensitive' } },
        {
          customer: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { phone: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        createdByUser: {
          select: { id: true, name: true, role: true },
        },
        product: true,
        variant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách đơn hàng.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền tạo đơn hàng.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      productId,
      variantId,
      customerName,
      customerPhone,
      customerFacebook,
      customerZalo,
      customerEmail,
      startDate,
      note,
      internalNote,
      accountInfo,
      customPrice,
      importPrice,
    } = body;

    if (
      typeof productId !== 'string' ||
      typeof variantId !== 'string' ||
      typeof customerName !== 'string' ||
      !customerName.trim() ||
      (typeof startDate !== 'string' && typeof startDate !== 'number')
    ) {
      return NextResponse.json({ error: 'Thiếu các thông tin bắt buộc.' }, { status: 400 });
    }

    const optionalTextFields = [
      customerPhone,
      customerFacebook,
      customerZalo,
      customerEmail,
      note,
      internalNote,
      accountInfo,
    ];
    if (optionalTextFields.some((value) => value !== undefined && value !== null && typeof value !== 'string')) {
      return NextResponse.json({ error: 'Thông tin đơn hàng không hợp lệ.' }, { status: 400 });
    }

    // Giá "member" là giá bán mặc định cũ, được giữ để tương thích dữ liệu hiện có.
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
      variant.productId !== productId ||
      variant.status !== 'active' ||
      variant.product.status !== 'active'
    ) {
      return NextResponse.json({ error: 'Gói dịch vụ không tồn tại.' }, { status: 400 });
    }

    const rolePriceRecord = variant.prices[0];
    if (!rolePriceRecord) {
      return NextResponse.json(
        { error: 'Gói dịch vụ chưa có giá bán mặc định.' },
        { status: 400 }
      );
    }
    const originalPrice = rolePriceRecord.price;

    const finalPrice = originalPrice;
    const finalCustomPrice =
      customPrice !== undefined && customPrice !== ''
        ? Number(customPrice)
        : null;
    const finalImportPrice =
      importPrice !== undefined && importPrice !== ''
        ? Number(importPrice)
        : null;

    if (
      (finalCustomPrice !== null && (!Number.isFinite(finalCustomPrice) || finalCustomPrice < 0)) ||
      (finalImportPrice !== null && (!Number.isFinite(finalImportPrice) || finalImportPrice < 0))
    ) {
      return NextResponse.json({ error: 'Giá tiền không hợp lệ.' }, { status: 400 });
    }

    // 2. Resolve Customer
    let customer = null;
    if (customerPhone && customerPhone.trim()) {
      customer = await prisma.customer.findUnique({
        where: { phone: customerPhone.trim() },
      });
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: customerPhone && customerPhone.trim() ? customerPhone.trim() : null,
          facebook: customerFacebook ? customerFacebook.trim() : null,
          zalo: customerZalo ? customerZalo.trim() : null,
          email: customerEmail ? customerEmail.trim() : null,
          createdByUserId: userId,
          note: 'Khách hàng tự động tạo từ đơn hàng đầu tiên.',
        },
      });
    }

    // 3. Calculate End Date
    const parsedStartDate = new Date(startDate);
    if (Number.isNaN(parsedStartDate.getTime())) {
      return NextResponse.json({ error: 'Ngày bắt đầu không hợp lệ.' }, { status: 400 });
    }
    const parsedEndDate = calculateEndDate(parsedStartDate, variant.durationValue, variant.durationUnit);

    // 4. Create Order (tự sinh lại mã nếu trùng thay vì ném lỗi 500)
    const newOrder = await createOrderWithUniqueCode((orderCode) =>
      prisma.order.create({
        data: {
          orderCode,
          customerId: customer!.id,
          createdByUserId: userId,
          productId: variant.productId,
          variantId: variant.id,
          price: finalPrice,
          customPrice: finalCustomPrice,
          importPrice: finalImportPrice,
          status: 'new',
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          note: note ? note.trim() : null,
          internalNote: internalNote ? internalNote.trim() : null,
          accountInfo: accountInfo ? accountInfo.trim() : null,
        },
        include: {
          customer: true,
          product: true,
          variant: true,
        },
      })
    );

    await createAuditLog({
      action: 'CREATE_ORDER',
      actionLabel: 'Tạo đơn hàng mới',
      module: 'orders',
      entityType: 'Order',
      entityId: newOrder.id,
      entityName: newOrder.orderCode,
      description: `Đã tạo đơn hàng mới ${newOrder.orderCode} cho khách hàng ${newOrder.customer.name}`,
      newValues: {
        id: newOrder.id,
        orderCode: newOrder.orderCode,
        customerId: newOrder.customerId,
        price: newOrder.price,
        customPrice: newOrder.customPrice,
        status: newOrder.status,
        startDate: newOrder.startDate,
        endDate: newOrder.endDate
      },
      request: req,
      status: 'success'
    });

    // Notify Telegram Admin about new order creation
    const effectivePrice = newOrder.customPrice !== null ? newOrder.customPrice : newOrder.price;
    const adminMsg = `<b>🛍️ ĐƠN HÀNG MỚI ĐƯỢC TẠO (WEB ADMIN)</b>\n\n` +
      `📌 <b>Mã đơn:</b> <code>${esc(newOrder.orderCode)}</code>\n` +
      `📦 <b>Sản phẩm:</b> ${esc(newOrder.product.name)} (${esc(newOrder.variant.name)})\n` +
      `👤 <b>Khách hàng:</b> ${esc(newOrder.customer.name)} ${newOrder.customer.phone ? `(${esc(newOrder.customer.phone)})` : ''}\n` +
      `💵 <b>Giá tiền:</b> <b>${effectivePrice.toLocaleString('vi-VN')}đ</b>\n` +
      `📅 <b>Thời hạn:</b> ${new Date(newOrder.startDate).toLocaleDateString('vi-VN')} ➔ ${new Date(newOrder.endDate).toLocaleDateString('vi-VN')}`;

    notifyTelegramAdmin(adminMsg).catch(() => {});

    return NextResponse.json({
      message: 'Tạo đơn hàng thành công!',
      order: newOrder,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Lỗi tạo đơn hàng mới.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền thực hiện thao tác này.' }, { status: 403 });
    }

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Danh sách ID không hợp lệ hoặc để trống.' }, { status: 400 });
    }

    // Delete orders bulk
    const deleteCount = await prisma.order.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    await createAuditLog({
      action: 'DELETE_ORDERS_BULK',
      actionLabel: 'Xóa đơn hàng hàng loạt',
      module: 'orders',
      entityType: 'Order',
      description: `Đã xóa hàng loạt ${deleteCount.count} đơn hàng.`,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: `Đã xóa thành công ${deleteCount.count} đơn hàng!`,
      count: deleteCount.count,
    });
  } catch (error: any) {
    console.error('Delete orders bulk error:', error);
    return NextResponse.json({ error: 'Lỗi khi xóa đơn hàng hàng loạt.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền thực hiện thao tác này.' }, { status: 403 });
    }

    const { ids, status, amountPaid, paymentPercentage } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Danh sách ID không hợp lệ.' }, { status: 400 });
    }

    // 1. Handle payment percentage if provided
    if (paymentPercentage !== undefined && paymentPercentage !== null) {
      const percentage = parseFloat(paymentPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 1) {
        return NextResponse.json({ error: 'Tỷ lệ thanh toán không hợp lệ.' }, { status: 400 });
      }

      // Fetch individual prices
      const ordersToUpdate = await prisma.order.findMany({
        where: { id: { in: ids } },
        select: { id: true, price: true, customPrice: true, orderCode: true, status: true },
      });

      // Update in a transaction
      await prisma.$transaction(
        ordersToUpdate.map((o) => {
          const price = o.customPrice !== null ? o.customPrice : o.price;
          const targetAmountPaid = price * percentage;
          return prisma.order.update({
            where: { id: o.id },
            data: { amountPaid: targetAmountPaid },
          });
        })
      );

      // Create Audit Log
      await createAuditLog({
        actor: {
          id: userId,
          name: 'Admin',
          role: 'admin',
          email: '',
        },
        action: 'UPDATE_ORDERS_PAYMENT_PERCENTAGE_BULK',
        actionLabel: 'Sửa hàng loạt thanh toán theo %',
        module: 'orders',
        description: `Đã cập nhật số tiền nhận cho ${ordersToUpdate.length} đơn hàng về mức ${percentage * 100}%.`,
        newValues: { ids, percentage },
        status: 'success',
      });

      // Update status if also provided
      if (status) {
        const allowedStatuses = ['new', 'processing', 'running', 'expired_soon', 'expired', 'cancelled', 'refunded'];
        if (allowedStatuses.includes(status)) {
          await prisma.order.updateMany({
            where: { id: { in: ids } },
            data: { status },
          });
        }
      }

      return NextResponse.json({ success: true, count: ordersToUpdate.length });
    }

    // 2. Standard bulk update
    const updateData: any = {};

    if (status) {
      const allowedStatuses = ['new', 'processing', 'running', 'expired_soon', 'expired', 'cancelled', 'refunded'];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ error: 'Trạng thái mới không hợp lệ.' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (amountPaid !== undefined && amountPaid !== null && amountPaid !== '') {
      const parsedAmount = parseFloat(amountPaid);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return NextResponse.json({ error: 'Số tiền nhận không hợp lệ.' }, { status: 400 });
      }
      updateData.amountPaid = parsedAmount;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Không có thông tin thay đổi.' }, { status: 400 });
    }

    // Update orders bulk
    const updateCount = await prisma.order.updateMany({
      where: {
        id: { in: ids },
      },
      data: updateData,
    });

    await createAuditLog({
      action: 'UPDATE_ORDERS_STATUS_BULK',
      actionLabel: 'Cập nhật đơn hàng hàng loạt',
      module: 'orders',
      entityType: 'Order',
      description: `Đã cập nhật hàng loạt ${updateCount.count} đơn hàng: ${JSON.stringify(updateData)}.`,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: `Đã cập nhật thành công cho ${updateCount.count} đơn hàng!`,
      count: updateCount.count,
    });
  } catch (error: any) {
    console.error('Update orders status bulk error:', error);
    return NextResponse.json({ error: 'Lỗi khi cập nhật trạng thái đơn hàng hàng loạt.' }, { status: 500 });
  }
}
