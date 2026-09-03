import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');

  if (!userId || role !== 'admin') {
    return NextResponse.json({ error: 'Chỉ Admin mới có quyền gộp khách hàng.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const masterId = typeof body.masterId === 'string' ? body.masterId : '';
    const sourceIds: string[] = Array.isArray(body.sourceIds)
      ? Array.from(new Set(body.sourceIds.filter((id: unknown): id is string => typeof id === 'string')))
      : [];

    if (!masterId || sourceIds.length < 2 || !sourceIds.includes(masterId)) {
      return NextResponse.json(
        { error: 'Cần chọn ít nhất 2 khách hàng và một hồ sơ chính.' },
        { status: 400 }
      );
    }

    const customers = await prisma.customer.findMany({ where: { id: { in: sourceIds } } });
    if (customers.length !== sourceIds.length) {
      return NextResponse.json({ error: 'Một hoặc nhiều khách hàng không tồn tại.' }, { status: 404 });
    }

    const master = customers.find((customer) => customer.id === masterId);
    if (!master) return NextResponse.json({ error: 'Không tìm thấy hồ sơ chính.' }, { status: 404 });

    const duplicates = customers.filter((customer) => customer.id !== masterId);
    const merged = await prisma.$transaction(async (tx) => {
      const duplicateIds = duplicates.map((customer) => customer.id);
      const orderResult = await tx.order.updateMany({
        where: { customerId: { in: duplicateIds } },
        data: { customerId: masterId },
      });
      const emailResult = await tx.emailLog.updateMany({
        where: { customerId: { in: duplicateIds } },
        data: { customerId: masterId },
      });

      const firstWithValue = <K extends keyof typeof master>(key: K) =>
        master[key] ?? duplicates.find((customer) => customer[key] !== null)?.[key] ?? null;

      const updatedMaster = await tx.customer.update({
        where: { id: masterId },
        data: {
          phone: firstWithValue('phone'),
          facebook: firstWithValue('facebook'),
          zalo: firstWithValue('zalo'),
          email: firstWithValue('email'),
          note: firstWithValue('note'),
          source: firstWithValue('source'),
          manualRating: firstWithValue('manualRating'),
          internalNotes: firstWithValue('internalNotes'),
        },
      });

      await tx.customer.deleteMany({ where: { id: { in: duplicateIds } } });
      return { updatedMaster, movedOrders: orderResult.count, movedEmailLogs: emailResult.count };
    });

    await createAuditLog({
      action: 'MERGE_CUSTOMERS',
      actionLabel: 'Gộp khách hàng',
      module: 'customers',
      entityType: 'Customer',
      entityId: masterId,
      entityName: merged.updatedMaster.name,
      description: `Gộp ${duplicates.length} hồ sơ khách hàng vào ${merged.updatedMaster.name}. Đã chuyển ${merged.movedOrders} đơn hàng.`,
      oldValues: { masterId, mergedCustomerIds: duplicates.map((customer) => customer.id) },
      newValues: { masterId, movedOrders: merged.movedOrders, movedEmailLogs: merged.movedEmailLogs },
      request: req,
      status: 'success',
    });

    return NextResponse.json({
      message: `Đã gộp ${duplicates.length} khách hàng vào hồ sơ chính.`,
      movedOrders: merged.movedOrders,
      movedEmailLogs: merged.movedEmailLogs,
      customer: merged.updatedMaster,
    });
  } catch (error) {
    console.error('Merge customers error:', error);
    return NextResponse.json({ error: 'Lỗi gộp khách hàng.' }, { status: 500 });
  }
}
