import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

const JWT_SECRET = process.env.JWT_SECRET || 'nhanh_media_fallback_jwt_secret_key_2026';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Thiếu thông tin đặt lại mật khẩu.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.' }, { status: 400 });
    }

    // 1. Verify token
    let decoded: any = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return NextResponse.json(
        { error: 'Mã khôi phục đã hết hạn hoặc không hợp lệ. Vui lòng gửi lại yêu cầu khôi phục mật khẩu.' },
        { status: 400 }
      );
    }

    if (!decoded || decoded.purpose !== 'reset-password') {
      return NextResponse.json({ error: 'Mã khôi phục không hợp lệ.' }, { status: 400 });
    }

    const { userId, email } = decoded;

    // 2. Fetch user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.email !== email) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại hoặc thông tin không trùng khớp.' }, { status: 404 });
    }

    // 3. Update password
    const passwordHash = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    // 4. Create Audit Log
    await createAuditLog({
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'RESET_PASSWORD_SUCCESS',
      actionLabel: 'Đặt lại mật khẩu thành công',
      module: 'auth',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email,
      description: `Đặt lại mật khẩu thành công qua link khôi phục email cho ${user.email}`,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
    });

  } catch (error) {
    console.error('Reset password API error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ đặt lại mật khẩu.' }, { status: 500 });
  }
}
