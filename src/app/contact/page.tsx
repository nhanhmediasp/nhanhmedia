'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button, PageHeader } from '@/components/ui';
import { Mail, Phone, MapPin, Facebook, MessageCircle, Send, ArrowLeft, Globe } from 'lucide-react';

interface PublicSettings {
  siteName: string;
  siteDescription: string | null;
  logoUrl: string | null;
  adminEmail: string | null;
  adminPhone: string | null;
  adminAddress: string | null;
  facebookUrl: string | null;
  zaloUrl: string | null;
  telegramUrl: string | null;
}

export default function ContactPage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/public/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings);
        }
      } catch (err) {
        console.error('Fetch public settings error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const siteName = settings?.siteName || 'Nhanh Media';
  const siteDescription = settings?.siteDescription || 'Hệ thống Quản lý Dịch vụ trực tuyến';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Liên hệ Hỗ trợ"
        description="Kết nối với ban quản trị để được giải đáp thắc mắc hoặc hỗ trợ kỹ thuật về dịch vụ."
      >
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Dashboard</span>
          </Button>
        </Link>
      </PageHeader>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">Đang tải thông tin liên hệ...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Direct Contact Info */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-primary" />
                  Thông tin Ban Quản Trị
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="flex items-center gap-3">
                  {settings?.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={siteName}
                      className="max-h-12 max-w-[200px] object-contain select-none rounded"
                    />
                  ) : (
                    <div className="text-xl font-black text-primary uppercase tracking-widest">
                      {siteName}
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {siteDescription}
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Email</p>
                      <a href={`mailto:${settings?.adminEmail || 'contact@nhanhmedia.vn'}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                        {settings?.adminEmail || 'Chưa cập nhật'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Hotline / Zalo</p>
                      <a href={`tel:${settings?.adminPhone}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                        {settings?.adminPhone || 'Chưa cập nhật'}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Địa chỉ làm việc</p>
                      <p className="text-sm font-semibold text-foreground">
                        {settings?.adminAddress || 'Chưa cập nhật'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Card 2: Social Media Connect */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Mạng Xã Hội & Hỗ Trợ Nhanh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Bên cạnh các phương thức truyền thống, bạn có thể liên hệ trực tiếp với chúng tôi qua các kênh chat trực tuyến dưới đây để nhận phản hồi nhanh nhất.
                </p>

                {/* Facebook Button */}
                {settings?.facebookUrl ? (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-slate-50 hover:border-primary/25 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <Facebook className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">Facebook</p>
                        <p className="text-xs text-muted-foreground">Theo dõi & Chat Fanpage</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors cursor-pointer">Kết nối</Button>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-slate-50/50 opacity-60">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-bold text-slate-400">Facebook</p>
                      <p className="text-xs text-slate-400">Chưa thiết lập liên kết</p>
                    </div>
                  </div>
                )}

                {/* Zalo Button */}
                {settings?.zaloUrl ? (
                  <a
                    href={settings.zaloUrl.startsWith('http') ? settings.zaloUrl : `https://zalo.me/${settings.zaloUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-slate-50 hover:border-primary/25 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 font-black text-xs">
                        Zalo
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">Zalo Chat</p>
                        <p className="text-xs text-muted-foreground">Liên hệ hỗ trợ kỹ thuật Zalo</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors cursor-pointer">Kết nối</Button>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-slate-50/50 opacity-60">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0 font-bold text-xs">
                      Zalo
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-bold text-slate-400">Zalo Chat</p>
                      <p className="text-xs text-slate-400">Chưa thiết lập liên kết</p>
                    </div>
                  </div>
                )}

                {/* Telegram Button */}
                {settings?.telegramUrl ? (
                  <a
                    href={settings.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-slate-50 hover:border-primary/25 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0">
                        <Send className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">Telegram</p>
                        <p className="text-xs text-muted-foreground">Trao đổi nhanh qua Telegram</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors cursor-pointer">Kết nối</Button>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-slate-50/50 opacity-60">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <Send className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-bold text-slate-400">Telegram</p>
                      <p className="text-xs text-slate-400">Chưa thiết lập liên kết</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
