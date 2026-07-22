import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { notifyTelegramAdmin } from '@/lib/telegram';

// GET: Fetch all projects with progress and total cost calculations
export async function GET(req: Request) {
  try {
    const projects = await prisma.project.findMany({
      include: {
        category: true,
        customer: true,
        tasks: {
          include: {
            column: true,
          },
        },
        websiteCosts: true,
        toolCosts: true,
        columns: true,
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedProjects = projects.map((p) => {
      // 1. Calculate progress
      const totalTasks = p.tasks.length;
      let completedTasks = 0;
      p.tasks.forEach((t) => {
        const colName = t.column.name.toLowerCase();
        if (colName === 'hoàn thành' || colName === 'đã làm') {
          completedTasks++;
        }
      });
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 10) / 10 : 0;

      // 2. Calculate total website cost
      const totalWebsiteCost = p.websiteCosts.reduce((sum, item) => sum + item.amount, 0);

      // 3. Calculate total tool cost (simple sum of all tool costs, or cycle-based if needed, but for simplicity of total incurred cost, we sum them)
      const totalToolCost = p.toolCosts.reduce((sum, item) => sum + item.cost, 0);

      const totalCost = totalWebsiteCost + totalToolCost;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        progress,
        totalCost,
        budget: p.budget,
        categoryId: p.categoryId,
        category: p.category,
        customerId: p.customerId,
        customer: p.customer,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        websiteUrl: p.websiteUrl,
        members: p.members,
      };
    });

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error('GET projects admin error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách dự án.' }, { status: 500 });
  }
}

// POST: Create a new project with 3 default Kanban columns (Cần làm, Đang làm, Hoàn thành)
export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const body = await req.json();
    const { name, description, startDate, endDate, status, categoryId, customerId, websiteUrl, memberIds } = body;

    if (!name || !startDate) {
      return NextResponse.json({ error: 'Tên dự án và Ngày bắt đầu là bắt buộc.' }, { status: 400 });
    }

    const newProject = await prisma.$transaction(async (tx) => {
      // 1. Create project
      const project = await tx.project.create({
        data: {
          name: name.trim(),
          description: description ? description.trim() : null,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          status: status || 'running',
          categoryId: categoryId || null,
          customerId: customerId || null,
          websiteUrl: websiteUrl ? websiteUrl.trim() : null,
          progress: 0,
          budget: 0,
          members: {
            connect: memberIds && Array.isArray(memberIds)
              ? memberIds.map((id: string) => ({ id }))
              : [],
          },
        },
      });

      // 2. Create default columns
      const defaultColumns = ['Cần làm', 'Chưa làm', 'Đang làm', 'Đã làm'];
      for (let i = 0; i < defaultColumns.length; i++) {
        await tx.taskColumn.create({
          data: {
            projectId: project.id,
            name: defaultColumns[i],
            position: i,
          },
        });
      }

      return project;
    });

    // 3. Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_CREATE',
      actionLabel: 'Tạo dự án mới',
      module: 'projects',
      entityType: 'Project',
      entityId: newProject.id,
      entityName: newProject.name,
      description: `Tạo dự án mới: ${newProject.name}`,
      request: req,
      status: 'success',
      newValues: newProject,
    });

    // Notify Telegram Admin about new project creation
    const projMsg = `<b>📂 DỰ ÁN MỚI ĐƯỢC TẠO</b>\n\n` +
      `📌 <b>Tên dự án:</b> <b>${newProject.name}</b>\n` +
      `📅 <b>Ngày bắt đầu:</b> ${new Date(newProject.startDate).toLocaleDateString('vi-VN')}\n` +
      `${newProject.endDate ? `🎯 <b>Hạn hoàn thành:</b> ${new Date(newProject.endDate).toLocaleDateString('vi-VN')}\n` : ''}` +
      `⚙️ <b>Trạng thái:</b> 🟢 Đang chạy`;

    notifyTelegramAdmin(projMsg).catch(() => {});

    return NextResponse.json({ project: newProject, message: 'Tạo dự án thành công!' });
  } catch (error) {
    console.error('POST project admin error:', error);
    return NextResponse.json({ error: 'Lỗi tạo dự án mới.' }, { status: 500 });
  }
}
