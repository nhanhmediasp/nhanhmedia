import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = req.headers.get('x-user-role');
    const actorId = req.headers.get('x-user-id');

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ có Admin mới có quyền gửi email.' }, { status: 403 });
    }

    const body = await req.json();
    const { subject, message } = body;

    // 1. Fetch recipient user details
    const recipient = await prisma.user.findUnique({
      where: { id }
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Người nhận không tồn tại.' }, { status: 404 });
    }

    // 2. Fetch SMTP configurations
    const smtpSettings = await prisma.emailSettings.findUnique({
      where: { id: 'default' }
    });

    if (!smtpSettings) {
      return NextResponse.json(
        { error: 'Hệ thống chưa cấu hình SMTP. Vui lòng thiết lập cấu hình SMTP trước.' },
        { status: 400 }
      );
    }

    // 3. Construct email content
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Nội dung email không được bỏ trống.' }, { status: 400 });
    }
    const finalSubject =
      typeof subject === 'string' && subject.trim()
        ? subject.trim()
        : 'Thông báo từ Ban quản trị Nhanh Media';
    const htmlContent = `<p>Xin chào <strong>${recipient.name}</strong>,</p>
                         <div>${message.replace(/\n/g, '<br>')}</div>
                         <br>
                         <p>Trân trọng,<br>Ban quản trị Nhanh Media</p>`;

    // 4. Setup nodemailer transporter
    const smtpPassword = decrypt(smtpSettings.smtpPasswordEncrypted);
    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtpHost,
      port: smtpSettings.smtpPort,
      secure: smtpSettings.smtpSecure,
      auth: {
        user: smtpSettings.smtpUser,
        pass: smtpPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 5. Send email
    await transporter.sendMail({
      from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
      to: recipient.email,
      subject: finalSubject,
      html: htmlContent
    });

    // 6. Audit Log
    const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : null;
    await createAuditLog({
      actor: actor ? { id: actor.id, name: actor.name, email: actor.email, role: actor.role } : undefined,
      action: 'SEND_ADMIN_CUSTOM_EMAIL',
      actionLabel: 'Gửi email tùy chọn từ Admin',
      module: 'users',
      entityType: 'User',
      entityId: recipient.id,
      entityName: recipient.email,
      description: `Admin đã gửi email tùy chỉnh cho nhân sự ${recipient.name} (${recipient.email}) với tiêu đề: "${finalSubject}"`,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: `Đã gửi email thành công tới địa chỉ ${recipient.email}!`
    });

  } catch (error: any) {
    console.error('Admin send email error:', error);
    return NextResponse.json(
      { error: 'Lỗi gửi email: ' + (error.message || 'Lỗi không xác định') },
      { status: 500 }
    );
  }
}
