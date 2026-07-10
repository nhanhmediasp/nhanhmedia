import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function DELETE(req: Request, context: { params: { id: string; logId: string } }) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';

  try {
    const { logId } = context.params;

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
    console.error('DELETE project work-logs error:', error);
    return NextResponse.json({ error: 'Lỗi xóa nhật ký công việc.' }, { status: 500 });
  }
}
