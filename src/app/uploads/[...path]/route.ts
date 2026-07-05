import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
};

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    if (!path || path.length === 0) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    
    // Resolve the real path of uploadDir to support symlinks
    let realUploadDir = uploadDir;
    try {
      realUploadDir = await fs.realpath(uploadDir);
    } catch (e) {
      // If it doesn't exist yet, we will just proceed with the text path
    }

    const targetPath = resolve(realUploadDir, ...path);

    // Security check: Prevent directory traversal (ensure it is within the uploads directory)
    let realTargetPath = targetPath;
    try {
      realTargetPath = await fs.realpath(targetPath);
    } catch (e) {
      // File doesn't exist, will be handled by readFile catch
    }

    if (!realTargetPath.startsWith(realUploadDir)) {
      return new NextResponse('Access Denied', { status: 403 });
    }

    try {
      const fileBuffer = await fs.readFile(realTargetPath);
      const contentType = getMimeType(realTargetPath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (err) {
      return new NextResponse('File Not Found', { status: 404 });
    }
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
