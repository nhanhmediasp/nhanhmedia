'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Input, showToast } from '@/components/ui';
import { Mail, Zap, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Vui lòng nhập địa chỉ email của bạn.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Đã gửi email khôi phục mật khẩu!', 'success');
        setSuccess(true);
      } else {
        showToast(data.error || 'Yêu cầu thất bại.', 'error');
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
            Khôi phục mật khẩu.<br />
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>Tiếp tục công việc.</span>
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)', maxWidth: 360 }}>
            Nếu bạn quên mật khẩu đăng nhập, hãy điền email tài khoản của bạn để nhận liên kết đặt lại mật khẩu bảo mật qua hệ thống SMTP email.
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
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#1e293b' }}>Quên mật khẩu? 🔒</h1>
            <p className="text-sm mt-1.5 font-medium" style={{ color: '#697a8d' }}>Điền email của bạn để bắt đầu khôi phục mật khẩu.</p>
          </div>

          <div
            className="rounded-2xl p-7 space-y-4"
            style={{
              background: '#fff',
              border: '1px solid rgba(108,117,147,0.10)',
              boxShadow: '0 4px 24px rgba(108,117,147,0.10)',
            }}
          >
            {success ? (
              <div className="text-center space-y-3.5 py-4">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-600 border border-green-100">
                  <Send className="w-6 h-6" />
                </div>
                <div className="font-bold text-sm text-foreground">Email đã được gửi thành công!</div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Vui lòng kiểm tra hộp thư đến (hoặc hộp thư rác/spam) của địa chỉ email <strong>{email}</strong> để lấy liên kết thiết lập mật khẩu mới.
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
                  label="Email tài khoản *"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                />
                
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3 text-sm font-bold rounded-xl mt-2"
                  loading={loading}
                >
                  Gửi yêu cầu khôi phục
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
