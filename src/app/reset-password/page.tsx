'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, showToast } from '@/components/ui';
import { KeyRound, Zap, ArrowLeft, ShieldCheck } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast('Đường dẫn khôi phục không hợp lệ hoặc thiếu mã xác thực.', 'error');
      return;
    }

    if (!password) {
      showToast('Vui lòng nhập mật khẩu mới.', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Mật khẩu xác nhận không trùng khớp.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Đặt lại mật khẩu thành công!', 'success');
        setSuccess(true);
      } else {
        showToast(data.error || 'Đặt lại mật khẩu thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-6 space-y-4">
        <p className="text-sm font-semibold text-rose-500">Mã thông báo khôi phục (Reset Token) bị thiếu hoặc không đúng định dạng.</p>
        <p className="text-xs text-slate-500">Vui lòng sử dụng lại liên kết khôi phục trong email hoặc thực hiện gửi lại yêu cầu khôi phục mới.</p>
        <div className="pt-2">
          <Link href="/forgot-password">
            <Button variant="outline" className="w-full py-2 text-xs font-bold rounded-xl">
              Yêu cầu lại link mới
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {success ? (
        <div className="text-center space-y-3.5 py-4">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 border border-green-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="font-bold text-sm text-foreground">Đặt lại mật khẩu thành công!</div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Mật khẩu mới của bạn đã được thiết lập. Hãy đăng nhập ngay để trải nghiệm các tính năng của hệ thống.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="primary" className="w-full py-2.5 text-xs font-bold rounded-xl">
                Đăng nhập ngay
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Mật khẩu mới *"
            type="password"
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<KeyRound className="w-4 h-4" />}
            required
          />
          <Input
            label="Xác nhận mật khẩu mới *"
            type="password"
            placeholder="Nhập lại mật khẩu mới"
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
            Cập nhật mật khẩu
          </Button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
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

        <div className="relative z-10 space-y-4">
          <h2 className="text-4xl font-black text-white leading-tight">
            Đặt lại mật khẩu.<br />
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>Bảo vệ an toàn thông tin.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)', maxWidth: 360 }}>
            Điền mật khẩu mới của bạn bên dưới. Hãy đặt mật khẩu đủ mạnh và khó đoán để tăng tính bảo mật cho tài khoản của bạn.
          </p>
        </div>

        <div className="text-xs relative z-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
          © 2026 Nhanh Media Digital Platform
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-[400px] space-y-6 animate-fade-in-up">
          <div>
            <Link href="/login" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mb-4">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại trang Đăng nhập</span>
            </Link>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#1e293b' }}>Đặt lại mật khẩu mới 🔑</h1>
            <p className="text-sm mt-1.5 font-medium" style={{ color: '#697a8d' }}>Nhập mật khẩu mới cho tài khoản của bạn.</p>
          </div>

          <div
            className="rounded-2xl p-7 space-y-4"
            style={{
              background: '#fff',
              border: '1px solid rgba(108,117,147,0.10)',
              boxShadow: '0 4px 24px rgba(108,117,147,0.10)',
            }}
          >
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="w-8 h-8 border-4 border-t-transparent border-primary rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground font-semibold">Đang xử lý...</span>
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
