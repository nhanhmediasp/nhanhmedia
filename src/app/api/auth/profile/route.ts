import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/auth';

export async function PUT(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, oldPassword, newPassword } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên hiển thị là bắt buộc.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại.' }, { status: 404 });
    }

    const updateData: any = {
      name: name.trim(),
      phone: phone ? phone.trim() : null,
    };

    // If trying to change password
    if (newPassword && newPassword.trim() !== '') {
      if (!oldPassword) {
        return NextResponse.json({ error: 'Vui lòng cung cấp mật khẩu hiện tại.' }, { status: 400 });
      }

      const match = comparePassword(oldPassword, user.passwordHash);
      if (!match) {
        return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác.' }, { status: 400 });
      }

      updateData.passwordHash = hashPassword(newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Cập nhật trang cá nhân thành công!',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật trang cá nhân.' }, { status: 500 });
  }
}
