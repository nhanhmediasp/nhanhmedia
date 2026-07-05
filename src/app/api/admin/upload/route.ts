import { NextResponse } from 'next/server';
import { writeFile, mkdir, chmod, readdir, stat, unlink } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

function isValidImageSignature(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;
  
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  
  if (ext === 'png') {
    return hex === '89504E47';
  }
  if (ext === 'jpg' || ext === 'jpeg') {
    return hex.startsWith('FFD8FF');
  }
  if (ext === 'gif') {
    return hex === '47494638'; // "GIF8"
  }
  if (ext === 'webp') {
    const isRiff = hex === '52494646'; // "RIFF"
    if (buffer.length < 12) return false;
    const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
    return isRiff && isWebp;
  }
  if (ext === 'ico') {
    return hex === '00000100';
  }
  if (ext === 'svg') {
    // Check if it looks like XML/SVG text
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 120)).trim().toLowerCase();
    return text.startsWith('<svg') || text.startsWith('<?xml') || text.includes('<svg');
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (!role || role === 'guest') {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện hành động này.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file tải lên.' }, { status: 400 });
    }

    // 1. Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Kích thước file vượt quá giới hạn cho phép (tối đa 5MB).' }, { status: 400 });
    }

    // 2. Validate file extension
    const originalName = basename(file.name);
    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'ico', 'svg'];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'Định dạng file không được hỗ trợ.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Validate Magic Bytes (verify actual content matches extension)
    if (!isValidImageSignature(buffer, ext)) {
      return NextResponse.json({ error: 'Nội dung file ảnh không hợp lệ hoặc giả dạng ảnh.' }, { status: 400 });
    }

    // Save directory: public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique name
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = join(uploadDir, uniqueName);

    // 4. Path traversal safety check
    if (!filePath.startsWith(uploadDir)) {
      return NextResponse.json({ error: 'Đường dẫn lưu file không hợp lệ.' }, { status: 400 });
    }

    await writeFile(filePath, buffer);
    // Phân quyền cho file vừa ghi để Nginx/Webserver có thể đọc được (đọc/ghi cho Owner, chỉ đọc cho Group/Others)
    await chmod(filePath, 0o644);

    const fileUrl = `/uploads/${uniqueName}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: `Lỗi máy chủ khi tải ảnh lên: ${error?.message || error}` }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (!role || role === 'guest') {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện hành động này.' }, { status: 401 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      return NextResponse.json({ success: true, files: [] });
    }

    const fileNames = await readdir(uploadDir);
    const files = [];

    for (const name of fileNames) {
      if (name.startsWith('.')) continue; // bỏ qua các file ẩn
      const filePath = join(uploadDir, name);
      try {
        const stats = await stat(filePath);
        if (stats.isFile()) {
          files.push({
            name,
            url: `/uploads/${name}`,
            size: stats.size,
            createdAt: stats.mtime,
          });
        }
      } catch (err) {
        // bỏ qua nếu lỗi file đơn lẻ
      }
    }

    // Sắp xếp file mới nhất lên đầu
    files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    console.error('File list error:', error);
    return NextResponse.json({ error: `Lỗi máy chủ khi lấy danh sách ảnh: ${error?.message || error}` }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const role = req.headers.get('x-user-role');
    if (!role || role === 'guest') {
      return NextResponse.json({ error: 'Bạn cần đăng nhập để thực hiện hành động này.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('name');

    if (!fileName) {
      return NextResponse.json({ error: 'Thiếu tên file cần xóa.' }, { status: 400 });
    }

    const sanitizedName = basename(fileName);
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadDir, sanitizedName);

    // Path traversal check
    if (!filePath.startsWith(uploadDir)) {
      return NextResponse.json({ error: 'Đường dẫn không hợp lệ.' }, { status: 400 });
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File không tồn tại.' }, { status: 404 });
    }

    await unlink(filePath);
    return NextResponse.json({ success: true, message: 'Đã xóa file thành công.' });
  } catch (error: any) {
    console.error('File delete error:', error);
    return NextResponse.json({ error: `Lỗi máy chủ khi xóa file: ${error?.message || error}` }, { status: 500 });
  }
}

