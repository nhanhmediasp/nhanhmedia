import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Thiếu các thông tin đăng ký bắt buộc.' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: emailLower }
    });

    if (existing) {
      return NextResponse.json({ error: 'Địa chỉ Email này đã được đăng ký sử dụng.' }, { status: 400 });
    }

    // 2. Hash password and create user
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        phone: phone ? phone.trim() : null,
        passwordHash: hashPassword(password),
        role: 'collaborator', // Default role is CTV
        status: 'active'
      }
    });

    // 3. Send welcome email (optional, do not fail registration if SMTP is not configured or fails)
    try {
      const smtpSettings = await prisma.emailSettings.findUnique({
        where: { id: 'default' }
      });

      if (smtpSettings) {
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

        await transporter.sendMail({
          from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
          to: emailLower,
          subject: 'Chào mừng bạn đến với Nhanh Media!',
          html: `<p>Xin chào <strong>${newUser.name}</strong>,</p>
                 <p>Tài khoản Cộng tác viên của bạn đã được đăng ký thành công trên hệ thống <strong>Nhanh Media</strong>.</p>
                 <p><strong>Thông tin đăng nhập của bạn:</strong></p>
                 <ul>
                   <li><strong>Email đăng nhập:</strong> ${emailLower}</li>
                   <li><strong>Vai trò:</strong> Cộng tác viên (CTV)</li>
                 </ul>
                 <p>Vui lòng đăng nhập hệ thống để bắt đầu tạo đơn hàng và theo dõi doanh thu.</p>
                 <p>Trân trọng,<br>Đội ngũ Nhanh Media</p>`
        });
      }
    } catch (emailErr) {
      console.error('Failed to send registration welcome email:', emailErr);
    }

    // 4. Log audit log
    await createAuditLog({
      actor: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      action: 'USER_REGISTER',
      actionLabel: 'Đăng ký tài khoản mới',
      module: 'auth',
      entityType: 'User',
      entityId: newUser.id,
      entityName: newUser.email,
      description: `Người dùng ${newUser.name} tự đăng ký tài khoản mới qua trang Register`,
      newValues: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status
      },
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Đăng ký tài khoản thành công!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi máy chủ trong quá trình đăng ký.' }, { status: 500 });
  }
}
