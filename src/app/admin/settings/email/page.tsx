'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Textarea, showToast, PageHeader, LoadingSkeleton, EmptyState } from '@/components/ui';
import { Settings, ShieldCheck, Mail, ArrowRight, Bell, FileText, Sparkles, CheckCircle2, Search, Eye, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

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

interface EmailLog {
  id: string;
  orderId: string | null;
  customerId: string;
  emailTo: string;
  subject: string;
  body: string;
  status: string;
  sentAt: string;
  errorMessage: string | null;
  customer?: {
    name: string;
    phone: string | null;
    email: string | null;
  };
  order?: {
    orderCode: string;
  };
}

type TabType = 'smtp' | 'reminders' | 'logs';

export default function AdminEmailSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('smtp');
  
  // SMTP settings state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState('true');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [smtpLoading, setSmtpLoading] = useState(true);
  const [smtpSaving, setSmtpSaving] = useState(false);

  // Reminders settings state
  const [reminderSettings, setReminderSettings] = useState<ReminderSetting[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [remindersSaving, setRemindersSaving] = useState(false);

  // Email logs state
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotalCount, setLogsTotalCount] = useState(0);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsStatus, setLogsStatus] = useState('');
  const [logsSort, setLogsSort] = useState('desc');
  const [activeLog, setActiveLog] = useState<EmailLog | null>(null);

  // Fetch SMTP Settings
  const fetchSmtpSettings = async () => {
    setSmtpLoading(true);
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
      showToast('Lỗi kết nối máy chủ khi tải SMTP.', 'error');
    } finally {
      setSmtpLoading(false);
    }
  };

  // Fetch Reminders Settings
  const fetchReminderSettings = async () => {
    setRemindersLoading(true);
    try {
      const res = await fetch('/api/settings/reminders');
      if (res.ok) {
        const data = await res.json();
        setReminderSettings(data.settings || []);
        setEmailTemplates(data.templates || []);
      } else {
        showToast('Không thể tải cấu hình nhắc hạn.', 'error');
      }
    } catch (error) {
      console.error('Fetch reminder settings error:', error);
      showToast('Lỗi kết nối máy chủ khi tải mẫu thư.', 'error');
    } finally {
      setRemindersLoading(false);
    }
  };

  // Fetch Email Logs
  const fetchEmailLogs = async () => {
    setLogsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(logsPage));
      queryParams.append('limit', '20');
      if (logsSearch) queryParams.append('search', logsSearch);
      if (logsStatus) queryParams.append('status', logsStatus);
      queryParams.append('sort', logsSort);

      const res = await fetch(`/api/admin/email-logs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEmailLogs(data.logs || []);
        setLogsTotalPages(data.pagination.totalPages || 1);
        setLogsTotalCount(data.pagination.total || 0);
      } else {
        showToast('Không thể tải nhật ký gửi email.', 'error');
      }
    } catch (error) {
      console.error('Fetch email logs error:', error);
      showToast('Lỗi kết nối máy chủ khi tải nhật ký.', 'error');
    } finally {
      setLogsLoading(false);
    }
  };

  // Initial fetches
  useEffect(() => {
    fetchSmtpSettings();
    fetchReminderSettings();
  }, []);

  // Fetch email logs whenever parameters change
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchEmailLogs();
    }
  }, [activeTab, logsPage, logsStatus, logsSort]);

  // Handle Save SMTP
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smtpHost || !smtpPort || !smtpUser || !fromName || !fromEmail) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    setSmtpSaving(true);
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
        setSmtpPassword('••••••••');
      } else {
        showToast(data.error || 'Lỗi khi lưu cấu hình.', 'error');
      }
    } catch (error) {
      console.error('Save SMTP settings error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSmtpSaving(false);
    }
  };

  // Handle Toggle Reminder Thresholds
  const handleToggleThreshold = (id: string) => {
    setReminderSettings(
      reminderSettings.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  // Handle Template Content Change
  const handleTemplateChange = (id: string, field: 'subject' | 'body', value: string) => {
    setEmailTemplates(
      emailTemplates.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  // Handle Save Reminders
  const handleSaveReminders = async (e: React.FormEvent) => {
    e.preventDefault();
    setRemindersSaving(true);
    try {
      const res = await fetch('/api/settings/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templates: emailTemplates, settings: reminderSettings }),
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
      setRemindersSaving(false);
    }
  };

  // Search Submit for Logs
  const handleLogsSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLogsPage(1);
    fetchEmailLogs();
  };

  // Clear Filter for Logs
  const handleClearLogsFilters = () => {
    setLogsSearch('');
    setLogsStatus('');
    setLogsSort('desc');
    setLogsPage(1);
    showToast('Đã xóa tất cả bộ lọc nhật ký', 'info');
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

  const formatLogDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  // Option lists
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

  const variables = [
    { code: '{{customer_name}}', desc: 'Tên đầy đủ của khách hàng nhận dịch vụ' },
    { code: '{{product_name}}', desc: 'Tên dịch vụ sản phẩm kích hoạt' },
    { code: '{{order_code}}', desc: 'Mã số hóa đơn đơn hàng tự động' },
    { code: '{{start_date}}', desc: 'Ngày bắt đầu kích hoạt dịch vụ' },
    { code: '{{end_date}}', desc: 'Ngày hết hạn dịch vụ chi tiết' },
    { code: '{{creator_name}}', desc: 'Tên tài khoản người phụ trách bán hàng' },
    { code: '{{company_name}}', desc: 'Tên thương hiệu người gửi (From Name)' },
  ];

  const tabsList = [
    { id: 'smtp', label: 'Cấu hình SMTP', icon: <Settings className="w-4 h-4" /> },
    { id: 'reminders', label: 'Nhắc hạn & Mẫu Email', icon: <Bell className="w-4 h-4" /> },
    { id: 'logs', label: 'Nhật ký gửi Email', icon: <Mail className="w-4 h-4" /> }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Title */}
      <PageHeader 
        title="Cấu hình hệ thống Email" 
        description="Quản lý máy chủ gửi thư SMTP, mẫu thông báo nhắc hạn tự động và xem lịch sử email đã gửi đi."
      />

      {/* Navigation tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl border border-border w-full sm:w-auto">
        {tabsList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer flex-1 sm:flex-none justify-center
              ${activeTab === tab.id
                ? 'bg-card text-primary shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
              }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: SMTP configuration */}
      {activeTab === 'smtp' && (
        smtpLoading ? (
          <div className="space-y-6">
            <LoadingSkeleton variant="form" />
          </div>
        ) : (
          <form onSubmit={handleSaveSmtp} className="grid grid-cols-1 lg:grid-cols-3 gap-7">
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

              {/* Sender Details */}
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

            {/* Sidebar Guide */}
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
                  <Button type="submit" variant="primary" className="w-full font-bold py-2.5 rounded-xl cursor-pointer" loading={smtpSaving}>
                    Lưu cấu hình
                  </Button>
                </CardContent>
              </Card>
            </div>
          </form>
        )
      )}

      {/* Tab: Reminders & Templates configuration */}
      {activeTab === 'reminders' && (
        remindersLoading ? (
          <div className="space-y-6">
            <LoadingSkeleton variant="form" />
          </div>
        ) : (
          <form onSubmit={handleSaveReminders} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    {reminderSettings.map((item) => (
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

                {emailTemplates.map((template) => (
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

            {/* Sidebar guides */}
            <div className="space-y-6">
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

              <Card>
                <CardHeader className="py-5">
                  <CardTitle>Lưu cấu hình</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button type="submit" variant="primary" className="w-full font-bold py-2.5 rounded-xl cursor-pointer" loading={remindersSaving}>
                    Lưu cấu hình nhắc hạn
                  </Button>
                </CardContent>
              </Card>
            </div>
          </form>
        )
      )}

      {/* Tab: Email Logs list */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Filters card */}
          <Card>
            <CardContent className="py-5">
              <form onSubmit={handleLogsSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm email nhận, tiêu đề, khách hàng..."
                    value={logsSearch}
                    onChange={(e) => setLogsSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <select
                    value={logsStatus}
                    onChange={(e) => {
                      setLogsStatus(e.target.value);
                      setLogsPage(1);
                    }}
                    className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="success">Thành công</option>
                    <option value="failed">Thất bại</option>
                  </select>
                </div>

                <div>
                  <select
                    value={logsSort}
                    onChange={(e) => {
                      setLogsSort(e.target.value);
                      setLogsPage(1);
                    }}
                    className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    <option value="desc">Thời gian gửi: Mới nhất</option>
                    <option value="asc">Thời gian gửi: Cũ nhất</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 cursor-pointer py-2.5">Tìm kiếm</Button>
                  {(logsSearch || logsStatus || logsSort !== 'desc') && (
                    <Button variant="outline" type="button" onClick={handleClearLogsFilters} className="text-rose-500 border-rose-200 hover:bg-rose-50 cursor-pointer py-2.5">
                      Xóa lọc
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Email logs table list */}
          <Card>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="p-6">
                  <LoadingSkeleton variant="table" />
                </div>
              ) : emailLogs.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="Không tìm thấy nhật ký gửi email"
                    description="Hiện tại chưa có bản ghi nhật ký gửi email nào khớp với các bộ lọc của bạn."
                    actionLabel="Xóa bộ lọc"
                    onAction={handleClearLogsFilters}
                  />
                </div>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-[#f5f5f9] text-slate-500 font-semibold uppercase tracking-wider">
                          <th className="px-4 py-4 w-[48px] text-center">STT</th>
                          <th className="px-5 py-4 w-[160px]">Thời gian gửi</th>
                          <th className="px-5 py-4">Khách hàng nhận</th>
                          <th className="px-5 py-4">Email nhận</th>
                          <th className="px-5 py-4">Tiêu đề thư (Subject)</th>
                          <th className="px-5 py-4 w-[120px]">Đơn hàng</th>
                          <th className="px-5 py-4 text-center w-[110px]">Trạng thái</th>
                          <th className="px-5 py-4 text-center w-[90px]">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {emailLogs.map((log, idx) => (
                          <tr key={log.id} className="hover:bg-[#f8f7fa] transition-colors duration-150">
                            <td className="px-4 py-3.5 text-center text-xs font-bold text-slate-400">
                              {(logsPage - 1) * 20 + idx + 1}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono">
                              {formatLogDate(log.sentAt)}
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-slate-800">
                              {log.customer?.name || 'Ẩn danh / Đã xóa'}
                              {log.customer?.phone && (
                                <div className="text-[10px] text-slate-400 font-mono font-medium mt-0.5">
                                  {log.customer.phone}
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-slate-600 font-medium">
                              {log.emailTo}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 font-medium max-w-[280px] truncate" title={log.subject}>
                              {log.subject}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {log.order ? (
                                <Link 
                                  href={`/admin/orders/${log.orderId}`}
                                  className="text-primary font-bold hover:underline bg-primary/10 px-2 py-0.5 rounded text-[11px]"
                                >
                                  {log.order.orderCode}
                                </Link>
                              ) : (
                                <span className="text-slate-400 font-medium">N/A</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              {log.status === 'success' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">Thành công</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600">Thất bại</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActiveLog(log)}
                                className="px-2 py-1 h-7 text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-slate-50/50">
                    <span className="text-xs text-slate-500 font-medium">
                      Hiển thị từ {(logsPage - 1) * 20 + 1} đến {Math.min(logsPage * 20, logsTotalCount)} trên tổng số {logsTotalCount} logs
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logsPage === 1}
                        onClick={() => setLogsPage(p => Math.max(p - 1, 1))}
                        className="cursor-pointer text-xs"
                      >
                        Trước
                      </Button>
                      <span className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 rounded-lg">
                        {logsPage} / {logsTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={logsPage === logsTotalPages}
                        onClick={() => setLogsPage(p => Math.min(p + 1, logsTotalPages))}
                        className="cursor-pointer text-xs"
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Outgoing Email log detail modal popup */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10">
          <div className="w-full max-w-3xl bg-card rounded-2xl border border-border shadow-[0_25px_80px_rgba(0,0,0,0.28)] overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-800">Chi tiết email đã gửi</h3>
              <button 
                onClick={() => setActiveLog(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[65vh] space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs border-b border-border/60 pb-5">
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Khách hàng nhận</span>
                  <div className="font-bold text-slate-800 text-sm">{activeLog.customer?.name || 'Ẩn danh / Đã xóa'}</div>
                  {activeLog.customer?.phone && <span className="text-slate-500 font-mono block mt-0.5">{activeLog.customer.phone}</span>}
                  {activeLog.customer?.email && <span className="text-slate-500 font-mono block mt-0.5">{activeLog.customer.email}</span>}
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Thời gian gửi</span>
                  <div className="font-bold text-slate-700">{formatLogDate(activeLog.sentAt)}</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{activeLog.sentAt}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Địa chỉ Email người nhận</span>
                  <div className="font-mono font-bold text-slate-800 break-all bg-slate-50 p-1.5 border border-border/40 rounded-lg">{activeLog.emailTo}</div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Đơn hàng tham chiếu</span>
                  <div>
                    {activeLog.order ? (
                      <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] inline-block mt-0.5 border border-border/60">
                        Mã đơn: {activeLog.order.orderCode}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Không tham chiếu đơn hàng</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Trạng thái gửi</span>
                  <div className="mt-1">
                    {activeLog.status === 'success' ? (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Gửi thành công</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">Gửi thất bại</span>
                    )}
                  </div>
                </div>
              </div>

              {activeLog.errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-700 flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold">
                    <span className="font-bold block uppercase tracking-wider text-[10px] mb-1">Chi tiết lỗi từ máy chủ SMTP</span>
                    <p className="font-mono leading-relaxed break-all">{activeLog.errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Tiêu đề Email (Subject)</span>
                <div className="bg-slate-50 border border-border/60 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800">
                  {activeLog.subject}
                </div>
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Nội dung thư đã gửi (Plain text / HTML)</span>
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-border/60 flex justify-between items-center text-[10px] font-semibold text-slate-400">
                    <span>NỘI DUNG EMAIL PREVIEW</span>
                    <span className="font-mono">ID: {activeLog.id}</span>
                  </div>
                  {activeLog.body.includes('<html>') || activeLog.body.includes('<div') || activeLog.body.includes('<p') ? (
                    <iframe
                      srcDoc={activeLog.body}
                      className="w-full h-80 bg-white border-0"
                      title="Email content preview"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="p-4 bg-white font-mono text-xs text-slate-700 whitespace-pre-wrap break-words h-80 overflow-y-auto leading-relaxed">
                      {activeLog.body}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setActiveLog(null)} className="cursor-pointer">
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
