import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    const totalSpent = customer.orders.reduce((sum, order) => {
      return sum + (order.customPrice !== null ? order.customPrice : order.price);
    }, 0);

    const formattedCustomer = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      facebook: customer.facebook,
      zalo: customer.zalo,
      email: customer.email,
      note: customer.note,
      createdAt: customer.createdAt,
      createdByUserId: customer.createdByUserId,
      createdByUser: customer.createdByUser,
      orderCount,
      totalSpent,
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

    const { name, phone, facebook, zalo, email, note } = await req.json();

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

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        facebook: facebook ? facebook.trim() : null,
        zalo: zalo ? zalo.trim() : null,
        email: email ? email.trim() : null,
        note: note ? note.trim() : null,
      },
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

    return NextResponse.json({ message: 'Xóa khách hàng thành công!' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'Lỗi xóa khách hàng.' }, { status: 500 });
  }
}
