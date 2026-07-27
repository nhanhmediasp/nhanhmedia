import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

/** Các trường bí mật: chỉ trả về cờ "đã cấu hình hay chưa", không trả giá trị thật. */
const SECRET_FIELDS = [
  'sepayApiKey',
  'sepayWebhookSecret',
  'telegramBotToken',
  'telegramWebhookSecret',
  'geminiApiKey',
] as const;

const SECRET_MASK = '********';

export async function GET(req: Request) {
  try {
    // PUT đã kiểm tra admin nhưng GET thì chưa — mà GET trả về nguyên
    // sepayApiKey / telegramBotToken / geminiApiKey dạng plaintext.
    const role = req.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có thể xem cài đặt website.' }, { status: 403 });
    }

    let settings = await prisma.websiteSettings.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      // Auto-create with defaults
      settings = await prisma.websiteSettings.create({
        data: { id: 'default' }
      });
    }

    // Che giá trị bí mật. UI chỉ cần biết đã cấu hình hay chưa;
    // khi lưu, trường nào giữ nguyên mask thì PUT sẽ bỏ qua không ghi đè.
    const masked: Record<string, unknown> = { ...settings };
    for (const field of SECRET_FIELDS) {
      masked[field] = settings[field] ? SECRET_MASK : null;
    }

    return NextResponse.json({ settings: masked });
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
      sepayAccountNumber,
      sepayBankCode,
      sepayAccountName,
      sepayApiKey,
      sepayWebhookSecret,
      telegramBotToken,
      telegramAdminChatId,
      telegramWebhookSecret,
      geminiApiKey,
    } = body;

    // Nếu client gửi lại đúng chuỗi mask (do GET đã che), nghĩa là admin không
    // sửa trường đó → giữ nguyên giá trị cũ thay vì ghi đè bằng "********".
    const keepIfMasked = (value: unknown) =>
      value === SECRET_MASK ? undefined : (value as string | null | undefined);

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
        sepayAccountNumber: sepayAccountNumber || null,
        sepayBankCode: sepayBankCode || null,
        sepayAccountName: sepayAccountName || null,
        sepayApiKey: keepIfMasked(sepayApiKey) || null,
        sepayWebhookSecret: keepIfMasked(sepayWebhookSecret) || null,
        telegramBotToken: keepIfMasked(telegramBotToken) || null,
        telegramAdminChatId: telegramAdminChatId || null,
        telegramWebhookSecret: keepIfMasked(telegramWebhookSecret) || null,
        geminiApiKey: keepIfMasked(geminiApiKey) || null,
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
        sepayAccountNumber: sepayAccountNumber !== undefined ? sepayAccountNumber : undefined,
        sepayBankCode: sepayBankCode !== undefined ? sepayBankCode : undefined,
        sepayAccountName: sepayAccountName !== undefined ? sepayAccountName : undefined,
        sepayApiKey: keepIfMasked(sepayApiKey),
        sepayWebhookSecret: keepIfMasked(sepayWebhookSecret),
        telegramBotToken: keepIfMasked(telegramBotToken),
        telegramAdminChatId: telegramAdminChatId !== undefined ? telegramAdminChatId : undefined,
        telegramWebhookSecret: keepIfMasked(telegramWebhookSecret),
        geminiApiKey: keepIfMasked(geminiApiKey),
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

    const maskedResponse: Record<string, unknown> = { ...settings };
    for (const field of SECRET_FIELDS) {
      maskedResponse[field] = settings[field] ? SECRET_MASK : null;
    }

    return NextResponse.json({ message: 'Đã lưu cài đặt website thành công!', settings: maskedResponse });
  } catch (error: any) {
    console.error('PUT website settings error:', error);
    return NextResponse.json({ error: `Lỗi máy chủ khi lưu cài đặt: ${error?.message || error}` }, { status: 500 });
  }
}
