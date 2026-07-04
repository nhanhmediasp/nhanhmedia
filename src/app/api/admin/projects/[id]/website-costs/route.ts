import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST: Add a new website cost item
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
    const { name, type, amount, date, note } = body;

    if (!name || !type || amount === undefined) {
      return NextResponse.json({ error: 'Tên khoản chi, loại chi phí và số tiền là bắt buộc.' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
    }

    const newCost = await prisma.websiteCost.create({
      data: {
        projectId,
        name: name.trim(),
        type,
        amount: parseFloat(amount) || 0,
        date: date ? new Date(date) : new Date(),
        note: note ? note.trim() : null,
      },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'WEBSITE_COST_CREATE',
      actionLabel: 'Thêm chi phí Website',
      module: 'projects',
      entityType: 'WebsiteCost',
      entityId: newCost.id,
      entityName: newCost.name,
      description: `Thêm chi phí Website "${newCost.name}" (${newCost.type}): ${newCost.amount} VND`,
      request: req,
      status: 'success',
      newValues: newCost,
    });

    return NextResponse.json({ cost: newCost, message: 'Thêm chi phí thành công!' });
  } catch (error) {
    console.error('POST website cost error:', error);
    return NextResponse.json({ error: 'Lỗi thêm chi phí website mới.' }, { status: 500 });
  }
}
