import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Xóa thông báo thành công!' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json({ error: 'Lỗi xóa thông báo.' }, { status: 500 });
  }
}
