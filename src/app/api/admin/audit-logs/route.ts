import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const userRole = req.headers.get('x-user-role');
    
    // Authorization Check: Only Admin allowed
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền xem nhật ký hoạt động.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const module = searchParams.get('module') || '';
    const action = searchParams.get('action') || '';
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const actorUserId = searchParams.get('actorUserId') || '';

    const skip = (page - 1) * limit;

    // Build query clauses
    const whereClause: any = {};

    if (role) {
      whereClause.actorRole = role;
    }
    if (module) {
      whereClause.module = module;
    }
    if (action) {
      whereClause.action = action;
    }
    if (status) {
      whereClause.status = status;
    }
    if (actorUserId) {
      whereClause.actorUserId = actorUserId;
    }

    // Search query on description, actorName, actorEmail
    if (search) {
      whereClause.OR = [
        { description: { contains: search } },
        { actorName: { contains: search } },
        { actorEmail: { contains: search } },
        { entityName: { contains: search } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        // Make sure to include the entire end date
        if (endDate.length <= 10) {
          end.setHours(23, 59, 59, 999);
        }
        whereClause.createdAt.lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json({ error: 'Lỗi tải nhật ký hoạt động.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userRole = req.headers.get('x-user-role');
    
    // Authorization Check: Only Admin allowed
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền xóa nhật ký hoạt động.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'all'; // 'all' or 'olderThan'
    const days = parseInt(searchParams.get('days') || '30');

    let deletedCount = 0;
    let description = '';

    if (mode === 'all') {
      const result = await prisma.auditLog.deleteMany();
      deletedCount = result.count;
      description = `Đã xóa toàn bộ nhật ký hoạt động (${deletedCount} bản ghi) khỏi hệ thống`;
    } else if (mode === 'olderThan') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoff,
          },
        },
      });
      deletedCount = result.count;
      description = `Đã xóa các bản ghi nhật ký hoạt động cũ hơn ${days} ngày trước (đã xóa ${deletedCount} bản ghi)`;
    } else {
      return NextResponse.json({ error: 'Chế độ dọn dẹp không hợp lệ.' }, { status: 400 });
    }

    // Import and create audit log for security accountability
    const { createAuditLog } = await import('@/lib/audit');
    await createAuditLog({
      action: 'CLEAR_AUDIT_LOGS',
      actionLabel: 'Dọn dẹp Nhật ký',
      module: 'settings',
      description,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: `Đã dọn dẹp thành công ${deletedCount} bản ghi nhật ký hoạt động.`,
      deletedCount,
    });
  } catch (error) {
    console.error('Delete audit logs error:', error);
    return NextResponse.json({ error: 'Lỗi khi dọn dẹp nhật ký hoạt động.' }, { status: 500 });
  }
}
