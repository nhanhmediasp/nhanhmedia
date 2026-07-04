import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST: Add a new column to the Kanban board
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên cột là bắt buộc.' }, { status: 400 });
    }

    const columnsCount = await prisma.taskColumn.count({
      where: { projectId },
    });

    const newColumn = await prisma.taskColumn.create({
      data: {
        projectId,
        name: name.trim(),
        position: columnsCount,
      },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'COLUMN_CREATE',
      actionLabel: 'Tạo cột công việc',
      module: 'projects',
      entityType: 'TaskColumn',
      entityId: newColumn.id,
      entityName: newColumn.name,
      description: `Tạo cột Kanban mới "${newColumn.name}"`,
      request: req,
      status: 'success',
      newValues: newColumn,
    });

    return NextResponse.json({ column: newColumn, message: 'Thêm cột thành công!' });
  } catch (error) {
    console.error('POST column error:', error);
    return NextResponse.json({ error: 'Lỗi thêm cột mới.' }, { status: 500 });
  }
}
