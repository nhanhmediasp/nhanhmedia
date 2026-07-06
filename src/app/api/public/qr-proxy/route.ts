import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return new Response('Missing URL parameter', { status: 400 });
    }

    // Basic validation of host
    if (!url.startsWith('https://qr.sepay.vn/') && !url.startsWith('https://api.vietqr.io/')) {
      return new Response('Invalid host', { status: 400 });
    }

    const response = await fetch(url);
    if (!response.ok) {
      return new Response(`Failed to fetch QR image: ${response.statusText}`, { status: response.status });
    }

    const blob = await response.blob();
    return new Response(blob, {
      headers: {
        'Content-Type': blob.type || 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('QR Proxy error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
