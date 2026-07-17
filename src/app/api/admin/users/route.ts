import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const [users, orderStats, renewalStats] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          note: true,
          avatarUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.$queryRaw<{ createdByUserId: string; orderCount: number; revenue: number }[]>`
        SELECT 
          "created_by_user_id" as "createdByUserId",
          COUNT(*)::int as "orderCount",
          COALESCE(SUM(COALESCE(custom_price, price)), 0)::float as "revenue"
        FROM orders
        GROUP BY "created_by_user_id"
      `,
      prisma.$queryRaw<{ renewedByUserId: string; revenue: number }[]>`
        SELECT 
          "renewed_by_user_id" as "renewedByUserId",
          COALESCE(SUM(price), 0)::float as "revenue"
        FROM order_renewals
        GROUP BY "renewed_by_user_id"
      `,
    ]);

    // Build lookup maps for fast O(1) matching
    const orderMap = new Map<string, { orderCount: number; revenue: number }>();
    if (Array.isArray(orderStats)) {
      orderStats.forEach((stat) => {
        if (stat.createdByUserId) {
          orderMap.set(stat.createdByUserId, {
            orderCount: Number(stat.orderCount) || 0,
            revenue: Number(stat.revenue) || 0,
          });
        }
      });
    }

    const renewalMap = new Map<string, number>();
    if (Array.isArray(renewalStats)) {
      renewalStats.forEach((stat) => {
        if (stat.renewedByUserId) {
          renewalMap.set(stat.renewedByUserId, Number(stat.revenue) || 0);
        }
      });
    }

    // Format and calculate sales aggregates for each user
    const formattedUsers = users.map((u) => {
      const oStat = orderMap.get(u.id) || { orderCount: 0, revenue: 0 };
      const renewalRev = renewalMap.get(u.id) || 0;
      const totalSales = oStat.revenue + renewalRev;

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
        orderCount: oStat.orderCount,
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
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền tạo nhân sự.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, phone, userRole, status, note } = body;

    if (!name || !userRole) {
      return NextResponse.json({ error: 'Thiếu các thông tin bắt buộc (Tên và vai trò).' }, { status: 400 });
    }

    const finalEmail = email && email.trim() !== ''
      ? email.toLowerCase().trim()
      : `staff_${Date.now()}@nhanhmedia.com`;

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: finalEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email đã được sử dụng.' }, { status: 400 });
    }

    const passwordHash = password && password.trim() !== '' ? hashPassword(password) : null;

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: finalEmail,
        passwordHash,
        phone: phone ? phone.trim() : null,
        role: userRole,
        status: status || 'active',
        note: note ? note.trim() : null,
      },
    });

    await createAuditLog({
      action: 'CREATE_USER',
      actionLabel: 'Tạo nhân sự mới',
      module: 'users',
      entityType: 'User',
      entityId: newUser.id,
      entityName: newUser.email,
      description: `Đã tạo nhân sự mới: ${newUser.name} (${newUser.email}) với vai trò ${newUser.role}`,
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
      message: 'Tạo nhân sự thành công!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Lỗi tạo nhân sự mới.' }, { status: 500 });
  }
}

