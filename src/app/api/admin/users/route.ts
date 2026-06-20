import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const users = await prisma.user.findMany({
      include: {
        orders: { select: { price: true, customPrice: true } },
        renewals: { select: { price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format and calculate sales aggregates for each user
    const formattedUsers = users.map((u) => {
      const orderCount = u.orders.length;
      
      const ordersRevenue = u.orders.reduce((sum, order) => {
        return sum + (order.customPrice !== null ? order.customPrice : order.price);
      }, 0);

      const renewalsRevenue = u.renewals.reduce((sum, r) => sum + r.price, 0);
      const totalSales = ordersRevenue + renewalsRevenue;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        note: u.note,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        orderCount,
        totalSales,
      };
    });

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Get users admin error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách người dùng.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền tạo tài khoản.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, phone, userRole, status, note } = body;

    if (!name || !email || !password || !userRole) {
      return NextResponse.json({ error: 'Thiếu các thông tin bắt buộc.' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email đăng nhập đã được sử dụng.' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone ? phone.trim() : null,
        role: userRole,
        status: status || 'active',
        note: note ? note.trim() : null,
      },
    });

    await createAuditLog({
      action: 'CREATE_USER',
      actionLabel: 'Tạo tài khoản mới',
      module: 'users',
      entityType: 'User',
      entityId: newUser.id,
      entityName: newUser.email,
      description: `Đã tạo tài khoản mới: ${newUser.name} (${newUser.email}) với vai trò ${newUser.role}`,
      newValues: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
        note: newUser.note
      },
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Tạo tài khoản thành công!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Lỗi tạo tài khoản mới.' }, { status: 500 });
  }
}

