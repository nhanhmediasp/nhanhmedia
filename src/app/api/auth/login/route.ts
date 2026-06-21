import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, signToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

export async function POST(req: Request) {
  const ip = getClientIP(req);

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ email và mật khẩu.' },
        { status: 400 }
      );
    }

    // Load website settings for login lock config
    const websiteSettings = await prisma.websiteSettings.findUnique({
      where: { id: 'default' }
    });
    const lockEnabled = websiteSettings?.loginLockEnabled ?? true;
    const maxAttempts = websiteSettings?.loginMaxAttempts ?? 5;
    const lockDurationMins = websiteSettings?.loginLockDurationMins ?? 15;

    // Check login attempt block (per IP) if lock is enabled
    if (lockEnabled) {
      const existingAttempt = await prisma.loginAttempt.findFirst({
        where: { ipAddress: ip }
      });

      if (existingAttempt) {
        // Check if still locked
        if (existingAttempt.lockedUntil && existingAttempt.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((existingAttempt.lockedUntil.getTime() - Date.now()) / 60000);
          return NextResponse.json(
            { error: `Địa chỉ IP của bạn đã bị tạm khóa do đăng nhập sai quá ${maxAttempts} lần. Vui lòng thử lại sau ${minutesLeft} phút.` },
            { status: 429 }
          );
        }

        // Reset if lock window has expired (older than lockDurationMins)
        const lockWindowStart = new Date(Date.now() - lockDurationMins * 60 * 1000);
        if (existingAttempt.lastAttempt < lockWindowStart) {
          // Reset attempts since window expired
          await prisma.loginAttempt.update({
            where: { id: existingAttempt.id },
            data: { attempts: 0, lockedUntil: null, lastAttempt: new Date() }
          });
        }
      }
    }

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      if (lockEnabled) {
        await recordFailedAttempt(ip, email, maxAttempts, lockDurationMins);
      }
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
      if (lockEnabled) {
        const attemptResult = await recordFailedAttempt(ip, email, maxAttempts, lockDurationMins);
        if (attemptResult.isLocked) {
          await createAuditLog({
            action: 'LOGIN_FAILED',
            actionLabel: 'Đăng nhập thất bại - IP bị khóa',
            module: 'auth',
            description: `IP ${ip} bị khóa sau ${maxAttempts} lần đăng nhập sai liên tiếp`,
            request: req,
            status: 'failed',
            errorMessage: `Tài khoản tạm khóa sau ${maxAttempts} lần sai`
          });
          return NextResponse.json(
            { error: `Đăng nhập sai quá ${maxAttempts} lần. Địa chỉ IP của bạn bị tạm khóa trong ${lockDurationMins} phút.` },
            { status: 429 }
          );
        }
        const remaining = maxAttempts - attemptResult.attempts;
        if (remaining > 0 && remaining <= 2) {
          await createAuditLog({
            action: 'LOGIN_FAILED',
            actionLabel: 'Đăng nhập thất bại',
            module: 'auth',
            description: `Đăng nhập thất bại với email: ${email} (còn ${remaining} lần trước khi khóa)`,
            request: req,
            status: 'failed',
            errorMessage: 'Email hoặc mật khẩu không chính xác.'
          });
          return NextResponse.json(
            { error: `Email hoặc mật khẩu không chính xác. Còn ${remaining} lần thử trước khi bị khóa.` },
            { status: 400 }
          );
        }
      }
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

    // 4. Login success - clear failed attempts for this IP
    if (lockEnabled) {
      await prisma.loginAttempt.deleteMany({ where: { ipAddress: ip } });
    }

    // 5. Generate token
    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // 6. Build response and set HttpOnly Cookie
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

async function recordFailedAttempt(ip: string, email: string, maxAttempts: number, lockDurationMins: number): Promise<{ attempts: number; isLocked: boolean }> {
  const existing = await prisma.loginAttempt.findFirst({ where: { ipAddress: ip } });

  if (existing) {
    const newAttempts = existing.attempts + 1;
    const isLocked = newAttempts >= maxAttempts;
    const lockedUntil = isLocked ? new Date(Date.now() + lockDurationMins * 60 * 1000) : null;

    await prisma.loginAttempt.update({
      where: { id: existing.id },
      data: {
        attempts: newAttempts,
        lastAttempt: new Date(),
        email,
        lockedUntil,
      }
    });
    return { attempts: newAttempts, isLocked };
  } else {
    await prisma.loginAttempt.create({
      data: {
        ipAddress: ip,
        email,
        attempts: 1,
        lastAttempt: new Date(),
      }
    });
    return { attempts: 1, isLocked: false };
  }
}
