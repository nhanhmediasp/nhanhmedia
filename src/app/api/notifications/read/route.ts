import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST: Mark notification(s) as read
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      // Mark all unread notifications as read
      const role = req.headers.get('x-user-role') || '';
      const unreadNotifications = await prisma.notification.findMany({
        where: {
          OR: [
            { targetRole: 'all' },
            { targetRole: role },
          ],
          reads: {
            none: { userId },
          },
        },
        select: { id: true },
      });

      if (unreadNotifications.length > 0) {
        await prisma.notificationRead.createMany({
          data: unreadNotifications.map((n) => ({
            notificationId: n.id,
            userId,
          })),
        });
      }

      return NextResponse.json({ message: 'Đã đánh dấu tất cả đã đọc.' });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Thiếu ID thông báo.' }, { status: 400 });
    }

    // Mark single notification as read
    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      create: {
        notificationId,
        userId,
      },
      update: {},
    });

    return NextResponse.json({ message: 'Đã đánh dấu đã đọc.' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json({ error: 'Lỗi đánh dấu đã đọc.' }, { status: 500 });
  }
}
