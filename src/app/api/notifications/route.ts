import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: Get notifications for the current user (based on role)
export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    // Fetch notifications matching user's role or 'all'
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetRole: 'all' },
          { targetRole: role },
        ],
      },
      include: {
        createdByUser: {
          select: { id: true, name: true },
        },
        reads: {
          where: { userId },
          select: { id: true, readAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Format response
    const formatted = notifications.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      targetRole: n.targetRole,
      createdByUser: n.createdByUser,
      createdAt: n.createdAt,
      isRead: n.reads.length > 0,
      readAt: n.reads.length > 0 ? n.reads[0].readAt : null,
    }));

    const unreadCount = formatted.filter((n) => !n.isRead).length;

    return NextResponse.json({
      notifications: formatted,
      unreadCount,
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    return NextResponse.json({ error: 'Lỗi tải thông báo.' }, { status: 500 });
  }
}
