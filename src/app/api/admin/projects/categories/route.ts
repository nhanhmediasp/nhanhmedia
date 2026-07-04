import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const categories = await prisma.projectCategory.findMany({
      include: {
        projects: {
          include: {
            websiteCosts: { select: { amount: true } },
            toolCosts: { select: { cost: true } }
          }
        },
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedCategories = categories.map((cat) => {
      let totalSpent = 0;
      cat.projects.forEach((proj) => {
        const webCosts = proj.websiteCosts.reduce((sum, item) => sum + item.amount, 0);
        const toolCosts = proj.toolCosts.reduce((sum, item) => sum + item.cost, 0);
        totalSpent += (webCosts + toolCosts);
      });

      const formattedProjects = cat.projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        startDate: p.startDate,
      }));

      return {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        createdAt: cat.createdAt,
        projects: formattedProjects,
        totalSpent,
        _count: cat._count,
      };
    });

    return NextResponse.json({ categories: formattedCategories });
  } catch (error) {
    console.error('GET project categories error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách phân loại dự án.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const body = await req.json();
    const { name, icon, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên phân loại là bắt buộc.' }, { status: 400 });
    }

    const existing = await prisma.projectCategory.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'Tên phân loại này đã tồn tại.' }, { status: 400 });
    }

    const newCategory = await prisma.projectCategory.create({
      data: {
        name: name.trim(),
        icon: icon || 'Folder',
        color: color || 'purple',
      },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'PROJECT_CATEGORY_CREATE',
      actionLabel: 'Tạo phân loại dự án',
      module: 'projects',
      entityType: 'ProjectCategory',
      entityId: newCategory.id,
      entityName: newCategory.name,
      description: `Tạo phân loại dự án mới: ${newCategory.name}`,
      request: req,
      status: 'success',
      newValues: newCategory,
    });

    return NextResponse.json({ category: newCategory, message: 'Tạo phân loại dự án thành công!' });
  } catch (error) {
    console.error('POST project categories error:', error);
    return NextResponse.json({ error: 'Lỗi tạo phân loại dự án.' }, { status: 500 });
  }
}
