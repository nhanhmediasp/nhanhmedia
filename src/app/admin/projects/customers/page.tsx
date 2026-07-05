'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button, Badge, showToast, Dialog, PageHeader, EmptyState, LoadingSkeleton, Input, Textarea, StatusBadge, MediaPicker } from '@/components/ui';
import { Search, Plus, Edit2, Trash2, Calendar, User, Phone, Mail, Link as LinkIcon, MessageSquare, Clipboard, Eye, Upload, X } from 'lucide-react';

interface ProjectCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  zalo: string | null;
  facebook: string | null;
  note: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  projects?: any[];
  totalSpent?: number;
  _count: {
    projects: number;
  };
}

export default function ProjectCustomersPage() {
  const [customers, setCustomers] = useState<ProjectCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and Pagination states
  const [projectFilter, setProjectFilter] = useState<'all' | 'has_projects' | 'no_projects'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Projects preview state
  const [viewProjects, setViewProjects] = useState<any[] | null>(null);
  const [viewName, setViewName] = useState<string>('');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newZalo, setNewZalo] = useState('');
  const [newFacebook, setNewFacebook] = useState('');
  const [newNote, setNewNote] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [editingCustomer, setEditingCustomer] = useState<ProjectCustomer | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editZalo, setEditZalo] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editNote, setEditNote] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Avatar / MediaPicker State
  const [newAvatarUrl, setNewAvatarUrl] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'create' | 'edit' | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/projects/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      } else {
        showToast('Không thể tải danh sách khách hàng dự án.', 'error');
      }
    } catch (error) {
      console.error('Fetch project customers error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Tên khách hàng là bắt buộc.', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/projects/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          email: newEmail,
          zalo: newZalo,
          facebook: newFacebook,
          note: newNote,
          avatarUrl: newAvatarUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Thêm khách hàng dự án mới thành công!', 'success');
        setIsCreateOpen(false);
        // Clear fields
        setNewName('');
        setNewPhone('');
        setNewEmail('');
        setNewZalo('');
        setNewFacebook('');
        setNewNote('');
        setNewAvatarUrl('');
        fetchCustomers();
      } else {
        showToast(data.error || 'Lỗi khi thêm khách hàng.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (c: ProjectCustomer) => {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone || '');
    setEditEmail(c.email || '');
    setEditZalo(c.zalo || '');
    setEditFacebook(c.facebook || '');
    setEditNote(c.note || '');
    setEditAvatarUrl(c.avatarUrl || '');
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!editName.trim()) {
      showToast('Tên khách hàng là bắt buộc.', 'error');
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/projects/customers/${editingCustomer.id}`, {
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
        showToast('Cập nhật thông tin khách hàng thành công!', 'success');
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        showToast(data.error || 'Lỗi cập nhật khách hàng.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/customers/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Xóa khách hàng dự án thành công!', 'success');
        setCustomers(prev => prev.filter(c => c.id !== deleteId));
      } else {
        showToast(data.error || 'Lỗi khi xóa khách hàng.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const filtered = customers.filter((cust) => {
    const matchesSearch =
      cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cust.phone && cust.phone.includes(searchTerm)) ||
      (cust.email && cust.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (projectFilter === 'has_projects') {
      return matchesSearch && cust._count.projects > 0;
    }
    if (projectFilter === 'no_projects') {
      return matchesSearch && cust._count.projects === 0;
    }
    return matchesSearch;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, projectFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCustomers = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Khách hàng Dự Án 👥"
          description="Quản lý khách hàng thuộc khối dự án riêng biệt, không ảnh hưởng đơn hàng dịch vụ."
        />
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Thêm khách hàng</span>
        </Button>
      </div>

      {/* Controls Card */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-3 w-full sm:max-w-xl flex-col sm:flex-row">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm theo tên, số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value as any)}
              className="w-full sm:w-56 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white text-slate-700"
            >
              <option value="all">Tất cả khách hàng</option>
              <option value="has_projects">Có dự án liên kết</option>
              <option value="no_projects">Chưa có dự án</option>
            </select>
          </div>
          <div className="text-xs font-bold text-slate-400 self-end sm:self-center shrink-0">
            Tổng cộng: <span className="text-primary">{filtered.length}</span> khách hàng
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {loading ? (
        <Card>
          <CardContent className="p-8">
            <LoadingSkeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title="Không tìm thấy khách hàng dự án nào"
          description={searchTerm ? "Hãy thử tìm kiếm với từ khóa khác." : "Bắt đầu bằng việc thêm một khách hàng dự án mới."}
          action={
            !searchTerm ? (
              <Button onClick={() => setIsCreateOpen(true)}>
                Tạo khách hàng đầu tiên
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-border/80 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  <th className="px-6 py-5 w-16 text-center">STT</th>
                  <th className="px-6 py-5">Họ và tên</th>
                  <th className="px-6 py-5">Liên hệ</th>
                  <th className="px-6 py-5 w-40 text-center">Số lượng dự án</th>
                  <th className="px-6 py-5 w-44 text-right">Tổng tiền sử dụng</th>
                  <th className="px-6 py-5 w-40">Ngày tạo</th>
                  <th className="px-6 py-5 w-32 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedCustomers.map((cust, idx) => {
                  const stt = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="px-6 py-4.5 align-middle text-center text-xs font-bold text-slate-400">
                        {stt}
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        <div className="font-bold text-sm text-foreground flex items-center gap-3">
                          {cust.avatarUrl ? (
                            <img
                              src={cust.avatarUrl}
                              alt={cust.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#a145ab]/10 text-[#a145ab] flex items-center justify-center font-bold text-xs shrink-0 select-none">
                              {cust.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{cust.name}</span>
                        </div>
                        {cust.note && (
                          <div className="text-xs text-slate-400 mt-1 italic max-w-xs truncate">{cust.note}</div>
                        )}
                      </td>
                      <td className="px-6 py-4.5 align-middle text-xs space-y-1">
                        {cust.phone && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="w-3.5 h-3.5 opacity-60" />
                            <span>{cust.phone}</span>
                          </div>
                        )}
                        {cust.email && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail className="w-3.5 h-3.5 opacity-60" />
                            <span>{cust.email}</span>
                          </div>
                        )}
                        {(cust.zalo || cust.facebook) && (
                          <div className="flex items-center gap-3 mt-1">
                            {cust.zalo && (
                              <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                Zalo: {cust.zalo}
                              </span>
                            )}
                            {cust.facebook && (
                              <a
                                href={cust.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 bg-slate-50 text-primary hover:underline px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200"
                              >
                                <LinkIcon className="w-2.5 h-2.5" />
                                FB Link
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4.5 align-middle text-center">
                        <Link href={`/admin/projects/customers/${cust.id}`}>
                          <Badge variant={cust._count.projects > 0 ? "primary" : "secondary"} className="cursor-pointer hover:scale-105 transition-transform">
                            {cust._count.projects} dự án
                          </Badge>
                        </Link>
                      </td>
                      <td className="px-6 py-4.5 align-middle text-right font-extrabold text-rose-600 text-sm">
                        {formatVND(cust.totalSpent || 0)}
                      </td>
                      <td className="px-6 py-4.5 align-middle text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          <span>{formatDate(cust.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link href={`/admin/projects/customers/${cust.id}`}>
                            <button
                              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                              title="Xem chi tiết & thống kê"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(cust.id)}
                            className="p-2 rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4.5 bg-slate-50/50 dark:bg-zinc-800/20 border-t border-border/80 flex items-center justify-between gap-4 flex-col sm:flex-row text-xs font-bold text-slate-500">
              <div>
                Hiển thị từ <span className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> đến{' '}
                <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, totalItems)}</span> trong{' '}
                <span className="text-primary">{totalItems}</span> khách hàng
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Trước
                </Button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <Button
                    key={idx}
                    size="xs"
                    variant={currentPage === idx + 1 ? 'primary' : 'outline'}
                    onClick={() => setCurrentPage(idx + 1)}
                  >
                    {idx + 1}
                  </Button>
                ))}
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                Thêm Khách hàng Dự Án mới 👥
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="px-6 py-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <Input
                  label="Họ và tên *"
                  placeholder="Nhập họ tên khách hàng..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
                
                <div className="flex gap-4 items-center py-2">
                  <div className="relative shrink-0">
                    {newAvatarUrl ? (
                      <img
                        src={newAvatarUrl}
                        alt="New Avatar"
                        className="w-14 h-14 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-dashed border-slate-300">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    {newAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setNewAvatarUrl('')}
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
                      setMediaPickerTarget('create');
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
                    placeholder="Ví dụ: 0912345678"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="client@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Zalo"
                    placeholder="SĐT zalo hoặc username..."
                    value={newZalo}
                    onChange={(e) => setNewZalo(e.target.value)}
                  />
                  <Input
                    label="Đường dẫn Facebook"
                    placeholder="https://facebook.com/username"
                    value={newFacebook}
                    onChange={(e) => setNewFacebook(e.target.value)}
                  />
                </div>
                <Textarea
                  label="Ghi chú"
                  placeholder="Ghi chú thêm về khách hàng dự án này..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={creating}
                >
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={creating} className="cursor-pointer">
                  Tạo mới
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                Chỉnh sửa Khách hàng Dự Án 👥
              </h3>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateCustomer}>
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
                      setMediaPickerTarget('edit');
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
                  onClick={() => setEditingCustomer(null)}
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

      {/* DELETE DIALOG */}
      <Dialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Xác nhận xóa khách hàng dự án ⚠️"
        description="Bạn có chắc chắn muốn xóa khách hàng dự án này? Các dự án thuộc khách hàng này sẽ bị hủy liên kết khách hàng (chuyển về không có khách hàng)."
        confirmText="Đồng ý xóa"
        cancelText="Hủy bỏ"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
      />

      {/* VIEW PROJECTS MODAL */}
      {viewProjects !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                Danh sách dự án liên kết — {viewName}
              </h3>
              <button
                type="button"
                onClick={() => setViewProjects(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {viewProjects.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6 italic">
                  Chưa có dự án nào liên kết với khách hàng này.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {viewProjects.map((proj: any) => (
                    <div key={proj.id} className="py-3.5 flex items-center justify-between text-sm">
                      <div className="min-w-0 pr-3">
                        <a
                          href={`/admin/projects/${proj.id}`}
                          className="font-bold text-slate-800 hover:text-primary hover:underline block truncate text-sm"
                        >
                          {proj.name}
                        </a>
                        <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                          Bắt đầu: {formatDate(proj.startDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3.5 shrink-0">
                        <span className="text-xs font-extrabold text-slate-500">{proj.progress}%</span>
                        <StatusBadge status={proj.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end rounded-b-2xl">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewProjects(null)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Media Picker */}
      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => {
          setMediaPickerOpen(false);
          setMediaPickerTarget(null);
        }}
        onSelect={(url) => {
          if (mediaPickerTarget === 'create') {
            setNewAvatarUrl(url);
          } else if (mediaPickerTarget === 'edit') {
            setEditAvatarUrl(url);
          }
          setMediaPickerOpen(false);
          setMediaPickerTarget(null);
        }}
        title="Thư viện ảnh - Chọn ảnh đại diện khách hàng"
      />
    </div>
  );
}
