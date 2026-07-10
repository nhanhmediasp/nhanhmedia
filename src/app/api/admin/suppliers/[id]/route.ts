import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            customer: true,
            product: true,
            variant: true,
            createdByUser: {
              select: { name: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Nguồn hàng không tồn tại.' }, { status: 404 });
    }

    let totalRevenue = 0;
    let totalCost = 0;
    let cancelledCount = 0;
    let totalRefundAmount = 0;
    const orderCount = supplier.orders.length;

    supplier.orders.forEach(o => {
      totalRevenue += (o.customPrice !== null ? o.customPrice : o.price);
      totalCost += (o.importPrice || 0);
      if (o.status === 'cancelled') {
        cancelledCount++;
      }
      totalRefundAmount += (o.refundAmount || 0);
    });

    let rating = 4;
    if (orderCount > 0) {
      const cancelRate = cancelledCount / orderCount;
      if (cancelRate > 0.3) {
        rating -= 2;
      } else if (cancelRate > 0.1) {
        rating -= 1;
      }
      if (totalRefundAmount > totalRevenue * 0.2) {
        rating -= 1;
      }
    }
    if (orderCount >= 10 && cancelledCount === 0) {
      rating += 1;
    }
    rating = Math.max(1, Math.min(5, rating));

    const result = {
      ...supplier,
      totalRevenue,
      totalCost,
      cancelledCount,
      totalRefundAmount,
      autoRating: rating,
    };

    return NextResponse.json({ supplier: result });
  } catch (error) {
    console.error('Get supplier detail error:', error);
    return NextResponse.json({ error: 'Lỗi tải chi tiết nguồn hàng.' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, contactUrl, icon, manualRating, internalNotes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên nguồn hàng là bắt buộc.' }, { status: 400 });
    }

    const existing = await prisma.supplier.findFirst({
      where: {
        name: name.trim(),
        id: { not: id }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Tên nguồn hàng này đã được sử dụng.' }, { status: 400 });
    }

    const oldSupplier = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!oldSupplier) {
      return NextResponse.json({ error: 'Nguồn hàng không tồn tại.' }, { status: 404 });
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name.trim(),
        contactUrl: contactUrl ? contactUrl.trim() : null,
        icon: icon !== undefined ? (icon ? icon.trim() : null) : undefined,
        manualRating: manualRating !== undefined ? (manualRating ? Number(manualRating) : null) : undefined,
        internalNotes: internalNotes !== undefined ? (internalNotes ? internalNotes.trim() : null) : undefined,
      }
    });

    await createAuditLog({
      action: 'UPDATE_SUPPLIER',
      actionLabel: 'Cập nhật nguồn hàng',
      module: 'suppliers',
      entityType: 'Supplier',
      entityId: id,
      entityName: updatedSupplier.name,
      description: `Đã cập nhật thông tin nguồn hàng "${updatedSupplier.name}"`,
      oldValues: oldSupplier,
      newValues: updatedSupplier,
      request: req,
      status: 'success'
    });

    return NextResponse.json({ message: 'Cập nhật nguồn hàng thành công!', supplier: updatedSupplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật nguồn hàng.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supplierToDelete = await prisma.supplier.findUnique({
      where: { id }
    });

    if (!supplierToDelete) {
      return NextResponse.json({ error: 'Nguồn hàng không tồn tại.' }, { status: 404 });
    }

    await prisma.supplier.delete({
      where: { id }
    });

    await createAuditLog({
      action: 'DELETE_SUPPLIER',
      actionLabel: 'Xóa nguồn hàng',
      module: 'suppliers',
      entityType: 'Supplier',
      entityId: id,
      entityName: supplierToDelete.name,
      description: `Đã xóa nguồn hàng "${supplierToDelete.name}"`,
      oldValues: supplierToDelete,
      request: req,
      status: 'success'
    });

    return NextResponse.json({ message: 'Xóa nguồn hàng thành công!' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json({ error: 'Lỗi xóa nguồn hàng.' }, { status: 500 });
  }
}
