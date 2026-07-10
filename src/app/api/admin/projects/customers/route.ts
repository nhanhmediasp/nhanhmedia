import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const customers = await prisma.projectCustomer.findMany({
      include: {
        projects: {
          include: {
            websiteCosts: {
              select: { amount: true }
            },
            toolCosts: {
              select: { cost: true }
            }
          }
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedCustomers = customers.map((c) => {
      let totalSpent = 0;
      let totalBudget = 0;
      let totalPaid = 0;
      let completedProjects = 0;

      c.projects.forEach((proj) => {
        const webCosts = proj.websiteCosts.reduce((sum, item) => sum + item.amount, 0);
        const toolCosts = proj.toolCosts.reduce((sum, item) => sum + item.cost, 0);
        totalSpent += (webCosts + toolCosts);
        totalBudget += proj.budget || 0;
        totalPaid += proj.amountReceived || 0;
        if (proj.status === 'completed') {
          completedProjects++;
        }
      });

      const totalDebt = Math.max(0, totalBudget - totalPaid);

      // auto rating logic
      let rating = 4;
      if (totalDebt > 0) rating -= 1;
      if (totalDebt > 0 && completedProjects > 0) rating -= 1; // Completed but unpaid debt
      if (totalPaid > 50000000) rating += 1;
      rating = Math.max(1, Math.min(5, rating));

      // vipStatus
      let vipStatus = 'standard';
      if (totalPaid > 50000000) {
        vipStatus = 'vip';
      } else if (totalPaid > 15000000) {
        vipStatus = 'loyal';
      }

      const formattedProjects = c.projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        startDate: p.startDate,
      }));

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        zalo: c.zalo,
        facebook: c.facebook,
        note: c.note,
        avatarUrl: c.avatarUrl,
        source: c.source,
        manualRating: c.manualRating,
        internalNotes: c.internalNotes,
        createdAt: c.createdAt,
        projects: formattedProjects,
        totalSpent,
        totalBudget,
        totalPaid,
        totalDebt,
        autoRating: rating,
        vipStatus,
        _count: c._count,
      };
    });

    return NextResponse.json({ customers: formattedCustomers });
  } catch (error) {
    console.error('GET project customers error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách khách hàng dự án.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const body = await req.json();
    const { name, phone, zalo, facebook, email, note, avatarUrl, source, manualRating, internalNotes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên khách hàng là bắt buộc.' }, { status: 400 });
    }

    const newCustomer = await prisma.projectCustomer.create({
      data: {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        zalo: zalo ? zalo.trim() : null,
        facebook: facebook ? facebook.trim() : null,
        email: email ? email.trim() : null,
        note: note ? note.trim() : null,
        avatarUrl: avatarUrl ? avatarUrl.trim() : null,
        source: source ? source.trim() : null,
        manualRating: manualRating ? Number(manualRating) : null,
        internalNotes: internalNotes ? internalNotes.trim() : null,
      },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_CUSTOMER_CREATE',
      actionLabel: 'Tạo khách hàng dự án',
      module: 'projects',
      entityType: 'ProjectCustomer',
      entityId: newCustomer.id,
      entityName: newCustomer.name,
      description: `Tạo khách hàng dự án mới: ${newCustomer.name}`,
      request: req,
      status: 'success',
      newValues: newCustomer,
    });

    return NextResponse.json({ customer: newCustomer, message: 'Thêm khách hàng dự án thành công!' });
  } catch (error) {
    console.error('POST project customer error:', error);
    return NextResponse.json({ error: 'Lỗi thêm khách hàng dự án.' }, { status: 500 });
  }
}
