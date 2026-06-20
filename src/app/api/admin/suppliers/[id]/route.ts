import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    return NextResponse.json({ supplier });
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
    const { name, contactUrl, icon } = body;

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

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name.trim(),
        contactUrl: contactUrl ? contactUrl.trim() : null,
        icon: icon !== undefined ? (icon ? icon.trim() : null) : undefined
      }
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

    await prisma.supplier.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Xóa nguồn hàng thành công!' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json({ error: 'Lỗi xóa nguồn hàng.' }, { status: 500 });
  }
}
