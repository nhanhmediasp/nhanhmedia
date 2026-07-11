import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || '';
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

    const where: any = {};

    if (projectId && projectId !== 'all') {
      where.projectId = projectId === 'none' ? null : projectId;
    }
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId === 'none' ? null : categoryId;
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search.trim()) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (range !== 'all') {
      where.date = dateFilter;
    }

    const workLogs = await prisma.projectWorkLog.findMany({
      where,
      include: {
        project: true,
        category: true,
        customer: true,
      },
      orderBy: { date: 'desc' },
    });

    // Calculate metrics
    const totalHours = workLogs.reduce((sum, log) => sum + log.hours, 0);
    const totalEarnings = workLogs.reduce((sum, log) => sum + (log.hours * log.hourlyRate), 0);
    const activeTasksCount = workLogs.filter(log => log.status === 'processing').length;

    return NextResponse.json({
      workLogs,
      metrics: {
        totalHours,
        totalEarnings,
        activeTasksCount,
      }
    });
  } catch (error) {
    console.error('GET work-logs error:', error);
    return NextResponse.json({ error: 'Lỗi tải nhật ký làm việc.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id') || 'unknown';
  const userName = req.headers.get('x-user-name') || 'System';

  try {
    const body = await req.json();
    const { title, description, hours, hourlyRate, websiteUrl, status, date, projectId, categoryId, customerId } = body;

    if (!title || !hours || !date) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc (Tiêu đề, số giờ, ngày làm).' }, { status: 400 });
    }

    const newWorkLog = await prisma.projectWorkLog.create({
      data: {
        title,
        description: description || null,
        hours: parseFloat(hours),
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
        websiteUrl: websiteUrl || null,
        status: status || 'completed',
        date: new Date(date),
        projectId: (projectId && projectId !== '') ? projectId : null,
        categoryId: (categoryId && categoryId !== '') ? categoryId : null,
        customerId: (customerId && customerId !== '') ? customerId : null,
      },
      include: {
        project: true,
        category: true,
        customer: true,
      },
    });

    await createAuditLog({
      actor: { id: userId, name: userName, email: '', role: 'admin' },
      action: 'WORKLOG_CREATE',
      actionLabel: 'Thêm nhật ký công việc mới',
      module: 'projects',
      entityType: 'ProjectWorkLog',
      entityId: newWorkLog.id,
      entityName: newWorkLog.title,
      description: `Đã thêm nhật ký công việc mới: ${newWorkLog.title} (${newWorkLog.hours} giờ)`,
      request: req,
      status: 'success',
      newValues: newWorkLog,
    });

    return NextResponse.json({ workLog: newWorkLog, message: 'Thêm nhật ký công việc thành công!' });
  } catch (error) {
    console.error('POST work-logs error:', error);
    return NextResponse.json({ error: 'Lỗi thêm nhật ký công việc.' }, { status: 500 });
  }
}
