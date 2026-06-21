import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    let settings = await prisma.websiteSettings.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      // Auto-create with defaults
      settings = await prisma.websiteSettings.create({
        data: { id: 'default' }
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('GET website settings error:', error);
    return NextResponse.json({ error: 'Lỗi tải cài đặt website.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có thể thay đổi cài đặt website.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      siteName,
      siteDescription,
      logoUrl,
      faviconUrl,
      adminEmail,
      adminPhone,
      adminAddress,
      facebookUrl,
      zaloUrl,
      telegramUrl,
      loginMaxAttempts,
      loginLockEnabled,
      loginLockDurationMins,
    } = body;

    const oldSettings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });

    const settings = await prisma.websiteSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        siteName: siteName || 'Nhanh Media',
        siteDescription: siteDescription || null,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        adminEmail: adminEmail || null,
        adminPhone: adminPhone || null,
        adminAddress: adminAddress || null,
        facebookUrl: facebookUrl || null,
        zaloUrl: zaloUrl || null,
        telegramUrl: telegramUrl || null,
        loginMaxAttempts: loginMaxAttempts !== undefined ? parseInt(loginMaxAttempts) : 5,
        loginLockEnabled: typeof loginLockEnabled === 'boolean' ? loginLockEnabled : true,
        loginLockDurationMins: loginLockDurationMins !== undefined ? parseInt(loginLockDurationMins) : 15,
      },
      update: {
        siteName: siteName !== undefined ? siteName : undefined,
        siteDescription: siteDescription !== undefined ? siteDescription : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        faviconUrl: faviconUrl !== undefined ? faviconUrl : undefined,
        adminEmail: adminEmail !== undefined ? adminEmail : undefined,
        adminPhone: adminPhone !== undefined ? adminPhone : undefined,
        adminAddress: adminAddress !== undefined ? adminAddress : undefined,
        facebookUrl: facebookUrl !== undefined ? facebookUrl : undefined,
        zaloUrl: zaloUrl !== undefined ? zaloUrl : undefined,
        telegramUrl: telegramUrl !== undefined ? telegramUrl : undefined,
        loginMaxAttempts: loginMaxAttempts !== undefined ? parseInt(loginMaxAttempts) : undefined,
        loginLockEnabled: typeof loginLockEnabled === 'boolean' ? loginLockEnabled : undefined,
        loginLockDurationMins: loginLockDurationMins !== undefined ? parseInt(loginLockDurationMins) : undefined,
      }
    });

    await createAuditLog({
      action: 'UPDATE_WEBSITE_SETTINGS',
      actionLabel: 'Cập nhật cài đặt Website',
      module: 'settings',
      entityType: 'WebsiteSettings',
      entityId: 'default',
      entityName: 'Cài đặt Website',
      description: 'Đã cập nhật cài đặt website hệ thống',
      oldValues: oldSettings ? JSON.stringify({
        siteName: oldSettings.siteName,
        logoUrl: oldSettings.logoUrl,
        loginLockEnabled: oldSettings.loginLockEnabled,
        loginMaxAttempts: oldSettings.loginMaxAttempts,
      }) : null,
      newValues: JSON.stringify({
        siteName: settings.siteName,
        logoUrl: settings.logoUrl,
        loginLockEnabled: settings.loginLockEnabled,
        loginMaxAttempts: settings.loginMaxAttempts,
      }),
      request: req,
      status: 'success',
    });

    return NextResponse.json({ message: 'Đã lưu cài đặt website thành công!', settings });
  } catch (error: any) {
    console.error('PUT website settings error:', error);
    return NextResponse.json({ error: `Lỗi máy chủ khi lưu cài đặt: ${error?.message || error}` }, { status: 500 });
  }
}
