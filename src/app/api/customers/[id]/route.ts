import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Không xác định được người dùng.' }, { status: 401 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, role: true },
        },
        orders: {
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true } },
            createdByUser: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Khách hàng không tồn tại.' }, { status: 404 });
    }

    // Permission check: admins can view all, others can only view customers they created
    if (role !== 'admin' && customer.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Bạn không có quyền xem khách hàng này.' }, { status: 403 });
    }

    const orderCount = customer.orders.length;
    let totalSpent = 0;
    let totalPaid = 0;
    let totalDebt = 0;
    let cancelledCount = 0;
    let refundedCount = 0;

    customer.orders.forEach((o) => {
      const orderPrice = o.customPrice !== null ? o.customPrice : o.price;
      totalSpent += orderPrice;
      totalPaid += o.amountPaid;
      totalDebt += Math.max(0, orderPrice - o.amountPaid);
      if (o.status === 'cancelled') {
        cancelledCount++;
      }
      if (o.refundAmount && o.refundAmount > 0) {
        refundedCount++;
      }
    });

    // auto rating logic
    let rating = 4;
    const cancelRate = orderCount > 0 ? (cancelledCount / orderCount) : 0;
    if (cancelRate > 0.2) rating -= 1;
    if (totalDebt > 0) rating -= 1;
    if (totalPaid > 20000000) rating += 1;
    rating = Math.max(1, Math.min(5, rating));

    // vipStatus
    let vipStatus = 'standard';
    if (totalPaid > 20000000) {
      vipStatus = 'vip';
    } else if (totalPaid > 5000000) {
      vipStatus = 'loyal';
    }

    const formattedCustomer = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      facebook: customer.facebook,
      zalo: customer.zalo,
      email: customer.email,
      note: customer.note,
      source: customer.source,
      manualRating: customer.manualRating,
      internalNotes: customer.internalNotes,
      createdAt: customer.createdAt,
      createdByUserId: customer.createdByUserId,
      createdByUser: customer.createdByUser,
      orderCount,
      totalSpent,
      totalPaid,
      totalDebt,
      cancelledCount,
      refundedCount,
      autoRating: rating,
      vipStatus,
      orders: customer.orders,
    };

    return NextResponse.json({ customer: formattedCustomer });
  } catch (error) {
    console.error('Get customer detail error:', error);
    return NextResponse.json({ error: 'Lỗi tải thông tin chi tiết khách hàng.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Không xác định được người dùng.' }, { status: 401 });
    }

    const { name, phone, facebook, zalo, email, note, source, manualRating, internalNotes } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Họ tên và số điện thoại là bắt buộc.' }, { status: 400 });
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Khách hàng không tồn tại.' }, { status: 404 });
    }

    // Permissions check: admin can edit any, user can edit only their own
    if (role !== 'admin' && customer.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa khách hàng này.' }, { status: 403 });
    }

    // Check if new phone is unique (exclude current customer)
    const existing = await prisma.customer.findFirst({
      where: { phone: phone.trim(), id: { not: id } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Số điện thoại này đã được sử dụng bởi khách hàng khác.' }, { status: 400 });
    }

    const oldValues = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      facebook: customer.facebook,
      zalo: customer.zalo,
      email: customer.email,
      note: customer.note,
      source: customer.source,
      manualRating: customer.manualRating,
      internalNotes: customer.internalNotes,
    };

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        facebook: facebook ? facebook.trim() : null,
        zalo: zalo ? zalo.trim() : null,
        email: email ? email.trim() : null,
        note: note ? note.trim() : null,
        source: source ? source.trim() : null,
        manualRating: manualRating ? Number(manualRating) : null,
        internalNotes: internalNotes ? internalNotes.trim() : null,
      },
    });

    const newValues = {
      id: updatedCustomer.id,
      name: updatedCustomer.name,
      phone: updatedCustomer.phone,
      facebook: updatedCustomer.facebook,
      zalo: updatedCustomer.zalo,
      email: updatedCustomer.email,
      note: updatedCustomer.note,
      source: updatedCustomer.source,
      manualRating: updatedCustomer.manualRating,
      internalNotes: updatedCustomer.internalNotes,
    };

    await createAuditLog({
      action: 'UPDATE_CUSTOMER',
      actionLabel: 'Sửa khách hàng',
      module: 'customers',
      entityType: 'Customer',
      entityId: id,
      entityName: updatedCustomer.name,
      description: `Đã sửa thông tin khách hàng: ${updatedCustomer.name} (${updatedCustomer.phone})`,
      oldValues,
      newValues,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Cập nhật khách hàng thành công!',
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật khách hàng.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = req.headers.get('x-user-role');

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ có Admin mới có quyền xóa khách hàng.' }, { status: 403 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Khách hàng không tồn tại.' }, { status: 404 });
    }

    // Check if customer is referenced in any order
    const orderCount = await prisma.order.count({
      where: { customerId: id },
    });

    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'Không thể xóa khách hàng này vì họ đã có đơn hàng trong hệ thống. Hãy cập nhật thông tin thay vì xóa.' },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id },
    });

    await createAuditLog({
      action: 'DELETE_CUSTOMER',
      actionLabel: 'Xóa khách hàng',
      module: 'customers',
      entityType: 'Customer',
      entityId: id,
      entityName: customer.name,
      description: `Đã xóa khách hàng: ${customer.name} (${customer.phone})`,
      oldValues: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email
      },
      request: req,
      status: 'success'
    });

    return NextResponse.json({ message: 'Xóa khách hàng thành công!' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'Lỗi xóa khách hàng.' }, { status: 500 });
  }
}

