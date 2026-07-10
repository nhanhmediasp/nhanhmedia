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

    const customers = await prisma.customer.findMany({
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
        source: true,
        manualRating: true,
        internalNotes: true,
        createdAt: true,
        createdByUser: {
          select: { name: true, role: true },
        },
        orders: {
          select: {
            price: true,
            customPrice: true,
            amountPaid: true,
            refundAmount: true,
            status: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedCustomers = customers.map((c) => {
      const orderCount = c.orders.length;
      let totalSpent = 0;
      let totalPaid = 0;
      let totalDebt = 0;
      let cancelledCount = 0;
      let refundedCount = 0;

      c.orders.forEach((o) => {
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
        source: c.source,
        manualRating: c.manualRating,
        internalNotes: c.internalNotes,
        createdAt: c.createdAt,
        orderCount,
        totalSpent,
        totalPaid,
        totalDebt,
        cancelledCount,
        refundedCount,
        autoRating: rating,
        vipStatus,
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

    const { name, phone, facebook, zalo, email, note, source, manualRating, internalNotes } = await req.json();

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
        source: source ? source.trim() : null,
        manualRating: manualRating ? Number(manualRating) : null,
        internalNotes: internalNotes ? internalNotes.trim() : null,
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
        note: newCustomer.note,
        source: newCustomer.source,
        manualRating: newCustomer.manualRating,
        internalNotes: newCustomer.internalNotes,
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

