'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge, showToast, Dialog, PageHeader, EmptyState, LoadingSkeleton, Input, Textarea, StatusBadge, MediaPicker } from '@/components/ui';
import { ArrowLeft, User, Phone, Mail, Link as LinkIcon, Calendar, DollarSign, Activity, Settings, Edit2, AlertCircle, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: string;
  progress: number;
  totalCost: number;
}

interface ProjectCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  facebook: string | null;
  note: string | null;
  avatarUrl: string | null;
  createdAt: string;
  projects: Project[];
}

export default function ProjectCustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<ProjectCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editZalo, setEditZalo] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        // Init edit values
        if (data.customer) {
          setEditName(data.customer.name);
          setEditPhone(data.customer.phone || '');
          setEditEmail(data.customer.email || '');
          setEditZalo(data.customer.zalo || '');
          setEditFacebook(data.customer.facebook || '');
          setEditNote(data.customer.note || '');
          setEditAvatarUrl(data.customer.avatarUrl || '');
        }
      } else {
        showToast('Không thể tải thông tin khách hàng dự án.', 'error');
        router.push('/admin/projects/customers');
      }
    } catch (error) {
      console.error('Fetch customer details error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCustomerDetails();
    }
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Tên khách hàng là bắt buộc.', 'error');
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/projects/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          email: editEmail,
          zalo: editZalo,
          facebook: editFacebook,
          note: editNote,
          avatarUrl: editAvatarUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cập nhật thông tin thành công!', 'success');
        setIsEditOpen(false);
        fetchCustomerDetails();
      } else {
        showToast(data.error || 'Lỗi cập nhật khách hàng.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingSkeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold">Không tìm thấy khách hàng</h3>
        <Link href="/admin/projects/customers">
          <Button variant="primary">Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  // Calculate statistics
  const totalProjects = customer.projects.length;
  const runningProjects = customer.projects.filter(p => p.status === 'running').length;
  const totalInvestment = customer.projects.reduce((sum, p) => sum + p.totalCost, 0);
  const avgProgress = totalProjects > 0
    ? Math.round(customer.projects.reduce((sum, p) => sum + p.progress, 0) / totalProjects)
    : 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link href="/admin/projects/customers" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Khách hàng dự án</span>
          </Link>
          <div className="flex items-center gap-4.5 mt-2">
            {customer.avatarUrl ? (
              <img
                src={customer.avatarUrl}
                alt={customer.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-dashed border-slate-350 shadow-sm">
                <User className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 leading-none">
                {customer.name}
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-1">Hồ sơ chi tiết và phân tích thống kê dự án của khách hàng.</p>
            </div>
          </div>
        </div>
        <Button onClick={() => setIsEditOpen(true)} className="flex items-center gap-1.5 self-start md:self-center cursor-pointer">
          <Edit2 className="w-4 h-4" />
          <span>Sửa thông tin</span>
        </Button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Số lượng dự án</span>
              <span className="text-2xl font-black text-slate-700 block">{totalProjects}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Đang triển khai</span>
              <span className="text-2xl font-black text-slate-700 block">{runningProjects}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Tổng chi phí dự án</span>
              <span className="text-xl font-black text-rose-600 block">{formatVND(totalInvestment)}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Tiến độ trung bình</span>
              <span className="text-2xl font-black text-slate-700 block">{avgProgress}%</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Cards Info */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 space-y-6">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Thông tin liên hệ
            </h3>
            <div className="space-y-4.5 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Họ và tên</span>
                <span className="font-extrabold text-slate-700">{customer.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Số điện thoại</span>
                <span className="font-extrabold text-slate-700">{customer.phone || 'Chưa cập nhật'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Email</span>
                <span className="font-extrabold text-slate-700">{customer.email || 'Chưa cập nhật'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Zalo</span>
                <span className="font-extrabold text-slate-700">{customer.zalo || 'Chưa cập nhật'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Facebook</span>
                <span className="font-extrabold text-slate-700 block mt-0.5">
                  {customer.facebook ? (
                    <a
                      href={customer.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Mở Facebook khách hàng
                    </a>
                  ) : (
                    'Chưa cập nhật'
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">Ghi chú cá nhân</span>
                <p className="text-slate-650 bg-slate-50/70 p-3 rounded-xl border border-slate-100 leading-relaxed text-xs">
                  {customer.note || 'Không có ghi chú nào.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects list */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-primary" />
              Danh sách Dự án liên kết
            </h3>
            {customer.projects.length === 0 ? (
              <EmptyState
                icon={Settings}
                title="Khách hàng này chưa có dự án nào"
                description="Bạn có thể thêm liên kết khách hàng này khi tạo hoặc chỉnh sửa dự án."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-border/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Tên dự án</th>
                      <th className="px-4 py-3">Tiến độ</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Chi phí đầu tư</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {customer.projects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 align-middle">
                          <Link
                            href={`/admin/projects/${proj.id}`}
                            className="font-bold text-sm text-slate-800 hover:text-primary hover:underline"
                          >
                            {proj.name}
                          </Link>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Bắt đầu: {formatDate(proj.startDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 rounded-full h-1.5 dark:bg-zinc-800 shrink-0">
                              <div
                                className="bg-primary h-1.5 rounded-full"
                                style={{ width: `${proj.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500">{proj.progress}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-middle">
                          <StatusBadge status={proj.status} />
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right font-bold text-sm text-rose-600">
                          {formatVND(proj.totalCost)}
                        </td>
                        <td className="px-4 py-3.5 align-middle text-right">
                          <Link href={`/admin/projects/${proj.id}`}>
                            <Button size="xs" variant="outline">
                              Chi tiết
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                Chỉnh sửa Khách hàng Dự Án 👥
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="px-6 py-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <Input
                  label="Họ và tên *"
                  placeholder="Nhập họ tên khách hàng..."
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />

                <div className="flex gap-4 items-center py-2">
                  <div className="relative shrink-0">
                    {editAvatarUrl ? (
                      <img
                        src={editAvatarUrl}
                        alt="Edit Avatar"
                        className="w-14 h-14 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-dashed border-slate-300">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    {editAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl('')}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] hover:bg-rose-600 shadow cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMediaPickerOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs h-9 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn / Tải ảnh đại diện</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Số điện thoại"
                    placeholder="Số điện thoại..."
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="Email..."
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Zalo"
                    placeholder="Zalo..."
                    value={editZalo}
                    onChange={(e) => setEditZalo(e.target.value)}
                  />
                  <Input
                    label="Đường dẫn Facebook"
                    placeholder="Facebook..."
                    value={editFacebook}
                    onChange={(e) => setEditFacebook(e.target.value)}
                  />
                </div>
                <Textarea
                  label="Ghi chú"
                  placeholder="Ghi chú thêm..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  disabled={updating}
                >
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={updating} className="cursor-pointer">
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker */}
      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => {
          setMediaPickerOpen(false);
        }}
        onSelect={(url) => {
          setEditAvatarUrl(url);
          setMediaPickerOpen(false);
        }}
        title="Thư viện ảnh - Chọn ảnh đại diện khách hàng"
      />
    </div>
  );
}
