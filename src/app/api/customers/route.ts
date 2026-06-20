import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Không xác định được người dùng.' }, { status: 401 });
    }

    const isAdmin = role === 'admin';

    // Query customers
    const customers = await prisma.customer.findMany({
      where: isAdmin ? {} : { createdByUserId: userId },
      include: {
        createdByUser: {
          select: { id: true, name: true, role: true },
        },
        orders: {
          select: { id: true, price: true, customPrice: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format output with computed aggregates (total spent, order count)
    const formattedCustomers = customers.map((c) => {
      const orderCount = c.orders.length;
      const totalSpent = c.orders.reduce((sum, order) => {
        return sum + (order.customPrice !== null ? order.customPrice : order.price);
      }, 0);

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        facebook: c.facebook,
        zalo: c.zalo,
        email: c.email,
        createdByUserId: c.createdByUserId,
        createdByName: c.createdByUser.name,
        createdByRole: c.createdByUser.role,
        note: c.note,
        createdAt: c.createdAt,
        orderCount,
        totalSpent,
      };
    });

    return NextResponse.json({ customers: formattedCustomers });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách khách hàng.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const { name, phone, facebook, zalo, email, note } = await req.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Họ tên và số điện thoại là bắt buộc.' }, { status: 400 });
    }

    // Check if phone number already exists
    const existing = await prisma.customer.findUnique({
      where: { phone: phone.trim() },
      include: {
        createdByUser: {
          select: { name: true },
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: 'Số điện thoại này đã tồn tại trong hệ thống.',
          existingCustomer: {
            id: existing.id,
            name: existing.name,
            phone: existing.phone,
            createdByName: existing.createdByUser.name,
          },
        },
        { status: 409 } // Conflict
      );
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        facebook: facebook ? facebook.trim() : null,
        zalo: zalo ? zalo.trim() : null,
        email: email ? email.trim() : null,
        createdByUserId: userId,
        note: note ? note.trim() : null,
      },
    });

    return NextResponse.json({
      message: 'Thêm khách hàng thành công!',
      customer: newCustomer,
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Lỗi thêm khách hàng mới.' }, { status: 500 });
  }
}
