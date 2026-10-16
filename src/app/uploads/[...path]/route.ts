import { NextRequest, NextResponse } from 'next/server';
import { mediaPublicUrl } from '@/lib/supabase-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    if (!path?.length) return new NextResponse('File Not Found', { status: 404 });
    if (path.some((segment) => !segment || segment === '.' || segment === '..')) {
      return new NextResponse('Access Denied', { status: 403 });
    }

    // Existing database values remain /uploads/<name>; only storage changes.
    return NextResponse.redirect(mediaPublicUrl(path.join('/')), 307);
  } catch (error) {
    console.error('Media redirect error:', error);
    return new NextResponse('Storage is not configured', { status: 503 });
  }
}
