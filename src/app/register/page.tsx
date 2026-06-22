'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, showToast } from '@/components/ui';
import { KeyRound, Mail, User, Phone, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();

  React.useEffect(() => {
    if (user) {
      router.push(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    }
  }, [user, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password }),
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast('Đăng ký tài khoản Cộng tác viên thành công! Vui lòng đăng nhập.', 'success');
        router.push('/login');
      } else {
        showToast(data.error || 'Đăng ký tài khoản thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#f4f5fb' }}>
      {/* Left panel – brand visual */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(150deg,#1a0629 0%,#3b0f62 40%,#a145ab 100%)',
        }}
      >
        <div
          className="absolute top-[-80px] left-[-80px] w-[340px] h-[340px] rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(1px)' }}
        />
        <div
          className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(1px)' }}
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
        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl font-black text-white leading-tight">
            Tham gia đội ngũ.<br />
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>Kiếm tiền không giới hạn.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)', maxWidth: 360 }}>
            Đăng ký tài khoản Cộng tác viên (CTV) ngay để bắt đầu phân phối các sản phẩm và dịch vụ của Nhanh Media, hưởng hoa hồng cực hấp dẫn.
          </p>
        </div>

        {/* Footer */}
        <div className="text-xs relative z-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
          © 2026 Nhanh Media Digital Platform
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[420px] space-y-6 animate-fade-in-up">
          <div>
            <Link href="/login" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mb-4">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại trang Đăng nhập</span>
            </Link>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#1e293b' }}>Đăng ký Cộng tác viên 🚀</h1>
            <p className="text-sm mt-1.5 font-medium" style={{ color: '#697a8d' }}>Đăng ký tài khoản để bắt đầu bán hàng.</p>
          </div>

          <div
            className="rounded-2xl p-7 space-y-4"
            style={{
              background: '#fff',
              border: '1px solid rgba(108,117,147,0.10)',
              boxShadow: '0 4px 24px rgba(108,117,147,0.10)',
            }}
          >
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Họ và tên *"
                placeholder="Ví dụ: Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
              <Input
                label="Địa chỉ email *"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
              <Input
                label="Số điện thoại"
                placeholder="Ví dụ: 0977111222"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
              />
              <Input
                label="Mật khẩu *"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<KeyRound className="w-4 h-4" />}
                required
              />
              <Input
                label="Xác nhận mật khẩu *"
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<KeyRound className="w-4 h-4" />}
                required
              />
              
              <Button
                type="submit"
                variant="primary"
                className="w-full py-3 text-sm font-bold rounded-xl mt-2"
                loading={loading}
              >
                Xác nhận Đăng ký
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
