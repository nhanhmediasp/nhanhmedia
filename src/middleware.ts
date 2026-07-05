import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge, getAuthToken } from './lib/auth-edge';
import { TOKEN_COOKIE_NAME } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Defense-in-depth: Deny direct access to environment/git folders
  const pathLower = pathname.toLowerCase();
  if (
    pathLower.includes('/.env') ||
    pathLower.includes('/.git') ||
    pathLower.includes('/web.config') ||
    pathLower.includes('/htaccess')
  ) {
    return new NextResponse(
      JSON.stringify({ error: 'Truy cập bị từ chối.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Anti-spoofing: Strip all client-sent x-user-* headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete('x-user-id');
  requestHeaders.delete('x-user-email');
  requestHeaders.delete('x-user-name');
  requestHeaders.delete('x-user-role');

  // 1. Skip static resources, images, icons, and next internals
  if (
    pathname.startsWith('/_next') ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/auth/register' ||
    pathname === '/api/auth/forgot-password' ||
    pathname === '/api/auth/reset-password' ||
    pathname.startsWith('/api/cron') || // Cron job has its own token protection
    pathname.startsWith('/api/public/') || // Public settings API
    pathname.includes('.') || // Static files like favicon.ico, logo.png
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Get auth token
  const token = getAuthToken(req);
  const user = token ? await verifyTokenEdge(token) : null;

  // 3. User is authenticated
  if (user) {
    // Force only Admin role
    if (user.role !== 'admin') {
      const response = NextResponse.redirect(new NextUrl('/login', req.url));
      response.cookies.delete(TOKEN_COOKIE_NAME);
      return response;
    }

    // If trying to access login or guest pages, redirect to admin dashboard
    if (
      pathname === '/login' ||
      pathname === '/' ||
      pathname === '/register' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password'
    ) {
      return NextResponse.redirect(new NextUrl('/admin/dashboard', req.url));
    }

    // Protect Admin routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (user.role !== 'admin') {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Không có quyền truy cập.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        const response = NextResponse.redirect(new NextUrl('/login', req.url));
        response.cookies.delete(TOKEN_COOKIE_NAME);
        return response;
      }
    }

    // Set user headers for easy access in API routes / Server Components (verified data)
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
  // Redirect register, forgot-password, and reset-password to login (disabled)
  if (
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  ) {
    return NextResponse.redirect(new NextUrl('/login', req.url));
  }

  // Allow login page access
  if (pathname === '/login') {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
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
