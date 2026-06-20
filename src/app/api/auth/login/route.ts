import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ email và mật khẩu.' },
        { status: 400 }
      );
    }

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        actionLabel: 'Đăng nhập thất bại',
        module: 'auth',
        description: `Đăng nhập thất bại với email: ${email}`,
        request: req,
        status: 'failed',
        errorMessage: 'Email hoặc mật khẩu không chính xác.'
      });
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác.' },
        { status: 400 }
      );
    }

    // 2. Check password
    const passwordMatch = comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        actionLabel: 'Đăng nhập thất bại',
        module: 'auth',
        description: `Đăng nhập thất bại với email: ${email}`,
        request: req,
        status: 'failed',
        errorMessage: 'Email hoặc mật khẩu không chính xác.'
      });
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác.' },
        { status: 400 }
      );
    }

    // 3. Check status
    if (user.status === 'inactive') {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        actionLabel: 'Đăng nhập thất bại',
        module: 'auth',
        description: `Tài khoản ${user.email} đăng nhập thất bại do ngừng hoạt động`,
        request: req,
        status: 'failed',
        errorMessage: 'Tài khoản của bạn đã bị ngừng hoạt động.'
      });
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị ngừng hoạt động.' },
        { status: 403 }
      );
    }

    if (user.status === 'locked') {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        actionLabel: 'Đăng nhập thất bại',
        module: 'auth',
        description: `Tài khoản ${user.email} đăng nhập thất bại do bị khóa`,
        request: req,
        status: 'failed',
        errorMessage: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.'
      });
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' },
        { status: 403 }
      );
    }

    // 4. Generate token
    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // 5. Build response and set HttpOnly Cookie
    const response = NextResponse.json({
      message: 'Đăng nhập thành công!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    await createAuditLog({
      actor: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      action: 'LOGIN_SUCCESS',
      actionLabel: 'Đăng nhập thành công',
      module: 'auth',
      description: `${user.name} đã đăng nhập vào hệ thống`,
      request: req,
      status: 'success'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi máy chủ trong quá trình đăng nhập.' },
      { status: 500 }
    );
  }
}

