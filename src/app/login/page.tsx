'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { Button, Input, showToast } from '@/components/ui';
import { KeyRound, Mail, Zap, BarChart3, Users, Shield } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();
  const { user, login } = useAuth();

  React.useEffect(() => {
    if (user) {
      router.push(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Vui lòng nhập đầy đủ thông tin đăng nhập.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Đăng nhập thành công!', 'success');
        login(data.user);
        router.push(data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
      } else {
        showToast(data.error || 'Đăng nhập thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };



  const featureList = [
    { icon: <BarChart3 className="w-5 h-5" />, title: 'Báo cáo thời gian thực', desc: 'Theo dõi doanh thu & đơn hàng ngay lập tức' },
    { icon: <Users className="w-5 h-5" />,     title: 'Quản lý khách hàng',     desc: 'Thông tin & lịch sử đơn hàng tập trung' },
    { icon: <Shield className="w-5 h-5" />,    title: 'Bảo mật đa lớp',         desc: 'Phân quyền theo vai trò, JWT bảo vệ' },
  ];

  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0f1729' }}>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#a145ab', borderTopColor: 'transparent' }} />
        <p className="text-sm mt-3 font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Đang chuyển hướng...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f4f5fb' }}>
      {/* ── Left panel – brand visual ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(150deg,#1a0629 0%,#3b0f62 40%,#a145ab 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-[-80px] left-[-80px] w-[340px] h-[340px] rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(1px)' }}
        />
        <div
          className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(1px)' }}
        />
        <div
          className="absolute top-[35%] right-[-40px] w-[200px] h-[200px] rounded-full pointer-events-none"
          style={{ background: 'rgba(161,69,171,0.25)' }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.20)' }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-black text-white text-sm tracking-widest uppercase">Nhanh Media</div>
            <div className="text-[9.5px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Digital Platform
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-5">
          <h2 className="text-4xl font-black text-white leading-tight">
            Quản lý toàn diện.<br />
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>Hiệu quả vượt trội.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)', maxWidth: 340 }}>
            Hệ thống CRM chuyên nghiệp dành cho đội ngũ Nhanh Media — quản lý đơn hàng, khách hàng và doanh thu từ một giao diện duy nhất.
          </p>

          {/* Features */}
          <div className="pt-4 space-y-3.5">
            {featureList.map((f, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
                >
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{f.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs relative z-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
          © 2026 Nhanh Media Digital Platform
        </div>
      </div>

      {/* ── Right panel – form ── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[400px] space-y-7 animate-fade-in-up">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#c060c8,#a145ab)', boxShadow: '0 4px 12px rgba(161,69,171,0.35)' }}
            >
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-sm tracking-widest uppercase" style={{ color: '#1e293b' }}>Nhanh Media</span>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#1e293b' }}>Chào mừng trở lại 👋</h1>
            <p className="text-sm mt-1.5 font-medium" style={{ color: '#697a8d' }}>Đăng nhập vào tài khoản của bạn để tiếp tục.</p>
          </div>

          {/* Form card */}
          <div
            className="rounded-2xl p-7 space-y-5"
            style={{
              background: '#fff',
              border: '1px solid rgba(108,117,147,0.10)',
              boxShadow: '0 4px 24px rgba(108,117,147,0.10)',
            }}
          >
            <form onSubmit={handleLogin} className="space-y-5">
              <Input
                label="Email đăng nhập"
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
              <Input
                label="Mật khẩu"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<KeyRound className="w-4 h-4" />}
                required
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-sm font-bold rounded-xl mt-1"
                loading={loading}
              >
                Đăng nhập
              </Button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
