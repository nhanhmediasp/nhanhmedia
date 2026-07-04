import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// PUT: Update a website cost item
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
    const { name, type, amount, date, note } = body;

    const existingCost = await prisma.websiteCost.findUnique({
      where: { id: costId },
    });

    if (!existingCost || existingCost.projectId !== projectId) {
      return NextResponse.json({ error: 'Không tìm thấy khoản chi phí.' }, { status: 404 });
    }

    const updatedCost = await prisma.websiteCost.update({
      where: { id: costId },
      data: {
        name: name !== undefined ? name.trim() : existingCost.name,
        type: type !== undefined ? type : existingCost.type,
        amount: amount !== undefined ? (parseFloat(amount) || 0) : existingCost.amount,
        date: date !== undefined ? new Date(date) : existingCost.date,
        note: note !== undefined ? (note ? note.trim() : null) : existingCost.note,
      },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'WEBSITE_COST_UPDATE',
      actionLabel: 'Sửa chi phí Website',
      module: 'projects',
      entityType: 'WebsiteCost',
      entityId: costId,
      entityName: updatedCost.name,
      description: `Cập nhật chi phí Website "${updatedCost.name}"`,
      request: req,
      status: 'success',
      oldValues: existingCost,
      newValues: updatedCost,
    });

    return NextResponse.json({ cost: updatedCost, message: 'Cập nhật chi phí thành công!' });
  } catch (error) {
    console.error('PUT website cost error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật chi phí website.' }, { status: 500 });
  }
}

// DELETE: Delete a website cost item
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

    const existingCost = await prisma.websiteCost.findUnique({
      where: { id: costId },
    });

    if (!existingCost || existingCost.projectId !== projectId) {
      return NextResponse.json({ error: 'Không tìm thấy khoản chi phí.' }, { status: 404 });
    }

    await prisma.websiteCost.delete({
      where: { id: costId },
    });

    // Write audit log
    await createAuditLog({
      actor: { id: userId, name: userName, email: userEmail, role: userRole },
      action: 'WEBSITE_COST_DELETE',
      actionLabel: 'Xóa chi phí Website',
      module: 'projects',
      entityType: 'WebsiteCost',
      entityId: costId,
      entityName: existingCost.name,
      description: `Xóa chi phí Website "${existingCost.name}"`,
      request: req,
      status: 'success',
      oldValues: existingCost,
    });

    return NextResponse.json({ message: 'Xóa chi phí thành công!' });
  } catch (error) {
    console.error('DELETE website cost error:', error);
    return NextResponse.json({ error: 'Lỗi xóa chi phí website.' }, { status: 500 });
  }
}
