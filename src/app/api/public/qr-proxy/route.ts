const ALLOWED_QR_HOSTS = new Set(['qr.sepay.vn', 'api.vietqr.io']);
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_QR_BYTES = 2 * 1024 * 1024;

async function readLimitedBody(response: Response): Promise<ArrayBuffer> {
  if (!response.body) {
    throw new Error('QR provider returned an empty body.');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_QR_BYTES) {
        await reader.cancel('QR image is too large.');
        throw new Error('QR image is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output.buffer;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get('url');
    if (!rawUrl) {
      return new Response('Missing URL parameter', { status: 400 });
    }

    let qrUrl: URL;
    try {
      qrUrl = new URL(rawUrl);
    } catch {
      return new Response('Invalid URL', { status: 400 });
    }

    if (
      qrUrl.protocol !== 'https:' ||
      !ALLOWED_QR_HOSTS.has(qrUrl.hostname) ||
      qrUrl.username ||
      qrUrl.password
    ) {
      return new Response('Invalid host', { status: 400 });
    }

    const response = await fetch(qrUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'image/png,image/jpeg,image/webp' },
    });
    if (!response.ok) {
      return new Response('Failed to fetch QR image', { status: 502 });
    }

    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_QR_BYTES) {
      return new Response('QR image is too large', { status: 413 });
    }

    const contentType = (response.headers.get('content-type') || '')
      .split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return new Response('QR provider returned an invalid content type', { status: 502 });
    }

    const image = await readLimitedBody(response);
    return new Response(image, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(image.byteLength),
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('QR Proxy error:', error);
    return new Response('Unable to fetch QR image', { status: 502 });
  }
}
