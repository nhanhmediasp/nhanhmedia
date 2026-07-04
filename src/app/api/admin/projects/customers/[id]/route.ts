import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const customer = await prisma.projectCustomer.findUnique({
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

    if (!customer) {
      return NextResponse.json({ error: 'Không tìm thấy khách hàng dự án.' }, { status: 404 });
    }

    // Format projects to calculate cost & progress
    const formattedProjects = customer.projects.map((p) => {
      const totalTasks = p.tasks.length;
      let completedTasks = 0;
      p.tasks.forEach((t) => {
        if (t.column.name.toLowerCase() === 'hoàn thành') {
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
      ...customer,
      projects: formattedProjects,
    };

    return NextResponse.json({ customer: result });
  } catch (error) {
    console.error('GET specific project customer error:', error);
    return NextResponse.json({ error: 'Lỗi tải thông tin khách hàng dự án.' }, { status: 500 });
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
    const { name, phone, zalo, facebook, email, note } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên khách hàng là bắt buộc.' }, { status: 400 });
    }

    const oldCustomer = await prisma.projectCustomer.findUnique({ where: { id } });
    if (!oldCustomer) {
      return NextResponse.json({ error: 'Không tìm thấy khách hàng dự án.' }, { status: 404 });
    }

    const updatedCustomer = await prisma.projectCustomer.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        zalo: zalo ? zalo.trim() : null,
        facebook: facebook ? facebook.trim() : null,
        email: email ? email.trim() : null,
        note: note ? note.trim() : null,
      },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_CUSTOMER_UPDATE',
      actionLabel: 'Cập nhật khách hàng dự án',
      module: 'projects',
      entityType: 'ProjectCustomer',
      entityId: id,
      entityName: updatedCustomer.name,
      description: `Cập nhật khách hàng dự án: ${updatedCustomer.name}`,
      request: req,
      status: 'success',
      oldValues: oldCustomer,
      newValues: updatedCustomer,
    });

    return NextResponse.json({ customer: updatedCustomer, message: 'Cập nhật thành công!' });
  } catch (error) {
    console.error('PUT project customer error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật khách hàng dự án.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';
  const { id } = await params;

  try {
    const customer = await prisma.projectCustomer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Không tìm thấy khách hàng dự án.' }, { status: 404 });
    }

    await prisma.projectCustomer.delete({
      where: { id },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_CUSTOMER_DELETE',
      actionLabel: 'Xóa khách hàng dự án',
      module: 'projects',
      entityType: 'ProjectCustomer',
      entityId: id,
      entityName: customer.name,
      description: `Xóa khách hàng dự án: ${customer.name}`,
      request: req,
      status: 'success',
      oldValues: customer,
    });

    return NextResponse.json({ message: 'Xóa khách hàng dự án thành công!' });
  } catch (error) {
    console.error('DELETE project customer error:', error);
    return NextResponse.json({ error: 'Lỗi xóa khách hàng dự án.' }, { status: 500 });
  }
}
