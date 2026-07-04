import { NextResponse } from 'next/server';
import { writeFile, mkdir, chmod, readdir, stat, unlink } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save directory: public/uploads
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique name
    const ext = file.name.split('.').pop() || 'png';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = join(uploadDir, uniqueName);

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

