import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { createAuditLog } from '@/lib/audit';

const JWT_SECRET = process.env.JWT_SECRET || 'nhanh_media_fallback_jwt_secret_key_2026';

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
    const { subject, message, isResetPassword } = body;

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
    let finalSubject = subject || 'Thông báo từ Ban quản trị Nhanh Media';
    let htmlContent = '';

    if (isResetPassword) {
      // Generate a reset token (expires in 15 minutes)
      const token = jwt.sign(
        { userId: recipient.id, email: recipient.email, purpose: 'reset-password' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      const origin = req.headers.get('origin') || 'http://localhost:3000';
      const resetUrl = `${origin}/reset-password?token=${token}`;

      finalSubject = 'Yêu cầu thiết lập lại mật khẩu - Admin Nhanh Media';
      htmlContent = `<p>Xin chào <strong>${recipient.name}</strong>,</p>
                     <p>Admin của <strong>Nhanh Media</strong> đã tạo liên kết khôi phục mật khẩu cho bạn.</p>
                     <p>Vui lòng click vào liên kết dưới đây để thiết lập mật khẩu mới (Liên kết này có hiệu lực trong vòng <strong>15 phút</strong>):</p>
                     <p><a href="${resetUrl}" style="display:inline-block;background:#a145ab;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;">Đặt lại mật khẩu mới</a></p>
                     <p>Trân trọng,<br>Admin Nhanh Media</p>`;
    } else {
      if (!message) {
        return NextResponse.json({ error: 'Nội dung email không được bỏ trống.' }, { status: 400 });
      }
      htmlContent = `<p>Xin chào <strong>${recipient.name}</strong>,</p>
                     <div>${message.replace(/\n/g, '<br>')}</div>
                     <br>
                     <p>Trân trọng,<br>Ban quản trị Nhanh Media</p>`;
    }

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
      action: isResetPassword ? 'SEND_ADMIN_RESET_PASSWORD' : 'SEND_ADMIN_CUSTOM_EMAIL',
      actionLabel: isResetPassword ? 'Gửi link reset mật khẩu từ Admin' : 'Gửi email tùy chọn từ Admin',
      module: 'users',
      entityType: 'User',
      entityId: recipient.id,
      entityName: recipient.email,
      description: isResetPassword
        ? `Admin đã gửi liên kết đặt lại mật khẩu cho CTV ${recipient.name} (${recipient.email})`
        : `Admin đã gửi email tùy chỉnh cho CTV ${recipient.name} (${recipient.email}) với tiêu đề: "${finalSubject}"`,
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
