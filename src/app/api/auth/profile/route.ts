import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function PUT(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, oldPassword, newPassword, avatarUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên hiển thị là bắt buộc.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Tài khoản không tồn tại.' }, { status: 404 });
    }

    const oldValues = { name: user.name, email: user.email, phone: user.phone };

    const updateData: any = {
      name: name.trim(),
      phone: phone ? phone.trim() : null,
      avatarUrl: avatarUrl ? avatarUrl.trim() : null,
    };

    if (email && email.toLowerCase().trim() !== user.email.toLowerCase()) {
      const emailLower = email.toLowerCase().trim();
      const existingEmail = await prisma.user.findFirst({
        where: { email: emailLower },
      });
      if (existingEmail) {
        return NextResponse.json({ error: 'Địa chỉ Email này đã được sử dụng.' }, { status: 400 });
      }
      updateData.email = emailLower;
    }

    // If trying to change password
    const changedPassword = newPassword && newPassword.trim() !== '';
    if (changedPassword) {
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

    const newValues = { name: updated.name, email: updated.email, phone: updated.phone };

    await createAuditLog({
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      action: changedPassword ? 'CHANGE_PASSWORD' : 'UPDATE_USER_PROFILE',
      actionLabel: changedPassword ? 'Đổi mật khẩu' : 'Cập nhật trang cá nhân',
      module: 'auth',
      entityType: 'User',
      entityId: user.id,
      entityName: user.email,
      description: changedPassword 
        ? `${user.name} đã đổi mật khẩu và cập nhật trang cá nhân`
        : `${user.name} đã cập nhật thông tin trang cá nhân`,
      oldValues: changedPassword ? { ...oldValues, passwordHash: '••••••••' } : oldValues,
      newValues: changedPassword ? { ...newValues, passwordHash: '••••••••' } : newValues,
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Cập nhật trang cá nhân thành công!',
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật trang cá nhân.' }, { status: 500 });
  }
}

