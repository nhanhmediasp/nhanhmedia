'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, showToast, PageHeader, RoleBadge } from '@/components/ui';
import { useAuth } from '@/components/AuthContext';
import { User, KeyRound, Lock } from 'lucide-react';

export default function UserProfilePage() {
  const { user, checkSession } = useAuth();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatarUrl || '');
      // Fetch phone number by calling reports or check details
      const fetchPhone = async () => {
        try {
          const res = await fetch('/api/admin/users'); // Admin endpoint can read all
          if (res.ok) {
            const data = await res.json();
            const me = data.users.find((u: any) => u.id === user.id);
            if (me) {
              setPhone(me.phone || '');
            }
          }
        } catch (error) {
          // If not admin, this query might fail. We can ignore it or fetch it from active user sessions.
        }
      };
      fetchPhone();
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Kích thước file tối đa 5MB.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(data.imageUrl);
        showToast('Tải ảnh đại diện lên thành công!', 'success');
      } else {
        showToast(data.error || 'Upload ảnh thất bại.', 'error');
      }
    } catch (err) {
      console.error('Upload avatar error:', err);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast('Họ tên hiển thị là bắt buộc.', 'error');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      showToast('Xác nhận mật khẩu mới không trùng khớp.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined,
          avatarUrl: avatarUrl || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Cập nhật tài khoản thành công!', 'success');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        checkSession(); // Update Auth Context user name
      } else {
        showToast(data.error || 'Cập nhật thất bại.', 'error');
      }
    } catch (error) {
      console.error('Update profile submit error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <PageHeader 
        title="Hồ sơ cá nhân" 
        description="Cập nhật thông tin hiển thị và thay đổi mật khẩu đăng nhập của bạn."
      />

      <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Card: Profile General Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 py-5">
              <User className="w-5 h-5 text-[#a145ab]" />
              <CardTitle>Thông tin hiển thị</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Họ và tên *"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                
                <div className="w-full">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Địa chỉ email (Read-only)
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 text-sm bg-[#f5f5f9] border border-border rounded-lg text-slate-400 cursor-not-allowed focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Số điện thoại liên lạc"
                  placeholder="Ví dụ: 0977111222"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                
                <div className="w-full">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Cấp bậc tài khoản
                  </label>
                  <div className="pt-2">
                    <RoleBadge role={user.role} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 py-5">
              <KeyRound className="w-5 h-5 text-[#a145ab]" />
              <CardTitle>Đổi mật khẩu đăng nhập</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-xs text-slate-500 leading-normal">
                Chỉ nhập các ô dưới đây nếu bạn có nhu cầu thay đổi mật khẩu hiện tại của tài khoản.
              </p>
              
              <Input
                label="Mật khẩu hiện tại"
                type="password"
                placeholder="Nhập mật khẩu đang sử dụng..."
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required={newPassword.length > 0}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Mật khẩu mới"
                  type="password"
                  placeholder="Mật khẩu mới ít nhất 6 ký tự..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required={oldPassword.length > 0}
                />
                <Input
                  label="Xác nhận mật khẩu mới"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={newPassword.length > 0}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side: Action updates */}
        <div className="space-y-6">
          {/* Avatar Upload Card */}
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Ảnh đại diện</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative group select-none">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800 shadow-md"
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-md"
                    style={{ background: 'linear-gradient(135deg,#c060c8 0%,#a145ab 100%)' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    Đang tải...
                  </div>
                )}
              </div>
              
              <div className="w-full text-center">
                <label className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-750 dark:text-slate-200 rounded-xl hover:bg-slate-150 dark:hover:bg-slate-750 transition-colors cursor-pointer border border-border">
                  Thay đổi ảnh đại diện
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <p className="text-[10px] text-slate-400 mt-2">Định dạng: JPG, PNG, WebP. Tối đa 5MB.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#f7eafa] border border-[#a145ab]/20">
            <CardHeader className="py-5 flex flex-row items-center gap-2">
              <Lock className="w-5 h-5 text-[#a145ab]" />
              <CardTitle className="text-[#a145ab] text-sm font-bold uppercase tracking-wide">Bảo mật tài khoản</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p>Mọi thông tin liên lạc và mật khẩu đều được mã hóa hoặc băm an toàn trong hệ thống của Nhanh Media.</p>
              <p>Tránh chia sẻ mật khẩu của bạn cho người khác để đảm bảo dữ liệu đơn hàng và khách hàng.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-5">
              <CardTitle>Cập nhật hồ sơ</CardTitle>
            </CardHeader>
            <CardContent>
              <Button type="submit" variant="primary" className="w-full font-bold py-2.5 rounded-xl cursor-pointer" loading={saving}>
                Lưu thay đổi
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
