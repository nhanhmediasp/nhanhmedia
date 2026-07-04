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
    const { name, description, startDate, endDate, status, categoryId, customerId } = body;

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
      },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_UPDATE',
      actionLabel: 'Cập nhật dự án',
      module: 'projects',
      entityType: 'Project',
      entityId: updatedProject.id,
      entityName: updatedProject.name,
      description: `Cập nhật dự án: ${updatedProject.name}`,
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
