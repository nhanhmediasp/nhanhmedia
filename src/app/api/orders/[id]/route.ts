import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateEndDate } from '@/lib/datetime';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền truy cập.' }, { status: 403 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        createdByUser: {
          select: { id: true, name: true, role: true },
        },
        product: {
          include: {
            variants: {
              where: { status: 'active' },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        variant: true,
        supplier: true,
        renewals: {
          include: {
            renewedByUser: { select: { id: true, name: true } },
            variant: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        emailLogs: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityId: id,
        module: 'orders',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ order, auditLogs });
  } catch (error) {
    console.error('Get order detail error:', error);
    return NextResponse.json({ error: 'Lỗi tải chi tiết đơn hàng.' }, { status: 500 });
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

    if (!userId || role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền chỉnh sửa.' }, { status: 403 });
    }

    const body = await req.json();
    const { status, startDate, endDate, note, internalNote, accountInfo, customPrice, importPrice, amountPaid, supplierId } = body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
    }

    if (note !== undefined && note !== null && typeof note !== 'string') {
      return NextResponse.json({ error: 'Ghi chú không hợp lệ.' }, { status: 400 });
    }

    const updateData: any = {
      note: note !== undefined ? (note ? note.trim() : null) : order.note,
    };

    if (
        [internalNote, accountInfo].some(
          (value) => value !== undefined && value !== null && typeof value !== 'string'
        )
      ) {
      return NextResponse.json({ error: 'Thông tin nội bộ không hợp lệ.' }, { status: 400 });
    }

    updateData.internalNote = internalNote !== undefined ? (internalNote ? internalNote.trim() : null) : order.internalNote;
    updateData.accountInfo = accountInfo !== undefined ? (accountInfo ? accountInfo.trim() : null) : order.accountInfo;

    if (status !== undefined) {
        const allowedStatuses = new Set([
          'new',
          'processing',
          'running',
          'expired_soon',
          'expired',
          'cancelled',
          'refunded',
        ]);
        if (typeof status !== 'string' || !allowedStatuses.has(status)) {
          return NextResponse.json({ error: 'Trạng thái đơn hàng không hợp lệ.' }, { status: 400 });
        }
        updateData.status = status;
    }

    if (amountPaid !== undefined) {
        const parsedAmountPaid =
          amountPaid === '' || amountPaid === null ? 0 : Number(amountPaid);
        if (!Number.isFinite(parsedAmountPaid) || parsedAmountPaid < 0) {
          return NextResponse.json({ error: 'Số tiền đã nhận không hợp lệ.' }, { status: 400 });
        }
        updateData.amountPaid = parsedAmountPaid;
    }

    if (startDate) {
        const parsedStartDate = new Date(startDate);
        if (Number.isNaN(parsedStartDate.getTime())) {
          return NextResponse.json({ error: 'Ngày bắt đầu không hợp lệ.' }, { status: 400 });
        }
        updateData.startDate = parsedStartDate;
    }

    if (endDate) {
        const parsedEndDate = new Date(endDate);
        if (Number.isNaN(parsedEndDate.getTime())) {
          return NextResponse.json({ error: 'Ngày kết thúc không hợp lệ.' }, { status: 400 });
        }
        updateData.endDate = parsedEndDate;
    } else if (startDate && !endDate) {
        const variant = await prisma.productVariant.findUnique({ where: { id: order.variantId } });
        if (variant) {
          updateData.endDate = calculateEndDate(updateData.startDate, variant.durationValue, variant.durationUnit);
        }
    }

    if (customPrice !== undefined) {
        const parsedCustomPrice = customPrice === '' || customPrice === null
          ? null
          : Number(customPrice);
        if (
          parsedCustomPrice !== null &&
          (!Number.isFinite(parsedCustomPrice) || parsedCustomPrice < 0)
        ) {
          return NextResponse.json({ error: 'Giá bán tùy chỉnh không hợp lệ.' }, { status: 400 });
        }
        updateData.customPrice = parsedCustomPrice;
    }

    if (importPrice !== undefined) {
        const parsedImportPrice = importPrice === '' || importPrice === null
          ? null
          : Number(importPrice);
        if (
          parsedImportPrice !== null &&
          (!Number.isFinite(parsedImportPrice) || parsedImportPrice < 0)
        ) {
          return NextResponse.json({ error: 'Giá nhập không hợp lệ.' }, { status: 400 });
        }
        updateData.importPrice = parsedImportPrice;
    }

    if (supplierId !== undefined) {
        if (supplierId !== null && typeof supplierId !== 'string') {
          return NextResponse.json({ error: 'Nhà cung cấp không hợp lệ.' }, { status: 400 });
        }
        updateData.supplierId = supplierId === '' || supplierId === null ? null : supplierId;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        createdByUser: {
          select: { id: true, name: true, role: true },
        },
        product: {
          include: {
            variants: {
              where: { status: 'active' },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        variant: true,
        supplier: true,
        renewals: {
          include: {
            renewedByUser: { select: { id: true, name: true } },
            variant: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        emailLogs: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    await createAuditLog({
      action: 'UPDATE_ORDER',
      actionLabel: 'Cập nhật đơn hàng',
      module: 'orders',
      entityType: 'Order',
      entityId: id,
      entityName: updatedOrder.orderCode,
      description: `Đã cập nhật thông tin đơn hàng ${updatedOrder.orderCode}`,
      oldValues: {
        status: order.status,
        startDate: order.startDate,
        endDate: order.endDate,
        note: order.note,
        internalNote: order.internalNote,
        accountInfo: order.accountInfo,
        customPrice: order.customPrice,
        importPrice: order.importPrice,
        amountPaid: order.amountPaid,
        supplierId: order.supplierId
      },
      newValues: {
        status: updatedOrder.status,
        startDate: updatedOrder.startDate,
        endDate: updatedOrder.endDate,
        note: updatedOrder.note,
        internalNote: updatedOrder.internalNote,
        accountInfo: updatedOrder.accountInfo,
        customPrice: updatedOrder.customPrice,
        importPrice: updatedOrder.importPrice,
        amountPaid: updatedOrder.amountPaid,
        supplierId: updatedOrder.supplierId
      },
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Cập nhật đơn hàng thành công!',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật đơn hàng.' }, { status: 500 });
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
      return NextResponse.json({ error: 'Chỉ có Admin mới có quyền xóa đơn hàng.' }, { status: 403 });
    }

    await prisma.orderRenewal.deleteMany({ where: { orderId: id } });
    await prisma.emailLog.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });

    return NextResponse.json({ message: 'Xóa đơn hàng thành công!' });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: 'Lỗi xóa đơn hàng.' }, { status: 500 });
  }
}
