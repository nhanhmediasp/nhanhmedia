import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await context.params;
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'all'; // 7days, 30days, lastMonth, all

    let dateFilter: any = {};
    const today = new Date();
    
    if (range === '7days') {
      const past7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: past7 };
    } else if (range === '30days') {
      const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: past30 };
    } else if (range === 'lastMonth') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
      dateFilter = { gte: firstDayLastMonth, lte: lastDayLastMonth };
    }

    const where: any = { projectId };
    if (range !== 'all') {
      where.date = dateFilter;
    }

    const workLogs = await prisma.projectWorkLog.findMany({
      where,
      include: {
        customer: true,
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ workLogs });
  } catch (error) {
    console.error('GET project work-logs error:', error);
    return NextResponse.json({ error: 'Lỗi tải nhật ký làm việc.' }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';

  try {
    const { id: projectId } = await context.params;
    const body = await req.json();
    const { title, hours, date, customerId } = body;

    if (!title || !hours || !date) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc.' }, { status: 400 });
    }

    const newWorkLog = await prisma.projectWorkLog.create({
      data: {
        projectId,
        customerId: customerId || null,
        title,
        hours: parseFloat(hours),
        date: new Date(date),
      },
      include: {
        customer: true,
      },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: '', role: 'admin' },
      action: 'WORKLOG_CREATE',
      actionLabel: 'Thêm nhật ký công việc',
      module: 'projects',
      entityType: 'ProjectWorkLog',
      entityId: newWorkLog.id,
      entityName: newWorkLog.title,
      description: `Đã thêm ${newWorkLog.hours} giờ làm việc cho dự án`,
      request: req,
      status: 'success',
      newValues: newWorkLog,
    });

    return NextResponse.json({ workLog: newWorkLog, message: 'Thêm nhật ký công việc thành công!' });
  } catch (error) {
    console.error('POST project work-logs error:', error);
    return NextResponse.json({ error: 'Lỗi thêm nhật ký công việc.' }, { status: 500 });
  }
}
