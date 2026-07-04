import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// PUT: Update a tool cost item
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; costId: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const { id: projectId, costId } = await params;
    const body = await req.json();
    const { name, purpose, plan, cost, billingCycle, nextRenewal, note } = body;

    const existingTool = await prisma.toolCost.findUnique({
      where: { id: costId },
    });

    if (!existingTool || existingTool.projectId !== projectId) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin công cụ.' }, { status: 404 });
    }

    const updatedTool = await prisma.toolCost.update({
      where: { id: costId },
      data: {
        name: name !== undefined ? name.trim() : existingTool.name,
        purpose: purpose !== undefined ? (purpose ? purpose.trim() : null) : existingTool.purpose,
        plan: plan !== undefined ? plan : existingTool.plan,
        cost: cost !== undefined ? (parseFloat(cost) || 0) : existingTool.cost,
        billingCycle: billingCycle !== undefined ? billingCycle : existingTool.billingCycle,
        nextRenewal: nextRenewal !== undefined ? (nextRenewal ? new Date(nextRenewal) : null) : existingTool.nextRenewal,
        note: note !== undefined ? (note ? note.trim() : null) : existingTool.note,
      },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'TOOL_COST_UPDATE',
      actionLabel: 'Sửa chi phí Công cụ',
      module: 'projects',
      entityType: 'ToolCost',
      entityId: costId,
      entityName: updatedTool.name,
      description: `Cập nhật thông tin công cụ "${updatedTool.name}"`,
      request: req,
      status: 'success',
      oldValues: existingTool,
      newValues: updatedTool,
    });

    return NextResponse.json({ toolCost: updatedTool, message: 'Cập nhật công cụ thành công!' });
  } catch (error) {
    console.error('PUT tool cost error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật thông tin công cụ.' }, { status: 500 });
  }
}

// DELETE: Delete a tool cost item
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; costId: string }> }
) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';
  const userEmail = req.headers.get('x-user-email') || '';
  const userRole = req.headers.get('x-user-role') || 'admin';

  try {
    const { id: projectId, costId } = await params;

    const existingTool = await prisma.toolCost.findUnique({
      where: { id: costId },
    });

    if (!existingTool || existingTool.projectId !== projectId) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin công cụ.' }, { status: 404 });
    }

    await prisma.toolCost.delete({
      where: { id: costId },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'TOOL_COST_DELETE',
      actionLabel: 'Xóa chi phí Công cụ',
      module: 'projects',
      entityType: 'ToolCost',
      entityId: costId,
      entityName: existingTool.name,
      description: `Xóa thông tin công cụ "${existingTool.name}"`,
      request: req,
      status: 'success',
      oldValues: existingTool,
    });

    return NextResponse.json({ message: 'Xóa công cụ thành công!' });
  } catch (error) {
    console.error('DELETE tool cost error:', error);
    return NextResponse.json({ error: 'Lỗi xóa thông tin công cụ.' }, { status: 500 });
  }
}
