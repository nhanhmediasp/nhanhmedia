import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { createAuditLog } from '@/lib/audit';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Crucial security configuration missing: JWT_SECRET must be defined in the environment variables.');
}

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

export async function POST(req: Request) {
  const ip = getClientIP(req);
  const rateLimitIp = `forgot_pwd_${ip}`;
  const maxAttempts = 5;
  const lockDurationMins = 15;

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Địa chỉ Email là bắt buộc.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Rate limiting check
    try {
      const existingAttempt = await prisma.loginAttempt.findFirst({
        where: { ipAddress: rateLimitIp },
      });

      if (existingAttempt) {
        if (existingAttempt.lockedUntil && existingAttempt.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil(
            (existingAttempt.lockedUntil.getTime() - Date.now()) / 60000
          );
          return NextResponse.json(
            { error: `Bạn đã yêu cầu khôi phục mật khẩu quá nhiều lần. Vui lòng thử lại sau ${minutesLeft} phút.` },
            { status: 429 }
          );
        }

        // Lock window expired — reset counter
        const lockWindowStart = new Date(Date.now() - lockDurationMins * 60 * 1000);
        if (existingAttempt.lastAttempt < lockWindowStart) {
          await prisma.loginAttempt.update({
            where: { id: existingAttempt.id },
            data: { attempts: 0, lockedUntil: null, lastAttempt: new Date() },
          });
        }
      }
    } catch (dbErr) {
      console.error('Forgot password rate limit check error:', dbErr);
    }

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    // Record this attempt to rate limit IP
    try {
      const existing = await prisma.loginAttempt.findFirst({ where: { ipAddress: rateLimitIp } });
      if (existing) {
        const newAttempts = existing.attempts + 1;
        const isLocked = newAttempts >= maxAttempts;
        const lockedUntil = isLocked ? new Date(Date.now() + lockDurationMins * 60 * 1000) : null;
        await prisma.loginAttempt.update({
          where: { id: existing.id },
          data: { attempts: newAttempts, lastAttempt: new Date(), lockedUntil },
        });
      } else {
        await prisma.loginAttempt.create({
          data: { ipAddress: rateLimitIp, email: emailLower, attempts: 1, lastAttempt: new Date() },
        });
      }
    } catch (dbErr) {
      console.error('Forgot password rate limit record error:', dbErr);
    }

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

    // 3. Generate a reset token (expires in 15 minutes) - signed with dynamic key (secret + password hash)
    const token = jwt.sign(
      { userId: user.id, email: user.email, purpose: 'reset-password' },
      JWT_SECRET + user.passwordHash,
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
