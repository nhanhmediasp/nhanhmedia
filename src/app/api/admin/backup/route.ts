import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit';
import {
  createBackup,
  getBackupRecordCount,
  restoreBackup,
  validateBackupDocument,
} from '@/lib/backup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAdmin(req: Request) {
  return req.headers.get('x-user-role') === 'admin';
}

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền tạo backup.' }, { status: 403 });
  }

  try {
    const backup = await createBackup();
    const date = backup.createdAt.slice(0, 10);

    await createAuditLog({
      action: 'EXPORT_BACKUP',
      actionLabel: 'Xuất bản backup',
      module: 'settings',
      entityType: 'Backup',
      description: `Đã xuất backup gồm ${getBackupRecordCount(backup)} bản ghi`,
      request: req,
    });

    return new NextResponse(JSON.stringify(backup), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="nhanh-media-backup-${date}.json"`,
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Create backup error:', error);
    return NextResponse.json({ error: 'Không thể tạo backup. Vui lòng thử lại.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Chỉ quản trị viên mới có quyền khôi phục dữ liệu.' }, { status: 403 });
  }

  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 100 * 1024 * 1024) {
    return NextResponse.json({ error: 'File backup vượt quá giới hạn 100 MB.' }, { status: 413 });
  }

  try {
    const body = await req.json();
    if (body?.confirmation !== 'RESTORE') {
      return NextResponse.json({ error: 'Thiếu mã xác nhận RESTORE.' }, { status: 400 });
    }

    const backup = validateBackupDocument(body.backup);
    const counts = await restoreBackup(backup);

    await createAuditLog({
      action: 'RESTORE_BACKUP',
      actionLabel: 'Khôi phục bản backup',
      module: 'settings',
      entityType: 'Backup',
      description: `Đã khôi phục backup tạo lúc ${backup.createdAt}`,
      request: req,
    });

    return NextResponse.json({
      message: 'Khôi phục dữ liệu thành công.',
      restoredAt: new Date().toISOString(),
      counts,
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    const message = error instanceof Error ? error.message : 'File backup không hợp lệ.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
