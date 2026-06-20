import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const userRole = req.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền xuất nhật ký.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const module = searchParams.get('module') || '';
    const action = searchParams.get('action') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const actorUserId = searchParams.get('actorUserId') || '';

    // Build query clauses
    const whereClause: any = {};

    if (role) whereClause.actorRole = role;
    if (module) whereClause.module = module;
    if (action) whereClause.action = action;
    if (status) whereClause.status = status;
    if (actorUserId) whereClause.actorUserId = actorUserId;

    if (search) {
      whereClause.OR = [
        { description: { contains: search } },
        { actorName: { contains: search } },
        { actorEmail: { contains: search } },
        { entityName: { contains: search } }
      ];
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length <= 10) end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 10000, // Safe limit for database export
    });

    const headers = [
      'Thời Gian',
      'Người Thao Tác',
      'Email',
      'Vai Trò',
      'Hành Động',
      'Phân Hệ (Module)',
      'Đối Tượng',
      'ID Đối Tượng',
      'Mô Tả Chi Tiết',
      'IP Address',
      'Trình Duyệt (User Agent)',
      'Method',
      'Đường Dẫn Request',
      'Trạng Tính',
      'Lỗi (nếu có)'
    ];

    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.actorName || 'Guest',
      log.actorEmail || '',
      log.actorRole || 'guest',
      log.actionLabel || log.action,
      log.module || '',
      log.entityName || '',
      log.entityId || '',
      log.description || '',
      log.ipAddress || '',
      log.userAgent || '',
      log.requestMethod || '',
      log.requestPath || '',
      log.status || 'success',
      log.errorMessage || ''
    ]);

    const csvContent =
      '\ufeff' + // BOM for UTF-8
      [headers.join(','), ...rows.map((row) => row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=nhat-ky-hoat-dong-${new Date().toISOString().substring(0, 10)}.csv`,
      },
    });
  } catch (error) {
    console.error('Export audit logs error:', error);
    return NextResponse.json({ error: 'Lỗi xuất file nhật ký hoạt động.' }, { status: 500 });
  }
}
