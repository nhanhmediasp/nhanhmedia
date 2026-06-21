import { NextResponse } from 'next/server';
import { writeFile, mkdir, chmod } from 'fs/promises';
import { join } from 'path';
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
