import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// GET: Fetch project details including columns, tasks, website costs, and tool costs
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        category: true,
        customer: true,
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
            },
          },
        },
        websiteCosts: {
          orderBy: { date: 'desc' },
        },
        toolCosts: {
          orderBy: { createdAt: 'desc' },
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            phone: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('GET project detail admin error:', error);
    return NextResponse.json({ error: 'Lỗi tải chi tiết dự án.' }, { status: 500 });
  }
}

// PUT: Update project details
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, startDate, endDate, status, categoryId, customerId, budget, amountReceived, websiteUrl, memberIds } = body;

    if (!name || !startDate) {
      return NextResponse.json({ error: 'Tên dự án và Ngày bắt đầu là bắt buộc.' }, { status: 400 });
    }

    const existingProject = await prisma.project.findUnique({ where: { id } });
    if (!existingProject) {
      return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'running',
        categoryId: categoryId || null,
        customerId: customerId || null,
        budget: budget !== undefined ? parseFloat(budget) : undefined,
        amountReceived: amountReceived !== undefined ? parseFloat(amountReceived) : undefined,
        websiteUrl: websiteUrl !== undefined ? (websiteUrl ? websiteUrl.trim() : null) : undefined,
        members: memberIds !== undefined ? {
          set: memberIds.map((id: string) => ({ id }))
        } : undefined,
      },
    });

    // Build a detailed description of what changed
    const changes: string[] = [];
    if (existingProject.name !== updatedProject.name) {
      changes.push(`tên từ "${existingProject.name}" thành "${updatedProject.name}"`);
    }
    if (existingProject.status !== updatedProject.status) {
      const statusLabels: Record<string, string> = { running: 'Đang chạy', completed: 'Hoàn thành', paused: 'Tạm dừng' };
      const oldLbl = statusLabels[existingProject.status] || existingProject.status;
      const newLbl = statusLabels[updatedProject.status] || updatedProject.status;
      changes.push(`trạng thái từ "${oldLbl}" thành "${newLbl}"`);
    }
    if (existingProject.budget !== updatedProject.budget) {
      changes.push(`ngân sách từ ${existingProject.budget.toLocaleString('vi-VN')}đ thành ${updatedProject.budget.toLocaleString('vi-VN')}đ`);
    }
    if (existingProject.amountReceived !== updatedProject.amountReceived) {
      changes.push(`đã nhận từ ${existingProject.amountReceived.toLocaleString('vi-VN')}đ thành ${updatedProject.amountReceived.toLocaleString('vi-VN')}đ`);
    }
    if (existingProject.description !== updatedProject.description) {
      changes.push(`mô tả`);
    }
    if (existingProject.websiteUrl !== updatedProject.websiteUrl) {
      changes.push(`website từ "${existingProject.websiteUrl || ''}" thành "${updatedProject.websiteUrl || ''}"`);
    }
    if (existingProject.startDate?.toISOString() !== updatedProject.startDate?.toISOString()) {
      changes.push(`ngày bắt đầu`);
    }
    if (existingProject.endDate?.toISOString() !== updatedProject.endDate?.toISOString()) {
      changes.push(`ngày kết thúc`);
    }

    const detailedDescription = changes.length > 0
      ? `Cập nhật dự án "${updatedProject.name}": Thay đổi ${changes.join(', ')}`
      : `Cập nhật thông tin dự án: ${updatedProject.name}`;

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_UPDATE',
      actionLabel: 'Cập nhật dự án',
      module: 'projects',
      entityType: 'Project',
      entityId: updatedProject.id,
      entityName: updatedProject.name,
      description: detailedDescription,
      request: req,
      status: 'success',
      oldValues: existingProject,
      newValues: updatedProject,
    });

    return NextResponse.json({ project: updatedProject, message: 'Cập nhật dự án thành công!' });
  } catch (error) {
    console.error('PUT project admin error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật dự án.' }, { status: 500 });
  }
}

// DELETE: Delete project and all related data (cascade delete handled by DB relations)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const { id } = await params;

    const existingProject = await prisma.project.findUnique({ where: { id } });
    if (!existingProject) {
      return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
    }

    await prisma.project.delete({
      where: { id },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_DELETE',
      actionLabel: 'Xóa dự án',
      module: 'projects',
      entityType: 'Project',
      entityId: id,
      entityName: existingProject.name,
      description: `Xóa dự án: ${existingProject.name} và toàn bộ dữ liệu liên quan`,
      request: req,
      status: 'success',
      oldValues: existingProject,
    });

    return NextResponse.json({ message: 'Xóa dự án thành công!' });
  } catch (error) {
    console.error('DELETE project admin error:', error);
    return NextResponse.json({ error: 'Lỗi xóa dự án.' }, { status: 500 });
  }
}
