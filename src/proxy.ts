import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge, getAuthToken } from './lib/auth-edge';
import { TOKEN_COOKIE_NAME } from './lib/auth';

/**
 * Chỉ các đuôi file tĩnh này mới được bỏ qua kiểm tra đăng nhập.
 *
 * Trước đây điều kiện là `pathname.includes('.')`, nghĩa là BẤT KỲ đường dẫn nào
 * chứa dấu chấm cũng bỏ qua middleware — kể cả /api/... với tham số động chứa
 * dấu chấm. Nhiều route /api/admin/* không tự kiểm tra quyền mà chỉ dựa vào
 * middleware, nên đây là lỗ hổng chờ ngày phát nổ.
 */
const STATIC_FILE_EXTENSIONS = new Set([
  'ico', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif',
  'css', 'js', 'mjs', 'map',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'txt', 'xml', 'webmanifest', 'json',
  'mp4', 'webm', 'mp3', 'pdf',
]);

function isStaticAsset(pathname: string): boolean {
  const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex <= 0) return false;
  return STATIC_FILE_EXTENSIONS.has(lastSegment.substring(dotIndex + 1).toLowerCase());
}

export async function proxy(req: NextRequest) {
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
    pathname.startsWith('/api/cron') || // Cron job has its own token protection
    pathname.startsWith('/api/public/') || // Public settings API
    pathname.startsWith('/api/webhooks/') || // Webhooks like SePay have their own API key / signature verification
    (!pathname.startsWith('/api/') && isStaticAsset(pathname)) || // Static files like favicon.ico, logo.png
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
    // The application is admin-only. Reject and clear every non-admin session.
    if (user.role !== 'admin') {
      // API phải trả JSON 403, không redirect (fetch() sẽ đi theo redirect và
      // nhận về HTML trang login → client báo lỗi parse khó hiểu).
      if (pathname.startsWith('/api/')) {
        const response = new NextResponse(
          JSON.stringify({ error: 'Không có quyền truy cập.' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
        response.cookies.delete(TOKEN_COOKIE_NAME);
        return response;
      }

      const response = NextResponse.redirect(new NextUrl('/login', req.url));
      response.cookies.delete(TOKEN_COOKIE_NAME);
      return response;
    }

    if (pathname === '/login' || pathname === '/') {
      return NextResponse.redirect(new NextUrl('/admin/dashboard', req.url));
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
