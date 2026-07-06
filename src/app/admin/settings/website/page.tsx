'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, showToast, PageHeader, MediaPicker } from '@/components/ui';
import { Globe, Image, Shield, Save, Mail, Settings, Share2, Upload, CreditCard, ExternalLink, Copy, Check } from 'lucide-react';

interface WebsiteSettings {
  id: string;
  siteName: string;
  siteDescription: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  adminEmail: string | null;
  adminPhone: string | null;
  adminAddress: string | null;
  facebookUrl: string | null;
  zaloUrl: string | null;
  telegramUrl: string | null;
  loginMaxAttempts: number;
  loginLockEnabled: boolean;
  loginLockDurationMins: number;
}

type Tab = 'info' | 'images' | 'security' | 'sepay';

export default function WebsiteSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Site info
  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminAddress, setAdminAddress] = useState('');

  // Social info
  const [facebookUrl, setFacebookUrl] = useState('');
  const [zaloUrl, setZaloUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');

  // Images
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  // Picker states
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [faviconPickerOpen, setFaviconPickerOpen] = useState(false);

  // Security
  const [loginLockEnabled, setLoginLockEnabled] = useState(true);
  const [loginMaxAttempts, setLoginMaxAttempts] = useState(5);
  const [loginLockDurationMins, setLoginLockDurationMins] = useState(15);

  // SePay Integration
  const [sepayAccountNumber, setSepayAccountNumber] = useState('');
  const [sepayBankCode, setSepayBankCode] = useState('');
  const [sepayAccountName, setSepayAccountName] = useState('');
  const [sepayApiKey, setSepayApiKey] = useState('');

  // Origin for dynamic webhook link
  const [origin, setOrigin] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/website');
      if (res.ok) {
        const data = await res.json();
        const s: any = data.settings;
        setSiteName(s.siteName || '');
        setSiteDescription(s.siteDescription || '');
        setAdminEmail(s.adminEmail || '');
        setAdminPhone(s.adminPhone || '');
        setAdminAddress(s.adminAddress || '');
        setFacebookUrl(s.facebookUrl || '');
        setZaloUrl(s.zaloUrl || '');
        setTelegramUrl(s.telegramUrl || '');
        setLogoUrl(s.logoUrl || '');
        setFaviconUrl(s.faviconUrl || '');
        setLoginLockEnabled(s.loginLockEnabled);
        setLoginMaxAttempts(s.loginMaxAttempts);
        setLoginLockDurationMins(s.loginLockDurationMins);
        setSepayAccountNumber(s.sepayAccountNumber || '');
        setSepayBankCode(s.sepayBankCode || '');
        setSepayAccountName(s.sepayAccountName || '');
        setSepayApiKey(s.sepayApiKey || '');
      } else {
        showToast('Không thể tải cài đặt website.', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // handleUpload removed as MediaPicker handles uploads directly

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/website', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName,
          siteDescription,
          adminEmail,
          adminPhone,
          adminAddress,
          facebookUrl,
          zaloUrl,
          telegramUrl,
          logoUrl,
          faviconUrl,
          loginLockEnabled,
          loginMaxAttempts,
          loginLockDurationMins,
          sepayAccountNumber,
          sepayBankCode,
          sepayAccountName,
          sepayApiKey,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Đã lưu cài đặt thành công!', 'success');
      } else {
        showToast(data.error || 'Lỗi khi lưu cài đặt.', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: 'Thông tin Website', icon: <Globe className="w-4 h-4" /> },
    { id: 'images', label: 'Logo & Favicon', icon: <Image className="w-4 h-4" /> },
    { id: 'security', label: 'Bảo mật đăng nhập', icon: <Shield className="w-4 h-4" /> },
    { id: 'sepay', label: 'Cấu hình SePay', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tùy chỉnh Website"
        description="Quản lý thông tin, hình ảnh thương hiệu và cài đặt bảo mật cho hệ thống."
      >
        <div className="flex gap-2.5 shrink-0">
          <Link href="/admin/settings/email">
            <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
              <Mail className="w-4 h-4" />
              <span>Cài đặt Email</span>
            </Button>
          </Link>
          <Button onClick={handleSave} loading={saving} className="flex items-center gap-2 cursor-pointer">
            <Save className="w-4 h-4" />
            <span>Lưu thay đổi</span>
          </Button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl border border-border w-full sm:w-auto">
        {tabs.map((tab) => (
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

      {loading ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Đang tải cài đặt...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tab: Thông tin Website */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      Thông tin Website
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Input
                      label="Tên website"
                      placeholder="Ví dụ: Nhanh Media"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Mô tả website</label>
                      <textarea
                        placeholder="Mô tả ngắn về website, hiển thị dưới tiêu đề trang..."
                        value={siteDescription}
                        onChange={(e) => setSiteDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-all duration-200 resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Thông tin liên hệ Admin
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Input
                      label="Email liên hệ"
                      type="email"
                      placeholder="contact@nhanhmedia.vn"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                    <Input
                      label="Số điện thoại liên hệ"
                      placeholder="0977 111 222"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                    />
                    <Input
                      label="Địa chỉ"
                      placeholder="Số 123, Đường ABC, Q.1, TP.HCM"
                      value={adminAddress}
                      onChange={(e) => setAdminAddress(e.target.value)}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Social Channels */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-primary" />
                    Kênh liên hệ Mạng xã hội
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input
                    label="Link Facebook"
                    placeholder="Ví dụ: https://facebook.com/nhanhmedia"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                  />
                  <Input
                    label="Số điện thoại/Link Zalo"
                    placeholder="Ví dụ: https://zalo.me/0977111222"
                    value={zaloUrl}
                    onChange={(e) => setZaloUrl(e.target.value)}
                  />
                  <Input
                    label="Link Telegram"
                    placeholder="Ví dụ: https://t.me/nhanhmedia"
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab: Logo & Favicon */}
          {activeTab === 'images' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-primary" />
                    Logo Website
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Input
                        label="URL hình ảnh Logo"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => {
                          setLogoUrl(e.target.value);
                          setLogoError(false);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLogoPickerOpen(true)}
                      className="cursor-pointer shrink-0 h-[42px] flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Tải / Chọn ảnh</span>
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Hỗ trợ tải lên file trực tiếp hoặc dán URL liên kết ngoài. PNG, JPG, SVG, WebP. Khuyến nghị: 200×60 px.
                  </div>
                  {logoUrl && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Xem trước:</p>
                      <div className="border border-border rounded-xl p-4 bg-muted/30 flex items-center justify-center min-h-[80px]">
                        {!logoError ? (
                          <img
                            src={logoUrl}
                            alt="Logo preview"
                            className="max-h-16 max-w-[240px] object-contain"
                            onError={() => setLogoError(true)}
                          />
                        ) : (
                          <p className="text-xs text-rose-500 font-semibold">Không thể tải ảnh — URL không hợp lệ.</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    Favicon
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Input
                        label="URL Favicon"
                        placeholder="https://example.com/favicon.ico"
                        value={faviconUrl}
                        onChange={(e) => {
                          setFaviconUrl(e.target.value);
                          setFaviconError(false);
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFaviconPickerOpen(true)}
                      className="cursor-pointer shrink-0 h-[42px] flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Tải / Chọn ảnh</span>
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Favicon hiển thị trên tab trình duyệt. Hỗ trợ: ICO, PNG, SVG. Kích thước khuyến nghị: 32×32 px.
                  </div>
                  {faviconUrl && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Xem trước:</p>
                      <div className="border border-border rounded-xl p-4 bg-muted/30 flex items-center gap-3">
                        {!faviconError ? (
                          <img
                            src={faviconUrl}
                            alt="Favicon preview"
                            className="w-8 h-8 object-contain rounded"
                            onError={() => setFaviconError(true)}
                          />
                        ) : (
                          <div className="w-8 h-8 bg-rose-100 text-rose-500 rounded flex items-center justify-center font-bold text-[10px]">ERR</div>
                        )}
                        <span className="text-xs text-muted-foreground">Favicon trên tab trình duyệt</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab: Bảo mật đăng nhập */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Cài đặt chống Brute-Force
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Toggle: Enable lock */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                    <div>
                      <p className="text-sm font-bold text-foreground">Bật khóa IP tự động</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tự động tạm khóa địa chỉ IP nếu đăng nhập sai quá nhiều lần liên tiếp.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLoginLockEnabled(!loginLockEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none
                        ${loginLockEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                      aria-pressed={loginLockEnabled}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200
                          ${loginLockEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  {loginLockEnabled && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Số lần đăng nhập sai tối đa
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="3"
                            max="10"
                            value={loginMaxAttempts}
                            onChange={(e) => setLoginMaxAttempts(parseInt(e.target.value))}
                            className="flex-1 cursor-pointer accent-primary"
                          />
                          <span className="w-10 text-center font-black text-primary text-lg">{loginMaxAttempts}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sau {loginMaxAttempts} lần nhập sai, IP sẽ bị tạm khóa.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-1.5">
                          Thời gian khóa (phút)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="5"
                            max="60"
                            step="5"
                            value={loginLockDurationMins}
                            onChange={(e) => setLoginLockDurationMins(parseInt(e.target.value))}
                            className="flex-1 cursor-pointer accent-primary"
                          />
                          <span className="w-16 text-center font-black text-primary text-lg">{loginLockDurationMins} phút</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          IP sẽ tự động mở khóa sau {loginLockDurationMins} phút.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Tóm tắt cấu hình bảo mật
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${loginLockEnabled ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-border'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${loginLockEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className={`text-sm font-bold ${loginLockEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {loginLockEnabled ? 'Đang bảo vệ — Tính năng khóa IP đang bật' : 'Tắt — Không có giới hạn đăng nhập'}
                      </p>
                    </div>
                  </div>

                  {loginLockEnabled && (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-border pb-2">
                          <span className="text-muted-foreground">Số lần tối đa:</span>
                          <span className="font-bold text-foreground">{loginMaxAttempts} lần</span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                          <span className="text-muted-foreground">Thời gian khóa:</span>
                          <span className="font-bold text-foreground">{loginLockDurationMins} phút</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Theo dõi theo:</span>
                          <span className="font-bold text-foreground">Địa chỉ IP</span>
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
                        ⚠️ Sau khi bị khóa, Admin có thể xóa lịch sử thử đăng nhập trong database để mở khóa thủ công nếu cần.
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab: Cấu hình SePay */}
          {activeTab === 'sepay' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card style={{ overflow: 'visible' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Cấu hình Tài khoản nhận tiền QR
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Input
                    label="Số tài khoản (sepayAccountNumber)"
                    placeholder="Ví dụ: 1015165449"
                    value={sepayAccountNumber}
                    onChange={(e) => setSepayAccountNumber(e.target.value)}
                  />
                  
                  <Input
                    label="Ngân hàng nhận tiền (sepayBankCode)"
                    placeholder="Ví dụ: Vietcombank"
                    value={sepayBankCode}
                    onChange={(e) => setSepayBankCode(e.target.value)}
                  />

                  <Input
                    label="Chủ tài khoản (sepayAccountName)"
                    placeholder="Ví dụ: NGUYEN THE VU"
                    value={sepayAccountName}
                    onChange={(e) => setSepayAccountName(e.target.value.toUpperCase())}
                  />

                  <Input
                    label="SePay Webhook Token / API Key"
                    type="password"
                    placeholder="Nhập API Key liên kết SePay..."
                    value={sepayApiKey}
                    onChange={(e) => setSepayApiKey(e.target.value)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    Liên kết & Tích hợp nhanh
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="p-4 rounded-xl border border-border bg-slate-50 dark:bg-zinc-900/60 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">URL nhận Webhook</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${origin}/api/webhooks/sepay`);
                          setCopiedWebhook(true);
                          showToast('Đã sao chép URL webhook!', 'success');
                          setTimeout(() => setCopiedWebhook(false), 2000);
                        }}
                        className="text-primary hover:text-primary-hover flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                      >
                        {copiedWebhook ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span>Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-border/80 font-mono text-[11px] break-all select-all font-bold text-slate-700 dark:text-slate-300">
                      {origin}/api/webhooks/sepay
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                      Copy đường dẫn này dán vào ô <strong>"URL nhận webhook"</strong> trên giao diện SePay của bạn.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-primary/10 bg-primary/5 space-y-3">
                    <h4 className="text-sm font-extrabold text-primary">Cần cấu hình SePay?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Bạn có thể mở giao diện quản lý tài khoản SePay trực tiếp để cài đặt cổng, liên kết ngân hàng và lấy Token API Key.
                    </p>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <a
                        href="https://me.sepay.vn"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Vào SePay Dashboard
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      
                      <a
                        href="https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border hover:bg-muted text-xs font-bold rounded-xl transition-all"
                      >
                        Tài liệu tích hợp
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} className="flex items-center gap-2 cursor-pointer px-8">
          <Save className="w-4 h-4" />
          <span>Lưu tất cả thay đổi</span>
        </Button>
      </div>

      {/* Media Pickers */}
      <MediaPicker
        isOpen={logoPickerOpen}
        onClose={() => setLogoPickerOpen(false)}
        onSelect={(url) => {
          setLogoUrl(url);
          setLogoError(false);
        }}
        title="Thư viện ảnh - Chọn Logo"
      />

      <MediaPicker
        isOpen={faviconPickerOpen}
        onClose={() => setFaviconPickerOpen(false)}
        onSelect={(url) => {
          setFaviconUrl(url);
          setFaviconError(false);
        }}
        title="Thư viện ảnh - Chọn Favicon"
      />
    </div>
  );
}
