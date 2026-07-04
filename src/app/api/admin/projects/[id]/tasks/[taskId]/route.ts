import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// PUT: Update task details (title, description, assignee, deadline, priority, tags)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const { id: projectId, taskId } = await params;
    const body = await req.json();
    const { title, description, assignee, deadline, priority, tags, columnId } = body;

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask || existingTask.projectId !== projectId) {
      return NextResponse.json({ error: 'Không tìm thấy công việc.' }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: title !== undefined ? title.trim() : existingTask.title,
        description: description !== undefined ? (description ? description.trim() : null) : existingTask.description,
        assignee: assignee !== undefined ? (assignee ? assignee.trim() : null) : existingTask.assignee,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : existingTask.deadline,
        priority: priority !== undefined ? priority : existingTask.priority,
        tags: tags !== undefined ? (tags ? tags.trim() : null) : existingTask.tags,
        columnId: columnId !== undefined ? columnId : existingTask.columnId,
      },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'TASK_UPDATE',
      actionLabel: 'Cập nhật công việc',
      module: 'projects',
      entityType: 'Task',
      entityId: taskId,
      entityName: updatedTask.title,
      description: `Cập nhật công việc "${updatedTask.title}"`,
      request: req,
      status: 'success',
      oldValues: existingTask,
      newValues: updatedTask,
    });

    return NextResponse.json({ task: updatedTask, message: 'Cập nhật công việc thành công!' });
  } catch (error) {
    console.error('PUT task details error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật công việc.' }, { status: 500 });
  }
}

// DELETE: Delete task from column, then shift positions of remaining tasks down
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const { id: projectId, taskId } = await params;

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask || existingTask.projectId !== projectId) {
      return NextResponse.json({ error: 'Không tìm thấy công việc.' }, { status: 404 });
    }

    // Delete task
    await prisma.task.delete({
      where: { id: taskId },
    });

    // Shift positions of other tasks in the same column down
    const remainingTasks = await prisma.task.findMany({
      where: { columnId: existingTask.columnId },
      orderBy: { position: 'asc' },
    });

    await prisma.$transaction(
      remainingTasks.map((t, idx) =>
        prisma.task.update({
          where: { id: t.id },
          data: { position: idx },
        })
      )
    );

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'TASK_DELETE',
      actionLabel: 'Xóa công việc',
      module: 'projects',
      entityType: 'Task',
      entityId: taskId,
      entityName: existingTask.title,
      description: `Xóa công việc "${existingTask.title}"`,
      request: req,
      status: 'success',
      oldValues: existingTask,
    });

    return NextResponse.json({ message: 'Xóa công việc thành công!' });
  } catch (error) {
    console.error('DELETE task error:', error);
    return NextResponse.json({ error: 'Lỗi xóa công việc.' }, { status: 500 });
  }
}
