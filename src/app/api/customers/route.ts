import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Không xác định được người dùng.' }, { status: 401 });
    }

    const isAdmin = role === 'admin';

    // Query customers and aggregates in parallel
    const [customers, orderStats] = await Promise.all([
      prisma.customer.findMany({
        where: isAdmin ? {} : { createdByUserId: userId },
        select: {
          id: true,
          name: true,
          phone: true,
          facebook: true,
          zalo: true,
          email: true,
          createdByUserId: true,
          note: true,
          createdAt: true,
          createdByUser: {
            select: { name: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.$queryRaw<{ customerId: string; orderCount: number; totalSpent: number }[]>`
        SELECT 
          "customer_id" as "customerId",
          COUNT(*)::int as "orderCount",
          COALESCE(SUM(COALESCE(custom_price, price)), 0)::float as "totalSpent"
        FROM orders
        GROUP BY "customer_id"
      `,
    ]);

    // Build map for fast matching
    const statsMap = new Map<string, { orderCount: number; totalSpent: number }>();
    if (Array.isArray(orderStats)) {
      orderStats.forEach((stat) => {
        if (stat.customerId) {
          statsMap.set(stat.customerId, {
            orderCount: Number(stat.orderCount) || 0,
            totalSpent: Number(stat.totalSpent) || 0,
          });
        }
      });
    }

    // Format output with computed aggregates (total spent, order count)
    const formattedCustomers = customers.map((c) => {
      const stat = statsMap.get(c.id) || { orderCount: 0, totalSpent: 0 };

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
        orderCount: stat.orderCount,
        totalSpent: stat.totalSpent,
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

    if (!name) {
      return NextResponse.json({ error: 'Họ tên là bắt buộc.' }, { status: 400 });
    }

    // Check if phone number already exists
    let existing = null;
    if (phone && phone.trim()) {
      existing = await prisma.customer.findUnique({
        where: { phone: phone.trim() },
        include: {
          createdByUser: {
            select: { name: true },
          },
        },
      });
    }

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
        phone: phone && phone.trim() ? phone.trim() : null,
        facebook: facebook ? facebook.trim() : null,
        zalo: zalo ? zalo.trim() : null,
        email: email ? email.trim() : null,
        createdByUserId: userId,
        note: note ? note.trim() : null,
      },
    });

    await createAuditLog({
      action: 'CREATE_CUSTOMER',
      actionLabel: 'Tạo khách hàng',
      module: 'customers',
      entityType: 'Customer',
      entityId: newCustomer.id,
      entityName: newCustomer.name,
      description: `Đã tạo khách hàng mới: ${newCustomer.name} (${newCustomer.phone})`,
      newValues: {
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        facebook: newCustomer.facebook,
        zalo: newCustomer.zalo,
        email: newCustomer.email,
        note: newCustomer.note
      },
      request: req,
      status: 'success'
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

    // Delete customers bulk
    const deleteCount = await prisma.customer.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    await createAuditLog({
      action: 'DELETE_CUSTOMERS_BULK',
      actionLabel: 'Xóa khách hàng hàng loạt',
      module: 'customers',
      entityType: 'Customer',
      description: `Đã xóa hàng loạt ${deleteCount.count} khách hàng.`,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: `Đã xóa thành công ${deleteCount.count} khách hàng!`,
      count: deleteCount.count,
    });
  } catch (error: any) {
    console.error('Delete customers bulk error:', error);
    return NextResponse.json({ error: 'Lỗi khi xóa khách hàng hàng loạt.' }, { status: 500 });
  }
}

