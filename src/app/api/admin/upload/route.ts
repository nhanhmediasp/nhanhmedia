import { basename } from 'path';
import { NextResponse } from 'next/server';
import {
  ensureMediaBucket,
  getStorageConfig,
  mediaAppUrl,
  mediaObjectPath,
} from '@/lib/supabase-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'ico']);

function isValidImageSignature(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;
  const hex = buffer.toString('hex', 0, 4).toUpperCase();

  if (ext === 'png') return hex === '89504E47';
  if (ext === 'jpg' || ext === 'jpeg') return hex.startsWith('FFD8FF');
  if (ext === 'gif') return hex === '47494638';
  if (ext === 'webp') {
    return buffer.length >= 12 && hex === '52494646' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  if (ext === 'ico') return hex === '00000100';
  return false;
}

function imageContentType(ext: string): string {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'ico') return 'image/x-icon';
  return `image/${ext}`;
}

function isAdmin(req: Request): boolean {
  return req.headers.get('x-user-role') === 'admin';
}

export async function POST(req: Request) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền tải tệp.' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Không tìm thấy file tải lên.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Kích thước ảnh tối đa là 2MB.' }, { status: 400 });
    }

    const originalName = basename(file.name);
    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: 'Định dạng file không được hỗ trợ.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isValidImageSignature(buffer, ext)) {
      return NextResponse.json({ error: 'Nội dung file ảnh không hợp lệ.' }, { status: 400 });
    }

    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    await ensureMediaBucket();
    const { client, bucket } = getStorageConfig();
    const { error } = await client.storage.from(bucket).upload(mediaObjectPath(uniqueName), buffer, {
      contentType: imageContentType(ext),
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw new Error(error.message);

    // Keep historical /uploads URLs so restored database rows need no rewrite.
    return NextResponse.json({ success: true, url: mediaAppUrl(uniqueName) });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Không thể tải ảnh lên Supabase Storage.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền xem thư viện.' }, { status: 403 });
    }

    await ensureMediaBucket();
    const { client, bucket, prefix } = getStorageConfig();
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) throw new Error(error.message);

    const files = (data || [])
      .filter((item) => item.name && item.id)
      .map((item) => ({
        name: item.name,
        url: mediaAppUrl(item.name),
        size: Number(item.metadata?.size || 0),
        createdAt: item.created_at || item.updated_at || new Date(0).toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('File list error:', error);
    return NextResponse.json({ error: 'Không thể tải thư viện ảnh từ Supabase Storage.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!isAdmin(req)) {
      return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền xóa tệp.' }, { status: 403 });
    }

    const fileName = new URL(req.url).searchParams.get('name');
    if (!fileName) {
      return NextResponse.json({ error: 'Thiếu tên file cần xóa.' }, { status: 400 });
    }

    const sanitizedName = basename(fileName);
    if (sanitizedName !== fileName || sanitizedName.startsWith('.')) {
      return NextResponse.json({ error: 'Đường dẫn không hợp lệ.' }, { status: 400 });
    }

    await ensureMediaBucket();
    const { client, bucket } = getStorageConfig();
    const { error } = await client.storage.from(bucket).remove([mediaObjectPath(sanitizedName)]);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, message: 'Đã xóa file thành công.' });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json({ error: 'Không thể xóa ảnh khỏi Supabase Storage.' }, { status: 500 });
  }
}
