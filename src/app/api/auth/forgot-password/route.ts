import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { createAuditLog } from '@/lib/audit';

const JWT_SECRET = process.env.JWT_SECRET || 'nhanh_media_fallback_jwt_secret_key_2026';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Địa chỉ Email là bắt buộc.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (!user) {
      // For security reasons, don't disclose that the email doesn't exist,
      // but return success to avoid user enumeration.
      return NextResponse.json({
        message: 'Nếu địa chỉ email này tồn tại trong hệ thống, bạn sẽ nhận được liên kết khôi phục mật khẩu.'
      });
    }

    // 2. Fetch SMTP configurations from Database
    const smtpSettings = await prisma.emailSettings.findUnique({
      where: { id: 'default' }
    });

    if (!smtpSettings) {
      return NextResponse.json(
        { error: 'Hệ thống chưa cấu hình SMTP. Vui lòng liên hệ Admin để khôi phục mật khẩu.' },
        { status: 500 }
      );
    }

    // 3. Generate a reset token (expires in 15 minutes)
    const token = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'reset-password' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // 4. Construct reset link
    // Get host from request headers
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const resetUrl = `${origin}/reset-password?token=${token}`;

    const smtpPassword = decrypt(smtpSettings.smtpPasswordEncrypted);

    // 5. Setup nodemailer transporter
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

    // 6. Send email
    await transporter.sendMail({
      from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
      to: user.email,
      subject: 'Yêu cầu khôi phục mật khẩu - Nhanh Media',
      html: `<p>Xin chào <strong>${user.name}</strong>,</p>
             <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản đăng nhập của bạn trên hệ thống <strong>Nhanh Media</strong>.</p>
             <p>Vui lòng click vào liên kết dưới đây để thiết lập mật khẩu mới (Liên kết này có hiệu lực trong vòng <strong>15 phút</strong>):</p>
             <p><a href="${resetUrl}" style="display:inline-block;background:#a145ab;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;">Đặt lại mật khẩu</a></p>
             <p>Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này.</p>
             <p>Trân trọng,<br>Đội ngũ Nhanh Media</p>`
    });

    await createAuditLog({
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'FORGOT_PASSWORD_REQUEST',
      actionLabel: 'Yêu cầu khôi phục mật khẩu',
      module: 'auth',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email,
      description: `Đã gửi link khôi phục mật khẩu tới địa chỉ ${user.email}`,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Một email chứa liên kết đặt lại mật khẩu đã được gửi tới địa chỉ của bạn. Vui lòng kiểm tra hộp thư!'
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Lỗi gửi thư khôi phục mật khẩu: ' + (error.message || 'Lỗi không xác định') },
      { status: 500 }
    );
  }
}
