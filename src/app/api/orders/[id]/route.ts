import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateEndDate } from '../route';

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

    // Hide importPrice from non-admin
    if (!isAdmin) {
      const { importPrice, ...rest } = order as any;
      return NextResponse.json({ order: rest });
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
    const { status, startDate, endDate, note, internalNote, customPrice, importPrice, amountPaid, supplierId } = body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
    }

    const isAdmin = role === 'admin';

    if (!isAdmin && order.createdByUserId !== userId) {
      return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa đơn hàng này.' }, { status: 403 });
    }

    const updateData: any = {
      note: note !== undefined ? (note ? note.trim() : null) : order.note,
    };

    if (amountPaid !== undefined) {
      updateData.amountPaid = amountPaid === '' || amountPaid === null ? 0 : parseFloat(amountPaid);
    }

    if (isAdmin) {
      updateData.internalNote = internalNote !== undefined ? (internalNote ? internalNote.trim() : null) : order.internalNote;
      updateData.status = status || order.status;

      if (startDate) {
        updateData.startDate = new Date(startDate);
      }

      if (endDate) {
        updateData.endDate = new Date(endDate);
      } else if (startDate && !endDate) {
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
        updateData.supplierId = supplierId === '' || supplierId === null ? null : supplierId;
      }
    } else {
      // Non-admin: can only cancel (if new/processing) or update note
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

    // Hide importPrice from non-admin
    if (!isAdmin) {
      const { importPrice: _, ...rest } = updatedOrder as any;
      return NextResponse.json({
        message: 'Cập nhật đơn hàng thành công!',
        order: rest,
      });
    }

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
