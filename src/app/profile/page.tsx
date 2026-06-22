'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, showToast, PageHeader, RoleBadge } from '@/components/ui';
import { useAuth } from '@/components/AuthContext';
import { User, KeyRound, Lock, Upload } from 'lucide-react';

export default function UserProfilePage() {
  const { user, checkSession } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Kích thước ảnh không được vượt quá 2MB.', 'error');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setUrlInput(data.url);
        setAvatarUrl(data.url);
        setImageLoadError(false);
        showToast('Tải ảnh đại diện lên thành công!', 'success');
      } else {
        showToast(data.error || 'Lỗi khi tải ảnh lên.', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối máy chủ khi upload.', 'error');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatarUrl(user.avatarUrl || '');
      setUrlInput(user.avatarUrl || '');
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

  const validateImageUrl = (url: string): boolean => {
    if (!url) return true;
    if (url.startsWith('/uploads/')) return true;
    if (!url.startsWith('https://')) return false;
    const hasValidExtension = /\.(jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(url);
    const isTrustedDomain = /https:\/\/([a-z0-9-]+\.)*(cloudinary\.com|i\.ibb\.co|imgur\.com)\//i.test(url);
    return hasValidExtension || isTrustedDomain;
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

    if (urlInput && !validateImageUrl(urlInput)) {
      showToast('Link ảnh đại diện không hợp lệ.', 'error');
      return;
    }



    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined,
          avatarUrl: urlInput || undefined,
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
                
                 <Input
                  label="Địa chỉ email *"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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
          {/* Avatar URL Card */}
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Ảnh đại diện</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative group select-none">
                {avatarUrl && !imageLoadError ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 dark:border-slate-800 shadow-md"
                    onError={() => setImageLoadError(true)}
                  />
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-md"
                    style={{ background: 'linear-gradient(135deg,#c060c8 0%,#a145ab 100%)' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="w-full">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Input
                      label="Link ảnh đại diện"
                      placeholder="https://example.com/avatar.jpg"
                      value={urlInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUrlInput(val);
                        setImageLoadError(false);
                        if (!val) {
                          setAvatarUrl('');
                        } else if (validateImageUrl(val)) {
                          setAvatarUrl(val);
                        } else {
                          setImageLoadError(true);
                        }
                      }}
                    />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    loading={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer shrink-0 h-[42px] flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Tải lên</span>
                  </Button>
                </div>
                {imageLoadError && urlInput && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1.5">
                    Link ảnh không hợp lệ hoặc không thể tải ảnh
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  Bắt đầu bằng https://, có đuôi .jpg, .jpeg, .png, .webp, .gif hoặc từ cloudinary.com, i.ibb.co, imgur.com.
                </p>
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
