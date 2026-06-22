import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const userRole = req.headers.get('x-user-role');
    
    // Authorization Check: Only Admin allowed
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền xem nhật ký gửi email.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'desc'; // 'asc' or 'desc'

    const skip = (page - 1) * limit;

    // Build query clauses
    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    // Search query on emailTo, subject, body
    if (search) {
      whereClause.OR = [
        { emailTo: { contains: search } },
        { subject: { contains: search } },
        { body: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const sortOrder = sort === 'asc' ? 'asc' : 'desc';

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true }
          },
          order: {
            select: { id: true, orderCode: true }
          }
        },
        orderBy: { sentAt: sortOrder },
        skip,
        take: limit,
      }),
      prisma.emailLog.count({
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
    console.error('Get email logs error:', error);
    return NextResponse.json({ error: 'Lỗi tải nhật ký gửi email.' }, { status: 500 });
  }
}
