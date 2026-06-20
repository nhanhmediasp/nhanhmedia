'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, showToast, PageHeader, LoadingSkeleton } from '@/components/ui';
import { Settings, ShieldCheck, Mail, ArrowRight } from 'lucide-react';

export default function AdminEmailSettingsPage() {
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState('true');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/email');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSmtpHost(data.settings.smtpHost || '');
          setSmtpPort(String(data.settings.smtpPort || '465'));
          setSmtpUser(data.settings.smtpUser || '');
          setSmtpPassword(data.settings.smtpPasswordEncrypted || '');
          setSmtpSecure(String(data.settings.smtpSecure));
          setFromName(data.settings.fromName || '');
          setFromEmail(data.settings.fromEmail || '');
        }
      } else {
        showToast('Không thể tải cấu hình SMTP.', 'error');
      }
    } catch (error) {
      console.error('Fetch SMTP settings error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpHost || !smtpPort || !smtpUser || !fromName || !fromEmail) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost,
          smtpPort: parseInt(smtpPort),
          smtpUser,
          smtpPassword,
          smtpSecure: smtpSecure === 'true',
          fromName,
          fromEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Đã lưu cấu hình SMTP thành công!', 'success');
        setSmtpPassword('••••••••'); // Reset password display to masked
      } else {
        showToast(data.error || 'Lỗi khi lưu cấu hình.', 'error');
      }
    } catch (error) {
      console.error('Save SMTP settings error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Cấu hình SMTP gửi Email" 
          description="Thiết lập tài khoản máy chủ email để tự động gửi thông báo nhắc hạn dịch vụ tới khách hàng."
        />
        <LoadingSkeleton variant="form" />
      </div>
    );
  }

  const portOptions = [
    { value: '465', label: 'Cổng 465 (SSL/TLS Bảo mật - Khuyên dùng)' },
    { value: '587', label: 'Cổng 587 (TLS/STARTTLS)' },
    { value: '25', label: 'Cổng 25 (Không bảo mật)' },
    { value: '2525', label: 'Cổng 2525 (Thử nghiệm Mailtrap)' },
  ];

  const secureOptions = [
    { value: 'true', label: 'Có (Secure connection)' },
    { value: 'false', label: 'Không (Standard/TLS)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Cấu hình SMTP gửi Email" 
        description="Thiết lập tài khoản máy chủ email để tự động gửi thông báo nhắc hạn dịch vụ tới khách hàng."
      />

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Left: Configuration Inputs (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-5">
              <CardTitle className="flex items-center gap-1.5">
                <Settings className="w-5 h-5 text-[#a145ab]" />
                <span>Thông số máy chủ SMTP</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="SMTP Host Address *"
                  placeholder="Ví dụ: smtp.gmail.com hoặc mail.domain.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  required
                />
                
                <Select
                  label="SMTP Port *"
                  options={portOptions}
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="SMTP Username *"
                  placeholder="Ví dụ: hotro@nhanhmedia.vn"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  required
                />
                <Input
                  label="SMTP Password *"
                  type="password"
                  placeholder="••••••••"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  required
                />
              </div>

              <Select
                label="Yêu cầu kết nối bảo mật (Secure TLS) *"
                options={secureOptions}
                value={smtpSecure}
                onChange={(e) => setSmtpSecure(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Sender details */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-5">
              <CardTitle className="flex items-center gap-1.5">
                <Mail className="w-5 h-5 text-[#a145ab]" />
                <span>Thông tin Người gửi hiển thị</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Tên hiển thị người gửi *"
                placeholder="Ví dụ: Nhanh Media Support"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                required
              />
              <Input
                label="Địa chỉ email gửi thư *"
                placeholder="Ví dụ: hotro@nhanhmedia.vn"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                required
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Explanations and Submit (1 col) */}
        <div className="space-y-6">
          <Card className="bg-[#f7eafa] border border-[#a145ab]/20">
            <CardHeader className="py-5 flex flex-row items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#a145ab]" />
              <CardTitle className="text-[#a145ab] text-sm font-bold uppercase tracking-wide">Hướng dẫn thiết lập</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                Để gửi email tự động qua Gmail, hãy bật <strong>Xác minh 2 bước</strong> và tạo một <strong>Mật khẩu ứng dụng</strong> chuyên biệt. Nhập mật khẩu ứng dụng đó vào ô SMTP Password.
              </p>
              <div className="pt-2 border-t border-[#a145ab]/10 flex flex-col gap-1 text-[11px] font-bold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[#a145ab] shrink-0" />
                  <span>Secure 465 khuyên dùng cho SSL.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[#a145ab] shrink-0" />
                  <span>Port 587 sử dụng cho STARTTLS.</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>Lưu thông số</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Button type="submit" variant="primary" className="w-full font-bold py-2.5 rounded-xl cursor-pointer" loading={saving}>
                Lưu cấu hình
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
