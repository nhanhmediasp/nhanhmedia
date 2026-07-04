import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST: Create a new task in a project column
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
    const { title, description, assignee, deadline, priority, tags, columnId } = body;

    if (!title || !columnId) {
      return NextResponse.json({ error: 'Tiêu đề và Cột công việc là bắt buộc.' }, { status: 400 });
    }

    // Check if column exists and belongs to the project
    const column = await prisma.taskColumn.findFirst({
      where: { id: columnId, projectId },
    });
    if (!column) {
      return NextResponse.json({ error: 'Cột công việc không hợp lệ.' }, { status: 400 });
    }

    // Get max position in the column
    const tasksCount = await prisma.task.count({
      where: { columnId },
    });

    const newTask = await prisma.task.create({
      data: {
        projectId,
        columnId,
        title: title.trim(),
        description: description ? description.trim() : null,
        assignee: assignee ? assignee.trim() : null,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority || 'medium',
        tags: tags ? tags.trim() : null,
        position: tasksCount,
      },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'TASK_CREATE',
      actionLabel: 'Tạo công việc',
      module: 'projects',
      entityType: 'Task',
      entityId: newTask.id,
      entityName: newTask.title,
      description: `Tạo công việc mới "${newTask.title}" trong cột "${column.name}"`,
      request: req,
      status: 'success',
      newValues: newTask,
    });

    return NextResponse.json({ task: newTask, message: 'Tạo công việc thành công!' });
  } catch (error) {
    console.error('POST task error:', error);
    return NextResponse.json({ error: 'Lỗi tạo công việc mới.' }, { status: 500 });
  }
}

// PUT: Reorder tasks in a column or move task between columns
export async function PUT(
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
    const { taskId, sourceColumnId, destColumnId, taskIds } = body;

    // Case 1: Reorder/update positions of tasks in a column
    if (taskIds && Array.isArray(taskIds) && destColumnId) {
      await prisma.$transaction(
        taskIds.map((taskId, index) =>
          prisma.task.update({
            where: { id: taskId },
            data: {
              columnId: destColumnId,
              position: index,
            },
          })
        )
      );

      return NextResponse.json({ message: 'Cập nhật vị trí công việc thành công!' });
    }

    // Case 2: Move a single task to a column at the end (fallback)
    if (taskId && destColumnId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return NextResponse.json({ error: 'Không tìm thấy công việc.' }, { status: 404 });
      }

      const tasksCount = await prisma.task.count({ where: { columnId: destColumnId } });

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          columnId: destColumnId,
          position: tasksCount,
        },
      });

      return NextResponse.json({ task: updated, message: 'Di chuyển công việc thành công!' });
    }

    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  } catch (error) {
    console.error('PUT tasks reorder error:', error);
    return NextResponse.json({ error: 'Lỗi sắp xếp công việc.' }, { status: 500 });
  }
}
