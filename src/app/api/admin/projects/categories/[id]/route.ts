import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const category = await prisma.projectCategory.findUnique({
      where: { id },
      include: {
        projects: {
          include: {
            tasks: {
              include: {
                column: true,
              },
            },
            websiteCosts: true,
            toolCosts: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Không tìm thấy phân loại dự án.' }, { status: 404 });
    }

    const formattedProjects = category.projects.map((p) => {
      const totalTasks = p.tasks.length;
      let completedTasks = 0;
      p.tasks.forEach((t) => {
        const colName = t.column.name.toLowerCase();
        if (colName === 'hoàn thành' || colName === 'đã làm') {
          completedTasks++;
        }
      });
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10 : 0;
      const totalWebsiteCost = p.websiteCosts.reduce((sum, item) => sum + item.amount, 0);
      const totalToolCost = p.toolCosts.reduce((sum, item) => sum + item.cost, 0);
      const totalCost = totalWebsiteCost + totalToolCost;

      return {
        id: p.id,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        progress,
        totalCost,
      };
    });

    const result = {
      ...category,
      projects: formattedProjects,
    };

    return NextResponse.json({ category: result });
  } catch (error) {
    console.error('GET specific project category error:', error);
    return NextResponse.json({ error: 'Lỗi tải thông tin phân loại dự án.' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';
  const { id } = await params;

  try {
    const body = await req.json();
    const { name, icon, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên phân loại là bắt buộc.' }, { status: 400 });
    }

    const existing = await prisma.projectCategory.findFirst({
      where: {
        name: name.trim(),
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Tên phân loại này đã được sử dụng.' }, { status: 400 });
    }

    const oldCategory = await prisma.projectCategory.findUnique({ where: { id } });
    if (!oldCategory) {
      return NextResponse.json({ error: 'Không tìm thấy phân loại dự án.' }, { status: 404 });
    }

    const updatedCategory = await prisma.projectCategory.update({
      where: { id },
      data: {
        name: name.trim(),
        icon: icon || 'Folder',
        color: color || 'purple',
      },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_CATEGORY_UPDATE',
      actionLabel: 'Cập nhật phân loại dự án',
      module: 'projects',
      entityType: 'ProjectCategory',
      entityId: id,
      entityName: updatedCategory.name,
      description: `Cập nhật phân loại dự án: ${updatedCategory.name}`,
      request: req,
      status: 'success',
      oldValues: oldCategory,
      newValues: updatedCategory,
    });

    return NextResponse.json({ category: updatedCategory, message: 'Cập nhật thành công!' });
  } catch (error) {
    console.error('PUT project category error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật phân loại dự án.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';
  const { id } = await params;

  try {
    const category = await prisma.projectCategory.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json({ error: 'Không tìm thấy phân loại dự án.' }, { status: 404 });
    }

    await prisma.projectCategory.delete({
      where: { id },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_CATEGORY_DELETE',
      actionLabel: 'Xóa phân loại dự án',
      module: 'projects',
      entityType: 'ProjectCategory',
      entityId: id,
      entityName: category.name,
      description: `Xóa phân loại dự án: ${category.name}`,
      request: req,
      status: 'success',
      oldValues: category,
    });

    return NextResponse.json({ message: 'Xóa phân loại dự án thành công!' });
  } catch (error) {
    console.error('DELETE project category error:', error);
    return NextResponse.json({ error: 'Lỗi xóa phân loại dự án.' }, { status: 500 });
  }
}
