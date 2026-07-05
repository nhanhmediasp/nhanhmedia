import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: Fetch activity log (audit logs) for a specific project
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const skip = (page - 1) * limit;

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án.' }, { status: 404 });
    }

    const filter = {
      OR: [
        { entityId: id, entityType: 'Project' },
        // Also include task/column actions that have the projectId in the path
        {
          AND: [
            { module: 'projects' },
            { requestPath: { contains: id } },
          ],
        },
      ],
    };

    // Get total logs for count
    const totalLogs = await prisma.auditLog.count({
      where: filter,
    });

    // Fetch all audit logs related to this project
    const logs = await prisma.auditLog.findMany({
      where: filter,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalLogs / limit);

    return NextResponse.json({
      logs,
      pagination: {
        totalLogs,
        totalPages,
        currentPage: page,
        limit,
      }
    });
  } catch (error) {
    console.error('GET project activity log error:', error);
    return NextResponse.json({ error: 'Lỗi tải nhật ký hoạt động.' }, { status: 500 });
  }
}
