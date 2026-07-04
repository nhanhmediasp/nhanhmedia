import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const notes = await prisma.projectRequirementNote.findMany({
      where: { projectId: id },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('GET project requirement notes error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách ghi chú yêu cầu.' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';
  const { id } = await params;

  try {
    const body = await req.json();
    const { title, content, date, link } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Tiêu đề ghi chú là bắt buộc.' }, { status: 400 });
    }

    const note = await prisma.projectRequirementNote.create({
      data: {
        projectId: id,
        title: title.trim(),
        content: content ? content.trim() : '',
        link: link ? link.trim() : null,
        date: date ? new Date(date) : new Date(),
      },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_REQUIREMENT_NOTE_CREATE',
      actionLabel: 'Tạo ghi chú yêu cầu khách hàng',
      module: 'projects',
      entityType: 'ProjectRequirementNote',
      entityId: note.id,
      entityName: note.title,
      description: `Tạo ghi chú yêu cầu mới: ${note.title} cho dự án ${id}`,
      request: req,
      status: 'success',
      newValues: note,
    });

    return NextResponse.json({ note, message: 'Thêm ghi chú yêu cầu thành công!' });
  } catch (error) {
    console.error('POST project requirement note error:', error);
    return NextResponse.json({ error: 'Lỗi thêm ghi chú yêu cầu.' }, { status: 500 });
  }
}
