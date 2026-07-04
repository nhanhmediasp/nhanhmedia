import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST: Add a new software tool cost item
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
    const { name, purpose, plan, cost, billingCycle, nextRenewal, note } = body;

    if (!name || cost === undefined || !billingCycle) {
      return NextResponse.json({ error: 'Tên công cụ, chi phí và chu kỳ thanh toán là bắt buộc.' }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
    }

    const newToolCost = await prisma.toolCost.create({
      data: {
        projectId,
        name: name.trim(),
        purpose: purpose ? purpose.trim() : null,
        plan: plan || 'free',
        cost: parseFloat(cost) || 0,
        billingCycle,
        nextRenewal: nextRenewal ? new Date(nextRenewal) : null,
        note: note ? note.trim() : null,
      },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'TOOL_COST_CREATE',
      actionLabel: 'Thêm chi phí Công cụ',
      module: 'projects',
      entityType: 'ToolCost',
      entityId: newToolCost.id,
      entityName: newToolCost.name,
      description: `Thêm chi phí công cụ "${newToolCost.name}": ${newToolCost.cost} VND / ${newToolCost.billingCycle}`,
      request: req,
      status: 'success',
      newValues: newToolCost,
    });

    return NextResponse.json({ toolCost: newToolCost, message: 'Thêm công cụ thành công!' });
  } catch (error) {
    console.error('POST tool cost error:', error);
    return NextResponse.json({ error: 'Lỗi thêm công cụ mới.' }, { status: 500 });
  }
}
