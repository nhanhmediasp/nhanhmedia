import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';
  const { id, noteId } = await params;

  try {
    const body = await req.json();
    const { title, content, date, link } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Tiêu đề ghi chú là bắt buộc.' }, { status: 400 });
    }

    const oldNote = await prisma.projectRequirementNote.findUnique({
      where: { id: noteId },
    });

    if (!oldNote) {
      return NextResponse.json({ error: 'Không tìm thấy ghi chú yêu cầu.' }, { status: 404 });
    }

    const updatedNote = await prisma.projectRequirementNote.update({
      where: { id: noteId },
      data: {
        title: title.trim(),
        content: content ? content.trim() : '',
        link: link ? link.trim() : null,
        date: date ? new Date(date) : new Date(),
      },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_REQUIREMENT_NOTE_UPDATE',
      actionLabel: 'Cập nhật ghi chú yêu cầu khách hàng',
      module: 'projects',
      entityType: 'ProjectRequirementNote',
      entityId: noteId,
      entityName: updatedNote.title,
      description: `Cập nhật ghi chú yêu cầu: ${updatedNote.title} cho dự án ${id}`,
      request: req,
      status: 'success',
      oldValues: oldNote,
      newValues: updatedNote,
    });

    return NextResponse.json({ note: updatedNote, message: 'Cập nhật ghi chú yêu cầu thành công!' });
  } catch (error) {
    console.error('PUT project requirement note error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật ghi chú yêu cầu.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';
  const { id, noteId } = await params;

  try {
    const note = await prisma.projectRequirementNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      return NextResponse.json({ error: 'Không tìm thấy ghi chú yêu cầu.' }, { status: 404 });
    }

    await prisma.projectRequirementNote.delete({
      where: { id: noteId },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_REQUIREMENT_NOTE_DELETE',
      actionLabel: 'Xóa ghi chú yêu cầu khách hàng',
      module: 'projects',
      entityType: 'ProjectRequirementNote',
      entityId: noteId,
      entityName: note.title,
      description: `Xóa ghi chú yêu cầu: ${note.title} cho dự án ${id}`,
      request: req,
      status: 'success',
      oldValues: note,
    });

    return NextResponse.json({ message: 'Xóa ghi chú yêu cầu thành công!' });
  } catch (error) {
    console.error('DELETE project requirement note error:', error);
    return NextResponse.json({ error: 'Lỗi xóa ghi chú yêu cầu.' }, { status: 500 });
  }
}
