import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/crypto';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  try {
    const settings = await prisma.emailSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      return NextResponse.json({ settings: null });
    }

    // Return settings with password masked for security
    return NextResponse.json({
      settings: {
        ...settings,
        smtpPasswordEncrypted: '••••••••', // Mask password
      },
    });
  } catch (error) {
    console.error('Get SMTP settings error:', error);
    return NextResponse.json({ error: 'Lỗi tải cấu hình SMTP.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ Admin mới có quyền cấu hình.' }, { status: 403 });
    }

    const body = await req.json();
    const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure, fromName, fromEmail } = body;

    if (!smtpHost || !smtpPort || !smtpUser || !fromName || !fromEmail) {
      return NextResponse.json({ error: 'Thiếu các thông tin cấu hình bắt buộc.' }, { status: 400 });
    }

    const currentSettings = await prisma.emailSettings.findUnique({
      where: { id: 'default' },
    });

    let passwordToSave = currentSettings?.smtpPasswordEncrypted || '';

    // Only update password if it is not the masked placeholder
    if (smtpPassword && smtpPassword !== '••••••••') {
      passwordToSave = encrypt(smtpPassword);
    }

    const updated = await prisma.emailSettings.upsert({
      where: { id: 'default' },
      update: {
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUser,
        smtpPasswordEncrypted: passwordToSave,
        smtpSecure: !!smtpSecure,
        fromName,
        fromEmail,
      },
      create: {
        id: 'default',
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUser,
        smtpPasswordEncrypted: passwordToSave,
        smtpSecure: !!smtpSecure,
        fromName,
        fromEmail,
      },
    });

    await createAuditLog({
      action: 'UPDATE_SMTP_SETTINGS',
      actionLabel: 'Sửa cấu hình SMTP',
      module: 'settings',
      entityType: 'EmailSettings',
      entityId: 'default',
      entityName: 'SMTP Settings',
      description: 'Đã cập nhật cấu hình email SMTP của hệ thống',
      oldValues: currentSettings ? { ...currentSettings, smtpPasswordEncrypted: '••••••••' } : null,
      newValues: {
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUser,
        smtpPasswordEncrypted: '••••••••',
        smtpSecure: !!smtpSecure,
        fromName,
        fromEmail
      },
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Lưu cấu hình SMTP thành công!',
      settings: {
        ...updated,
        smtpPasswordEncrypted: '••••••••',
      },
    });
  } catch (error) {
    console.error('Save SMTP settings error:', error);
    return NextResponse.json({ error: 'Lỗi lưu cấu hình SMTP.' }, { status: 500 });
  }
}

