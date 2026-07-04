import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

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
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedProjects = projects.map((p) => {
      // 1. Calculate progress
      const totalTasks = p.tasks.length;
      let completedTasks = 0;
      p.tasks.forEach((t) => {
        if (t.column.name.toLowerCase() === 'hoàn thành') {
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
        categoryId: p.categoryId,
        category: p.category,
        customerId: p.customerId,
        customer: p.customer,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
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
    const { name, description, startDate, endDate, status, categoryId, customerId } = body;

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
          progress: 0,
          budget: 0,
        },
      });

      // 2. Create default columns
      const defaultColumns = ['Cần làm', 'Đang làm', 'Hoàn thành'];
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

    return NextResponse.json({ project: newProject, message: 'Tạo dự án thành công!' });
  } catch (error) {
    console.error('POST project admin error:', error);
    return NextResponse.json({ error: 'Lỗi tạo dự án mới.' }, { status: 500 });
  }
}
