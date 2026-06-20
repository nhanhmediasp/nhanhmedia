'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, showToast, PageHeader, LoadingSkeleton } from '@/components/ui';
import { Bell, FileText, Sparkles, CheckCircle2 } from 'lucide-react';

interface ReminderSetting {
  id: string;
  daysBefore: number;
  enabled: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
}

export default function AdminReminderSettingsPage() {
  const [settings, setSettings] = useState<ReminderSetting[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/reminders');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || []);
        setTemplates(data.templates || []);
      } else {
        showToast('Không thể tải cấu hình nhắc hạn.', 'error');
      }
    } catch (error) {
      console.error('Fetch reminder settings error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggleThreshold = (id: string) => {
    setSettings(
      settings.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleTemplateChange = (id: string, field: 'subject' | 'body', value: string) => {
    setTemplates(
      templates.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates, settings }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Lưu cấu hình nhắc hạn thành công!', 'success');
      } else {
        showToast(data.error || 'Lỗi khi lưu cấu hình.', 'error');
      }
    } catch (error) {
      console.error('Save reminder settings error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getTemplateLabel = (type: string) => {
    switch (type) {
      case 'reminder_7_days': return 'Mẫu thư nhắc nhở trước 7 ngày';
      case 'reminder_3_days': return 'Mẫu thư nhắc nhở trước 3 ngày';
      case 'reminder_1_day': return 'Mẫu thư nhắc nhở trước 1 ngày';
      case 'reminder_expired': return 'Mẫu thư báo hết hạn (0 ngày)';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Cấu hình nhắc hạn & Mẫu Email" 
          description="Bật tắt các mốc thời gian nhắc nhở tự động gửi và chỉnh sửa nội dung mẫu email gửi đi."
        />
        <LoadingSkeleton variant="form" />
      </div>
    );
  }

  const variables = [
    { code: '{{customer_name}}', desc: 'Tên đầy đủ của khách hàng nhận dịch vụ' },
    { code: '{{product_name}}', desc: 'Tên dịch vụ sản phẩm kích hoạt' },
    { code: '{{order_code}}', desc: 'Mã số hóa đơn đơn hàng tự động' },
    { code: '{{start_date}}', desc: 'Ngày bắt đầu kích hoạt dịch vụ' },
    { code: '{{end_date}}', desc: 'Ngày hết hạn dịch vụ chi tiết' },
    { code: '{{creator_name}}', desc: 'Tên tài khoản người phụ trách bán hàng' },
    { code: '{{company_name}}', desc: 'Tên thương hiệu người gửi (From Name)' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <PageHeader 
        title="Cấu hình nhắc hạn & Mẫu Email" 
        description="Bật tắt các mốc thời gian nhắc nhở tự động gửi và chỉnh sửa nội dung mẫu email gửi đi."
      />

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Thresholds list and Template editors (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thresholds */}
          <Card>
            <CardHeader className="py-5">
              <CardTitle className="flex items-center gap-1.5">
                <Bell className="w-5 h-5 text-[#a145ab]" />
                <span>Các mốc tự động gửi Email</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                {settings.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleThreshold(item.id)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-28 relative select-none ${
                      item.enabled
                        ? 'bg-[#f7eafa] border-[#a145ab] shadow-sm shadow-[#a145ab]/10'
                        : 'bg-card border-border hover:bg-[#f5f5f9]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className={`text-sm font-extrabold ${item.enabled ? 'text-[#a145ab]' : 'text-slate-800'}`}>
                        {item.daysBefore === 0 ? 'Ngày hết hạn' : `Trước ${item.daysBefore} ngày`}
                      </span>
                      {item.enabled && <CheckCircle2 className="w-4 h-4 text-[#a145ab] animate-pulse" />}
                    </div>
                    
                    <span className={`text-[10px] font-semibold uppercase tracking-wider leading-none mt-4 ${item.enabled ? 'text-[#a145ab]' : 'text-slate-400'}`}>
                      {item.enabled ? 'Đang kích hoạt' : 'Đang tạm dừng'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Template Edit Form */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#a145ab]" />
              <h2 className="text-lg font-bold text-slate-800">Biên tập nội dung Email Templates</h2>
            </div>

            {templates.map((template) => (
              <Card key={template.id} className="hover:border-[#a145ab]/20 transition-all duration-200">
                <CardHeader className="py-3.5 border-b border-border/60">
                  <CardTitle className="text-sm font-bold text-slate-800">{getTemplateLabel(template.type)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 pt-4">
                  <Input
                    label="Tiêu đề Email (Subject)"
                    placeholder="Nhập tiêu đề thư..."
                    value={template.subject}
                    onChange={(e) => handleTemplateChange(template.id, 'subject', e.target.value)}
                    required
                  />

                  <Textarea
                    label="Nội dung Email (Plain text / HTML)"
                    placeholder="Nhập nội dung chi tiết của thư nhắc nhở..."
                    value={template.body}
                    onChange={(e) => handleTemplateChange(template.id, 'body', e.target.value)}
                    rows={6}
                    required
                    className="font-mono text-xs"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Variable list help card & Save buttons (1 col) */}
        <div className="space-y-6">
          {/* Dynamic variables guide */}
          <Card className="bg-[#f7eafa] border border-[#a145ab]/20">
            <CardHeader className="py-5 flex flex-row items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#a145ab] animate-pulse" />
              <CardTitle className="text-[#a145ab] text-sm font-bold uppercase tracking-wide">Các biến động hỗ trợ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-xs text-slate-600 leading-normal">
                Hãy chèn các biến động dưới đây vào bất kỳ đâu trong phần Tiêu đề hoặc Nội dung email. Khi gửi thư, hệ thống sẽ tự động đối sánh giá trị tương ứng của đơn hàng.
              </p>
              
              <div className="space-y-3 pt-2 border-t border-[#a145ab]/10">
                {variables.map((v) => (
                  <div key={v.code} className="space-y-1 text-xs">
                    <code className="bg-[#f2ddf6] text-[#a145ab] font-bold px-1.5 py-0.5 rounded-md text-[11px]">
                      {v.code}
                    </code>
                    <p className="text-slate-500 text-[10px] pl-1">{v.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action submit */}
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Lưu cấu hình</CardTitle>
            </CardHeader>
            <CardContent>
              <Button type="submit" variant="primary" className="w-full font-bold py-2.5 rounded-xl cursor-pointer" loading={saving}>
                Lưu cấu hình nhắc hạn
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
