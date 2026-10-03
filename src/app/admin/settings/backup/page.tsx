'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { AlertTriangle, Database, Download, FileJson, Upload } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, PageHeader, showToast } from '@/components/ui';

interface BackupPreview {
  file: File;
  document: Record<string, unknown>;
  createdAt: string;
  records: number;
}

export default function BackupSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [confirmation, setConfirmation] = useState('');

  const downloadBackup = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/admin/backup', { cache: 'no-store' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Không thể tạo backup.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || 'nhanh-media-backup.json';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast('Đã tạo và tải file backup.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tạo backup.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const selectBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      showToast('File backup vượt quá giới hạn 100 MB.', 'error');
      return;
    }

    try {
      const document = JSON.parse(await file.text()) as Record<string, unknown>;
      if (document.format !== 'nhanh-media-backup' || document.version !== 1) {
        throw new Error('File không đúng định dạng backup Nhanh Media.');
      }
      const tables = document.tables as Record<string, unknown[]> | undefined;
      if (!tables || typeof tables !== 'object') throw new Error('File backup thiếu dữ liệu.');
      const records = Object.values(tables).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
      setPreview({
        file,
        document,
        records,
        createdAt: typeof document.createdAt === 'string' ? document.createdAt : '',
      });
      setConfirmation('');
    } catch (error) {
      setPreview(null);
      showToast(error instanceof Error ? error.message : 'Không thể đọc file backup.', 'error');
    }
  };

  const restore = async () => {
    if (!preview || confirmation !== 'RESTORE') return;
    setRestoring(true);
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup: preview.document, confirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể khôi phục backup.');
      showToast(data.message || 'Khôi phục dữ liệu thành công.', 'success');
      setPreview(null);
      setConfirmation('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể khôi phục backup.', 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup & Khôi phục"
        description="Xuất toàn bộ database và cài đặt để chuyển hệ thống sang máy chủ khác."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Tạo bản backup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              File JSON chứa toàn bộ dữ liệu, tài khoản, mật khẩu đã băm, cấu hình SMTP và các khóa tích hợp.
              Hãy lưu file ở nơi riêng tư và không gửi qua kênh công khai.
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 leading-relaxed">
              Ảnh trong <code>public/uploads</code> không nằm trong file này. URL ảnh bên ngoài vẫn được giữ nguyên.
            </div>
            <Button onClick={downloadBackup} loading={exporting} className="flex items-center gap-2 cursor-pointer">
              <Download className="w-4 h-4" />
              Tải bản backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Khôi phục dữ liệu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={selectBackup}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <FileJson className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <span className="text-sm font-bold text-slate-700">Chọn file backup JSON</span>
              <span className="block text-xs text-slate-500 mt-1">Tối đa 100 MB</span>
            </button>

            {preview && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="font-bold text-slate-800 break-all">{preview.file.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {preview.records.toLocaleString('vi-VN')} bản ghi
                    {preview.createdAt && ` • ${new Date(preview.createdAt).toLocaleString('vi-VN')}`}
                  </div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <div className="flex gap-2 text-rose-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      Thao tác này sẽ xóa toàn bộ dữ liệu hiện tại và thay bằng dữ liệu trong file. Quá trình chạy trong
                      một transaction: nếu lỗi, database hiện tại sẽ được giữ nguyên.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nhập RESTORE để xác nhận
                  </label>
                  <input
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="RESTORE"
                    autoComplete="off"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <Button
                  onClick={restore}
                  loading={restoring}
                  disabled={confirmation !== 'RESTORE'}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  Xóa dữ liệu cũ và khôi phục
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Dùng với Vercel:</strong> deploy cùng source code, cấu hình một PostgreSQL
            bên ngoài qua <code>DATABASE_URL</code>, chạy migration rồi mở trang này để restore. File upload nội bộ cần
            chuyển sang Vercel Blob, S3 hoặc dịch vụ object storage tương đương. Biến môi trường không được đưa vào
            backup; tối thiểu cần cấu hình lại <code>DATABASE_URL</code>, <code>JWT_SECRET</code>, <code>CRON_SECRET</code>
            và giữ nguyên <code>SMTP_ENCRYPTION_KEY</code> cũ để đọc được mật khẩu SMTP đã mã hóa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
