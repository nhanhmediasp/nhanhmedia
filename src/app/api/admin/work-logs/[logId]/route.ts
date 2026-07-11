import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function PUT(req: Request, context: { params: Promise<{ logId: string }> }) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';

  try {
    const { logId } = await context.params;
    const body = await req.json();
    const { title, description, hours, hourlyRate, websiteUrl, status, date, projectId, categoryId, customerId } = body;

    if (!title || !hours || !date) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc.' }, { status: 400 });
    }

    const existingWorkLog = await prisma.projectWorkLog.findUnique({ where: { id: logId } });
    if (!existingWorkLog) {
      return NextResponse.json({ error: 'Không tìm thấy nhật ký làm việc.' }, { status: 404 });
    }

    const updatedWorkLog = await prisma.projectWorkLog.update({
      where: { id: logId },
      data: {
        title,
        description: description || null,
        hours: parseFloat(hours),
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
        websiteUrl: websiteUrl || null,
        status: status || 'completed',
        date: new Date(date),
        projectId: (projectId && projectId !== '') ? projectId : null,
        categoryId: (categoryId && categoryId !== '') ? categoryId : null,
        customerId: (customerId && customerId !== '') ? customerId : null,
      },
      include: {
        project: true,
        category: true,
        customer: true,
      },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: '', role: 'admin' },
      action: 'WORKLOG_UPDATE',
      actionLabel: 'Cập nhật nhật ký công việc',
      module: 'projects',
      entityType: 'ProjectWorkLog',
      entityId: logId,
      entityName: updatedWorkLog.title,
      description: `Đã cập nhật nhật ký làm việc: ${updatedWorkLog.title}`,
      request: req,
      status: 'success',
      oldValues: existingWorkLog,
      newValues: updatedWorkLog,
    });

    return NextResponse.json({ workLog: updatedWorkLog, message: 'Cập nhật nhật ký công việc thành công!' });
  } catch (error) {
    console.error('PUT work-logs error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật nhật ký công việc.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ logId: string }> }) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';

  try {
    const { logId } = await context.params;

    const workLog = await prisma.projectWorkLog.findUnique({ where: { id: logId } });
    if (!workLog) {
      return NextResponse.json({ error: 'Không tìm thấy nhật ký.' }, { status: 404 });
    }

    await prisma.projectWorkLog.delete({ where: { id: logId } });

    await createAuditLog({
      actor: { id: userId, name: userName, email: '', role: 'admin' },
      action: 'WORKLOG_DELETE',
      actionLabel: 'Xóa nhật ký công việc',
      module: 'projects',
      entityType: 'ProjectWorkLog',
      entityId: logId,
      entityName: workLog.title,
      description: `Đã xóa nhật ký làm việc: ${workLog.title}`,
      request: req,
      status: 'success',
    });

    return NextResponse.json({ success: true, message: 'Xóa nhật ký thành công.' });
  } catch (error) {
    console.error('DELETE work-logs error:', error);
    return NextResponse.json({ error: 'Lỗi xóa nhật ký công việc.' }, { status: 500 });
  }
}
