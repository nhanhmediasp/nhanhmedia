import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const [templates, settings] = await Promise.all([
      prisma.emailTemplate.findMany(),
      prisma.reminderSettings.findMany({ orderBy: { daysBefore: 'desc' } }),
    ]);

    return NextResponse.json({ templates, settings });
  } catch (error) {
    console.error('Get reminder settings error:', error);
    return NextResponse.json({ error: 'Lỗi tải cấu hình nhắc hạn.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền cấu hình.' }, { status: 403 });
    }

    const body = await req.json();
    const { templates, settings } = body;

    await prisma.$transaction(async (tx) => {
      // 1. Save templates
      if (templates && Array.isArray(templates)) {
        for (const t of templates) {
          await tx.emailTemplate.update({
            where: { id: t.id },
            data: {
              subject: t.subject.trim(),
              body: t.body.trim(),
            },
          });
        }
      }

      // 2. Save reminder settings
      if (settings && Array.isArray(settings)) {
        for (const s of settings) {
          await tx.reminderSettings.update({
            where: { id: s.id },
            data: {
              enabled: !!s.enabled,
            },
          });
        }
      }
    });

    return NextResponse.json({ message: 'Lưu cấu hình nhắc hạn thành công!' });
  } catch (error) {
    console.error('Save reminder settings error:', error);
    return NextResponse.json({ error: 'Lỗi lưu cấu hình nhắc hạn.' }, { status: 500 });
  }
}
