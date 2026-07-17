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

/** Safely load website security settings — never throws */
// NOTE: Enforce login rate limiting regardless of DB configuration.
async function getSecuritySettings() {
  try {
    const settings = await prisma.websiteSettings.findUnique({
      where: { id: 'default' },
      select: { loginLockEnabled: true, loginMaxAttempts: true, loginLockDurationMins: true },
    });
    // If the setting is missing or explicitly false, we still enable the lock.
    const lockEnabled = settings?.loginLockEnabled ?? true;
    const effectiveLockEnabled = lockEnabled === false ? true : lockEnabled;
    return {
      lockEnabled: effectiveLockEnabled,
      maxAttempts: settings?.loginMaxAttempts ?? 5,
      lockDurationMins: settings?.loginLockDurationMins ?? 15,
    };
  } catch {
    // Table may not exist yet — fall back to enabled
    return { lockEnabled: true, maxAttempts: 5, lockDurationMins: 15 };
  }
}

/** Record a failed attempt and return the new state — never throws */
async function recordFailedAttempt(
  ip: string,
  email: string,
  maxAttempts: number,
  lockDurationMins: number
): Promise<{ attempts: number; isLocked: boolean }> {
  try {
    const existing = await prisma.loginAttempt.findFirst({ where: { ipAddress: ip } });

    if (existing) {
      const newAttempts = existing.attempts + 1;
      const isLocked = newAttempts >= maxAttempts;
      const lockedUntil = isLocked ? new Date(Date.now() + lockDurationMins * 60 * 1000) : null;

      await prisma.loginAttempt.update({
        where: { id: existing.id },
        data: { attempts: newAttempts, lastAttempt: new Date(), email, lockedUntil },
      });
      return { attempts: newAttempts, isLocked };
    } else {
      await prisma.loginAttempt.create({
        data: { ipAddress: ip, email, attempts: 1, lastAttempt: new Date() },
      });
      return { attempts: 1, isLocked: false };
    }
  } catch {
    return { attempts: 1, isLocked: false };
  }
}

/** Clear failed attempts on successful login — never throws */
async function clearAttempts(ip: string) {
  try {
    await prisma.loginAttempt.deleteMany({ where: { ipAddress: ip } });
  } catch {
    // Ignore
  }
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

    // Load security settings (safe — never throws)
    const { lockEnabled, maxAttempts, lockDurationMins } = await getSecuritySettings();

    // Check if IP is currently locked
    if (lockEnabled) {
      try {
        const existingAttempt = await prisma.loginAttempt.findFirst({
          where: { ipAddress: ip },
        });

        if (existingAttempt) {
          // Still within lock period?
          if (existingAttempt.lockedUntil && existingAttempt.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil(
              (existingAttempt.lockedUntil.getTime() - Date.now()) / 60000
            );
            return NextResponse.json(
              {
                error: `Địa chỉ IP của bạn đã bị tạm khóa do đăng nhập sai quá ${maxAttempts} lần. Vui lòng thử lại sau ${minutesLeft} phút.`,
              },
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
      } catch {
        // Ignore — don't block login if attempt table is unavailable
      }
    }

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      if (lockEnabled) await recordFailedAttempt(ip, email, maxAttempts, lockDurationMins);
      await createAuditLog({
        action: 'LOGIN_FAILED',
        actionLabel: 'Đăng nhập thất bại',
        module: 'auth',
        description: `Đăng nhập thất bại với email: ${email}`,
        request: req,
        status: 'failed',
        errorMessage: 'Email hoặc mật khẩu không chính xác.',
      });
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác.' },
        { status: 400 }
      );
    }

    // 2. Check password
    if (!user.passwordHash) {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        actionLabel: 'Đăng nhập thất bại',
        module: 'auth',
        entityType: 'User',
        entityId: user.id,
        entityName: user.email,
        description: `Đăng nhập thất bại: Tài khoản nhân sự ${user.email} không có mật khẩu.`,
        request: req,
        status: 'failed',
        errorMessage: 'Tài khoản này không hỗ trợ đăng nhập.',
      });
      return NextResponse.json(
        { error: 'Tài khoản này không hỗ trợ đăng nhập.' },
        { status: 400 }
      );
    }

    const passwordMatch = comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      let errorMsg = 'Email hoặc mật khẩu không chính xác.';

      if (lockEnabled) {
        const attemptResult = await recordFailedAttempt(ip, email, maxAttempts, lockDurationMins);

        if (attemptResult.isLocked) {
          await createAuditLog({
            action: 'LOGIN_FAILED',
            actionLabel: 'Đăng nhập thất bại - IP bị khóa',
            module: 'auth',
            description: `IP ${ip} bị khóa sau ${maxAttempts} lần sai liên tiếp`,
            request: req,
            status: 'failed',
            errorMessage: `IP bị khóa sau ${maxAttempts} lần sai`,
          });
          return NextResponse.json(
            {
              error: `Đăng nhập sai quá ${maxAttempts} lần. IP của bạn bị tạm khóa trong ${lockDurationMins} phút.`,
            },
            { status: 429 }
          );
        }

        const remaining = maxAttempts - attemptResult.attempts;
        if (remaining > 0 && remaining <= 2) {
          errorMsg = `Email hoặc mật khẩu không chính xác. Còn ${remaining} lần thử trước khi bị khóa.`;
        }
      }

      await createAuditLog({
        action: 'LOGIN_FAILED',
        actionLabel: 'Đăng nhập thất bại',
        module: 'auth',
        description: `Đăng nhập thất bại với email: ${email}`,
        request: req,
        status: 'failed',
        errorMessage: 'Sai mật khẩu.',
      });
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // 2.5 Check role (only admin allowed)
    if (user.role !== 'admin') {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        actionLabel: 'Đăng nhập thất bại - Không đủ quyền',
        module: 'auth',
        description: `Tài khoản ${user.email} (vai trò: ${user.role}) thử đăng nhập nhưng không có quyền admin`,
        request: req,
        status: 'failed',
        errorMessage: 'Không có quyền truy cập hệ thống.',
      });
      return NextResponse.json(
        { error: 'Tài khoản của bạn không có quyền truy cập hệ thống. Chỉ quản trị viên mới được phép đăng nhập.' },
        { status: 403 }
      );
    }

    // 3. Check account status
    if (user.status === 'inactive') {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        actionLabel: 'Đăng nhập thất bại',
        module: 'auth',
        description: `Tài khoản ${user.email} bị ngừng hoạt động`,
        request: req,
        status: 'failed',
        errorMessage: 'Tài khoản đã bị ngừng hoạt động.',
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
        description: `Tài khoản ${user.email} bị khóa`,
        request: req,
        status: 'failed',
        errorMessage: 'Tài khoản bị khóa.',
      });
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' },
        { status: 403 }
      );
    }

    // 4. Login success — clear any failed attempts
    if (lockEnabled) await clearAttempts(ip);

    // 5. Generate token
    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // 6. Build response with HttpOnly cookie
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
      actor: { id: user.id, name: user.name, email: user.email, role: user.role },
      action: 'LOGIN_SUCCESS',
      actionLabel: 'Đăng nhập thành công',
      module: 'auth',
      description: `${user.name} đã đăng nhập vào hệ thống`,
      request: req,
      status: 'success',
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
