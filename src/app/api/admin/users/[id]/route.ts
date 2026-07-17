import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminRole = req.headers.get('x-user-role');

    if (adminRole !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền truy cập.' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        renewals: { select: { price: true } },
        customers: { select: { id: true } },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            progress: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại.' }, { status: 404 });
    }

    const orderCount = user.orders.length;
    const customerCount = user.customers.length;

    const ordersRevenue = user.orders.reduce((sum, order) => {
      return sum + (order.customPrice !== null ? order.customPrice : order.price);
    }, 0);

    const renewalsRevenue = user.renewals.reduce((sum, r) => sum + r.price, 0);
    const totalSales = ordersRevenue + renewalsRevenue;

    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      note: user.note,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      orderCount,
      customerCount,
      totalSales,
      projects: user.projects,
      projectCount: user.projects.length,
      orders: user.orders.map((o) => ({
        id: o.id,
        orderCode: o.orderCode,
        customer: o.customer,
        product: o.product,
        variant: o.variant,
        price: o.price,
        customPrice: o.customPrice,
        status: o.status,
        startDate: o.startDate,
        endDate: o.endDate,
        createdAt: o.createdAt,
      })),
    };

    return NextResponse.json({ user: formattedUser });
  } catch (error) {
    console.error('Get user detail error:', error);
    return NextResponse.json({ error: 'Lỗi tải thông tin tài khoản.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminId = req.headers.get('x-user-id');
    const adminRole = req.headers.get('x-user-role');

    if (adminRole !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền cập nhật.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, phone, userRole, status, note } = body;

    if (!name || !email || !userRole) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc.' }, { status: 400 });
    }

    // Check check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại.' }, { status: 404 });
    }

    // Check if new email is unique
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), id: { not: id } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Email đăng nhập đã được sử dụng bởi tài khoản khác.' }, { status: 400 });
    }

    // Prepare old values
    const oldValues = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      note: user.note
    };

    // Prepare update data
    const updateData: any = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      role: userRole,
      status: status || 'active',
      note: note ? note.trim() : null,
    };

    // Prevent changing own role or locking self out
    if (id === adminId) {
      updateData.role = 'admin'; // Enforce admin role
      updateData.status = 'active'; // Enforce active status
    }

    // If new password is provided, hash and update
    if (password && password.trim() !== '') {
      updateData.passwordHash = hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Prepare new values
    const newValues = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      status: updatedUser.status,
      note: updatedUser.note
    };

    let action = 'UPDATE_USER';
    let actionLabel = 'Sửa thông tin tài khoản';
    if (user.role !== updatedUser.role) {
      action = 'CHANGE_USER_ROLE';
      actionLabel = 'Đổi vai trò tài khoản';
    } else if (user.status !== updatedUser.status) {
      if (updatedUser.status === 'locked') {
        action = 'LOCK_USER';
        actionLabel = 'Khóa tài khoản';
      } else if (user.status === 'locked' && updatedUser.status === 'active') {
        action = 'UNLOCK_USER';
        actionLabel = 'Mở khóa tài khoản';
      }
    }

    await createAuditLog({
      action,
      actionLabel,
      module: 'users',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email,
      description: `Đã cập nhật tài khoản ${user.email} (${actionLabel})`,
      oldValues: password && password.trim() !== '' ? { ...oldValues, passwordHash: '••••••••' } : oldValues,
      newValues: password && password.trim() !== '' ? { ...newValues, passwordHash: '••••••••' } : newValues,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Cập nhật tài khoản thành công!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật tài khoản.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminId = req.headers.get('x-user-id');
    const adminRole = req.headers.get('x-user-role');

    if (adminRole !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa.' }, { status: 403 });
    }

    if (id === adminId) {
      return NextResponse.json({ error: 'Bạn không thể tự xóa tài khoản của chính mình!' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại.' }, { status: 404 });
    }

    // Check database links
    const orderCount = await prisma.order.count({ where: { createdByUserId: id } });
    const customerCount = await prisma.customer.count({ where: { createdByUserId: id } });

    if (orderCount > 0 || customerCount > 0) {
      return NextResponse.json(
        {
          error: `Không thể xóa tài khoản này vì đã có dữ liệu ${orderCount} đơn hàng và ${customerCount} khách hàng liên kết. Hãy khóa (locked) hoặc tắt kích hoạt (inactive) tài khoản thay vì xóa.`,
        },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    await createAuditLog({
      action: 'DELETE_USER',
      actionLabel: 'Xóa tài khoản',
      module: 'users',
      entityType: 'User',
      entityId: id,
      entityName: user.email,
      description: `Đã xóa tài khoản: ${user.name} (${user.email})`,
      oldValues: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      },
      request: req,
      status: 'success'
    });

    return NextResponse.json({ message: 'Xóa tài khoản thành công!' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Lỗi xóa tài khoản.' }, { status: 500 });
  }
}

