import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: List all notifications (Admin view)
export async function GET(req: Request) {
  try {
    const notifications = await prisma.notification.findMany({
      include: {
        createdByUser: {
          select: { id: true, name: true },
        },
        _count: {
          select: { reads: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách thông báo.' }, { status: 500 });
  }
}

// POST: Create a new notification
export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, targetRole } = body;

    if (!title || !content || !targetRole) {
      return NextResponse.json(
        { error: 'Tiêu đề, nội dung và đối tượng nhận là bắt buộc.' },
        { status: 400 }
      );
    }

    const validRoles = ['all', 'member', 'collaborator', 'agency'];
    if (!validRoles.includes(targetRole)) {
      return NextResponse.json(
        { error: 'Đối tượng nhận không hợp lệ.' },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        targetRole,
        createdByUserId: userId,
      },
      include: {
        createdByUser: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Tạo thông báo thành công!',
      notification,
    });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json({ error: 'Lỗi tạo thông báo.' }, { status: 500 });
  }
}
