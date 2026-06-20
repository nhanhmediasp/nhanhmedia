import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateEndDate } from '../route';
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

    const isAdmin = role === 'admin';

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

    // Permission check: users can only view their own orders
    if (!isAdmin && order.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Bạn không có quyền xem đơn hàng này.' }, { status: 403 });
    }

    if (!isAdmin) {
      // @ts-ignore
      delete order.importPrice;
    }

    return NextResponse.json({ order });
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

    if (!userId || !role) {
      return NextResponse.json({ error: 'Không xác định được người dùng.' }, { status: 401 });
    }

    const body = await req.json();
    const { status, startDate, endDate, note, internalNote, customPrice, importPrice, supplierId, amountPaid } = body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
    }

    const isAdmin = role === 'admin';

    // Permission check: users can only edit their own orders
    if (!isAdmin && order.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa đơn hàng này.' }, { status: 403 });
    }

    // Save old values for log
    const oldValues = {
      status: order.status,
      startDate: order.startDate,
      endDate: order.endDate,
      price: order.price,
      customPrice: order.customPrice,
      importPrice: order.importPrice,
      amountPaid: order.amountPaid,
      note: order.note,
      internalNote: order.internalNote,
      supplierId: order.supplierId
    };

    // Prepare update data
    const updateData: any = {
      note: note !== undefined ? (note ? note.trim() : null) : order.note,
    };

    if (amountPaid !== undefined) {
      updateData.amountPaid = amountPaid === '' || amountPaid === null ? 0 : parseFloat(amountPaid);
    }

    // Admin-only updates
    if (isAdmin) {
      updateData.internalNote = internalNote !== undefined ? internalNote.trim() : order.internalNote;
      updateData.status = status || order.status;
      
      if (startDate) {
        updateData.startDate = new Date(startDate);
      }
      
      if (endDate) {
        updateData.endDate = new Date(endDate);
      } else if (startDate && !endDate) {
        // If startDate is updated but endDate is not, recalculate endDate based on variant
        const variant = await prisma.productVariant.findUnique({ where: { id: order.variantId } });
        if (variant) {
          updateData.endDate = calculateEndDate(new Date(startDate), variant.durationValue, variant.durationUnit);
        }
      }

      if (customPrice !== undefined) {
        updateData.customPrice = customPrice === '' ? null : parseFloat(customPrice);
      }

      if (importPrice !== undefined) {
        updateData.importPrice = importPrice === '' || importPrice === null ? null : parseFloat(importPrice);
      }

      if (supplierId !== undefined) {
        updateData.supplierId = supplierId === '' ? null : supplierId;
      }
    } else {
      // User can only update order status to 'cancelled' (if new/processing) or update their note
      if (status === 'cancelled') {
        if (order.status === 'new' || order.status === 'processing') {
          updateData.status = 'cancelled';
        } else {
          return NextResponse.json(
            { error: 'Không thể hủy đơn hàng khi dịch vụ đang hoạt động hoặc đã hết hạn.' },
            { status: 400 }
          );
        }
      }
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

    const newValues = {
      status: updatedOrder.status,
      startDate: updatedOrder.startDate,
      endDate: updatedOrder.endDate,
      price: updatedOrder.price,
      customPrice: updatedOrder.customPrice,
      importPrice: updatedOrder.importPrice,
      amountPaid: updatedOrder.amountPaid,
      note: updatedOrder.note,
      internalNote: updatedOrder.internalNote,
      supplierId: updatedOrder.supplierId
    };

    let action = 'UPDATE_ORDER';
    let actionLabel = 'Sửa đơn hàng';
    if (order.status !== updatedOrder.status) {
      action = 'CHANGE_ORDER_STATUS';
      actionLabel = 'Thay đổi trạng thái đơn hàng';
    }

    await createAuditLog({
      action,
      actionLabel,
      module: 'orders',
      entityType: 'Order',
      entityId: id,
      entityName: updatedOrder.orderCode,
      description: `Đã cập nhật đơn hàng ${updatedOrder.orderCode} (${actionLabel})`,
      oldValues,
      newValues,
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

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
    }

    // Delete order (OrderRenewals and EmailLogs have cascade/restrict behavior)
    // First, clean up renewals for this order
    await prisma.orderRenewal.deleteMany({
      where: { orderId: id },
    });

    // Clean up email logs for this order
    await prisma.emailLog.deleteMany({
      where: { orderId: id },
    });

    await prisma.order.delete({
      where: { id },
    });

    await createAuditLog({
      action: 'DELETE_ORDER',
      actionLabel: 'Xóa đơn hàng',
      module: 'orders',
      entityType: 'Order',
      entityId: id,
      entityName: order.orderCode,
      description: `Đã xóa đơn hàng: ${order.orderCode}`,
      oldValues: {
        id: order.id,
        orderCode: order.orderCode,
        price: order.price,
        customPrice: order.customPrice,
        status: order.status
      },
      request: req,
      status: 'success'
    });

    return NextResponse.json({ message: 'Xóa đơn hàng thành công!' });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: 'Lỗi xóa đơn hàng.' }, { status: 500 });
  }
}

