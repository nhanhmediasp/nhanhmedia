import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge, getAuthToken } from './lib/auth-edge';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Skip static resources, images, icons, and next internals
  if (
    pathname.startsWith('/_next') ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' || // Allow login/logout APIs without authentication
    pathname.startsWith('/api/cron') || // Cron job has its own token protection
    pathname.startsWith('/api/public/') || // Public settings API
    pathname.includes('.') || // Static files like favicon.ico, logo.png
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Get auth token
  const token = getAuthToken(req);
  const user = token ? await verifyTokenEdge(token) : null;

  // 3. User is authenticated
  if (user) {
    // If trying to access /login, redirect to correct dashboard
    if (pathname === '/login' || pathname === '/') {
      const dashboardPath = user.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      return NextResponse.redirect(new NextUrl(dashboardPath, req.url));
    }

    // Protect Admin routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (user.role !== 'admin') {
        // Not admin, redirect to user dashboard or return 403
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Không có quyền truy cập.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return NextResponse.redirect(new NextUrl('/dashboard', req.url));
      }
    }

    // Set user headers for easy access in API routes / Server Components
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-email', user.email);
    requestHeaders.set('x-user-name', user.name);
    requestHeaders.set('x-user-role', user.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 4. User is NOT authenticated
  // Allow login page access
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Redirect to login or return 401 for api routes
  if (pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ error: 'Chưa đăng nhập.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // If root page, redirect to login
  return NextResponse.redirect(new NextUrl('/login', req.url));
}

// Helper to safely construct NextUrl (prevents issues with relative urls)
class NextUrl extends URL {
  constructor(path: string, base: string) {
    super(path, base);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (handled inside)
     * - api/cron (handled inside)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo (brand assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo-).*)',
  ],
};
