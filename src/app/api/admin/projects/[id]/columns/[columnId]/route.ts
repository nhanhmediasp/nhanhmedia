import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// PUT: Rename column or update position
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const { id: projectId, columnId } = await params;
    const body = await req.json();
    const { name, position } = body;

    const existingColumn = await prisma.taskColumn.findUnique({
      where: { id: columnId },
    });

    if (!existingColumn || existingColumn.projectId !== projectId) {
      return NextResponse.json({ error: 'Không tìm thấy cột công việc.' }, { status: 404 });
    }

    const updatedColumn = await prisma.taskColumn.update({
      where: { id: columnId },
      data: {
        name: name !== undefined ? name.trim() : existingColumn.name,
        position: position !== undefined ? position : existingColumn.position,
      },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'COLUMN_UPDATE',
      actionLabel: 'Cập nhật cột công việc',
      module: 'projects',
      entityType: 'TaskColumn',
      entityId: columnId,
      entityName: updatedColumn.name,
      description: `Cập nhật cột Kanban: "${updatedColumn.name}"`,
      request: req,
      status: 'success',
      oldValues: existingColumn,
      newValues: updatedColumn,
    });

    return NextResponse.json({ column: updatedColumn, message: 'Cập nhật cột thành công!' });
  } catch (error) {
    console.error('PUT column error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật cột.' }, { status: 500 });
  }
}

// DELETE: Delete a column and its tasks
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; columnId: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const { id: projectId, columnId } = await params;

    const existingColumn = await prisma.taskColumn.findUnique({
      where: { id: columnId },
    });

    if (!existingColumn || existingColumn.projectId !== projectId) {
      return NextResponse.json({ error: 'Không tìm thấy cột công việc.' }, { status: 404 });
    }

    // Delete column (Prisma cascade delete will remove tasks in this column)
    await prisma.taskColumn.delete({
      where: { id: columnId },
    });

    // Shift positions of other columns down
    const remainingCols = await prisma.taskColumn.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });

    await prisma.$transaction(
      remainingCols.map((c, idx) =>
        prisma.taskColumn.update({
          where: { id: c.id },
          data: { position: idx },
        })
      )
    );

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'COLUMN_DELETE',
      actionLabel: 'Xóa cột công việc',
      module: 'projects',
      entityType: 'TaskColumn',
      entityId: columnId,
      entityName: existingColumn.name,
      description: `Xóa cột Kanban "${existingColumn.name}" và các công việc liên quan`,
      request: req,
      status: 'success',
      oldValues: existingColumn,
    });

    return NextResponse.json({ message: 'Xóa cột thành công!' });
  } catch (error) {
    console.error('DELETE column error:', error);
    return NextResponse.json({ error: 'Lỗi xóa cột.' }, { status: 500 });
  }
}
