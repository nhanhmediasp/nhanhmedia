import { NextResponse, NextRequest } from 'next/server';
import { TOKEN_COOKIE_NAME, verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
    let actor = null;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        actor = decoded;
      }
    }

    const response = NextResponse.json({
      message: 'Đăng xuất thành công!',
    });

    // Clear auth cookie
    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    if (actor) {
      await createAuditLog({
        actor,
        action: 'LOGOUT',
        actionLabel: 'Đăng xuất',
        module: 'auth',
        description: `${actor.name} đã đăng xuất khỏi hệ thống`,
        request: req,
        status: 'success'
      });
    }

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi máy chủ trong quá trình đăng xuất.' },
      { status: 500 }
    );
  }
}

