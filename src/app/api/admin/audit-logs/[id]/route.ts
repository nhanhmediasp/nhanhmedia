import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userRole = req.headers.get('x-user-role');
    
    // Authorization Check: Only Admin allowed
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền xem chi tiết nhật ký.' }, { status: 403 });
    }

    const { id } = await params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      return NextResponse.json({ error: 'Nhật ký hoạt động không tồn tại.' }, { status: 404 });
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Get audit log detail error:', error);
    return NextResponse.json({ error: 'Lỗi tải chi tiết nhật ký hoạt động.' }, { status: 500 });
  }
}
