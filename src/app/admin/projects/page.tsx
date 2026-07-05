'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Button,
  Input,
  Select,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  showToast,
  Dialog,
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  LoadingSkeleton,
  Textarea,
} from '@/components/ui';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  Grid,
  List,
  ChevronRight,
  ExternalLink,
  User,
} from 'lucide-react';
import { ProjectCategoryAvatar } from '@/components/ProjectCategoryAvatar';

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  progress: number;
  totalCost: number;
  categoryId: string | null;
  category: { id: string; name: string; icon: string | null; color: string | null } | null;
  customerId: string | null;
  customer: { id: string; name: string; phone: string; email: string | null; avatarUrl?: string | null } | null;
}

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('running');
  const [categoryId, setCategoryId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [saving, setSaving] = useState(false);

  // Categories & Customers state
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      } else {
        showToast('Lỗi tải danh sách dự án.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/projects/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/projects/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchCategories();
    fetchCustomers();
  }, []);

  const handleOpenAddModal = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setStatus('running');
    setCategoryId('');
    setCustomerId('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: ProjectItem) => {
    setEditId(p.id);
    setName(p.name);
    setDescription(p.description || '');
    setStartDate(p.startDate.split('T')[0]);
    setEndDate(p.endDate ? p.endDate.split('T')[0] : '');
    setStatus(p.status);
    setCategoryId(p.categoryId || '');
    setCustomerId(p.customerId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate) {
      showToast('Vui lòng nhập đầy đủ thông tin bắt buộc.', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/admin/projects/${editId}` : '/api/admin/projects';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          startDate,
          endDate: endDate || null,
          status,
          categoryId: categoryId || null,
          customerId: customerId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(editId ? 'Cập nhật dự án thành công!' : 'Tạo dự án mới thành công!', 'success');
        setIsModalOpen(false);
        fetchProjects();
      } else {
        showToast(data.error || 'Có lỗi xảy ra.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Xóa dự án thành công!', 'success');
        setDeleteId(null);
        fetchProjects();
      } else {
        showToast('Không thể xóa dự án.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Chưa xác định';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === '' || p.status === statusFilter;
    const matchCustomer = customerFilter === '' || p.customerId === customerFilter;
    const matchCategory = categoryFilter === '' || p.categoryId === categoryFilter;
    return matchSearch && matchStatus && matchCustomer && matchCategory;
  });

  // Calculate high-level stats
  const totalCount = projects.length;
  const runningCount = projects.filter((p) => p.status === 'running').length;
  const totalCostSum = projects.reduce((sum, p) => sum + p.totalCost, 0);
  const avgProgressRunning = (() => {
    const running = projects.filter((p) => p.status === 'running');
    if (running.length === 0) return 0;
    const sum = running.reduce((s, p) => s + p.progress, 0);
    return Math.round((sum / running.length) * 10) / 10;
  })();

  const statusOptions = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'running', label: 'Đang làm' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'paused', label: 'Tạm dừng' },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Dự Án 📁"
        description="Theo dõi danh sách dự án, tiến độ công việc, chi phí website và công cụ hỗ trợ."
      >
        <Link href="/admin/projects/dashboard">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 py-2">
            <TrendingUp className="w-4 h-4" />
            Xem Báo cáo Tổng quát
          </Button>
        </Link>
        <Button variant="primary" size="sm" onClick={handleOpenAddModal} className="flex items-center gap-1">
          <Plus className="w-4.5 h-4.5" />
          Tạo dự án mới
        </Button>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Tổng số dự án"
          value={totalCount}
          description="Dự án trong toàn bộ hệ thống"
          icon={<Briefcase className="w-6 h-6" />}
          iconColor="primary"
        />
        <StatCard
          title="Dự án Đang chạy"
          value={runningCount}
          description="Đang trong quá trình thực hiện"
          icon={<Calendar className="w-6 h-6" />}
          iconColor="success"
        />
        <StatCard
          title="Tổng chi phí"
          value={formatVND(totalCostSum)}
          description="Gồm phí Website và Công cụ"
          icon={<DollarSign className="w-6 h-6" />}
          iconColor="warning"
        />
        <StatCard
          title="Tiến độ trung bình"
          value={`${avgProgressRunning}%`}
          description="Tính trên các dự án đang chạy"
          icon={<TrendingUp className="w-6 h-6" />}
          iconColor="info"
        />
      </div>

      {/* Search & Filters row */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl"
        style={{
          background: '#fff',
          border: '1px solid rgba(108,117,147,0.10)',
          boxShadow: '0 2px 8px rgba(108,117,147,0.05)',
        }}
      >
        <div className="flex-1 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm dự án theo tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl transition-all duration-200 focus:outline-none bg-slate-50 border border-slate-200 focus:border-primary focus:bg-white"
            />
          </div>
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl transition-all duration-200 focus:outline-none bg-slate-50 border border-slate-200 focus:border-primary cursor-pointer"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl transition-all duration-200 focus:outline-none bg-slate-50 border border-slate-200 focus:border-primary cursor-pointer"
            >
              <option value="">Tất cả phân loại</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-48">
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl transition-all duration-200 focus:outline-none bg-slate-50 border border-slate-200 focus:border-primary cursor-pointer"
            >
              <option value="">Tất cả khách hàng</option>
              {customers.map((cust) => (
                <option key={cust.id} value={cust.id}>
                  {cust.name}
                </option>
              ))}
            </select>
          </div>
          {(searchTerm || statusFilter || categoryFilter || customerFilter) && (
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setCategoryFilter('');
                  setCustomerFilter('');
                }}
                className="w-full sm:w-auto h-[42px] border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 self-end sm:self-auto shrink-0 border border-slate-200/55">
          <button
            onClick={() => setViewMode('card')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'card' ? 'bg-white text-primary shadow-sm font-bold' : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'table' ? 'bg-white text-primary shadow-sm font-bold' : 'text-slate-500 hover:bg-white/50'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid / Table Content */}
      {loading ? (
        <LoadingSkeleton variant={viewMode === 'table' ? 'table' : 'card'} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Không tìm thấy dự án nào"
          description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm, hoặc thêm dự án mới."
          actionLabel="Tạo dự án mới"
          onAction={handleOpenAddModal}
        />
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <Card key={p.id} className="hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="min-w-0 pr-2">
                    <CardTitle className="text-base font-extrabold truncate text-slate-800">
                      {p.name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {p.category && (
                        <div className="flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-violet-100">
                          <ProjectCategoryAvatar iconName={p.category.icon} size="sm" />
                          <span>{p.category.name}</span>
                        </div>
                      )}
                      {p.customer && (
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-blue-100">
                          {p.customer.avatarUrl ? (
                            <img
                              src={p.customer.avatarUrl}
                              alt={p.customer.name}
                              className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <User className="w-3 h-3 text-blue-500" />
                          )}
                          <span>{p.customer.name}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">
                        Bắt đầu: {formatDate(p.startDate)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={p.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <p className="text-xs text-slate-550 leading-relaxed line-clamp-2 h-8" title={p.description || ''}>
                    {p.description || 'Chưa có mô tả ngắn về dự án này.'}
                  </p>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500">Tiến độ công việc</span>
                      <span className="text-primary">{p.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${p.progress}%`,
                          background: 'linear-gradient(90deg,#c060c8 0%,#a145ab 100%)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Date target */}
                  {p.endDate && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Ngày hoàn thành dự kiến: <strong>{formatDate(p.endDate)}</strong></span>
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="px-7 py-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tổng chi phí</span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-450">{formatVND(p.totalCost)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Link href={`/admin/projects/${p.id}`}>
                    <Button variant="outline" size="sm" className="flex items-center gap-1 py-1.5 px-3">
                      <span>Chi tiết</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"
          style={{ boxShadow: '0 4px 12px rgba(108,117,147,0.04)' }}
        >
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 text-slate-500">
                <th className="px-6 py-4">Tên dự án</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Tiến độ</th>
                <th className="px-6 py-4">Tổng chi phí</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                      <span>{p.name}</span>
                      {p.category && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-bold">
                          <ProjectCategoryAvatar iconName={p.category.icon} size="sm" />
                          {p.category.name}
                        </span>
                      )}
                      {p.customer && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold">
                          {p.customer.avatarUrl ? (
                            <img
                              src={p.customer.avatarUrl}
                              alt={p.customer.name}
                              className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <User className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          {p.customer.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-xs">{p.description || 'Không có mô tả'}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-655 font-medium">
                    <div>Bắt đầu: {formatDate(p.startDate)}</div>
                    {p.endDate && <div className="mt-0.5">Dự kiến: {formatDate(p.endDate)}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-slate-600 min-w-[32px]">{p.progress}%</span>
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${p.progress}%`,
                            background: 'linear-gradient(90deg,#c060c8 0%,#a145ab 100%)',
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-extrabold text-rose-600">
                    {formatVND(p.totalCost)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`/admin/projects/${p.id}`} title="Xem chi tiết">
                        <button className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog Thêm/Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {editId ? 'Chỉnh sửa dự án 📝' : 'Tạo dự án mới 🚀'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-6 space-y-4">
                <Input
                  label="Tên dự án *"
                  placeholder="Ví dụ: Thiết kế Website Bất Động Sản"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Textarea
                  label="Mô tả ngắn"
                  placeholder="Nhập mô tả ngắn gọn về dự án..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Ngày bắt đầu *"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                  <Input
                    label="Ngày hoàn thành dự kiến"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Trạng thái"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    options={[
                      { value: 'running', label: 'Đang làm' },
                      { value: 'completed', label: 'Hoàn thành' },
                      { value: 'paused', label: 'Tạm dừng' },
                    ]}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Phân loại dự án
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                    >
                      <option value="">-- Chưa phân loại --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Khách hàng liên kết
                    </label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                    >
                      <option value="">-- Chọn khách hàng --</option>
                      {customers.map((cust) => (
                        <option key={cust.id} value={cust.id}>
                          {cust.name} ({cust.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-2xl">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={saving}>
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  {editId ? 'Cập nhật' : 'Tạo dự án'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Xác nhận xóa */}
      <Dialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa dự án ⚠️"
        description="Hành động này sẽ xóa hoàn toàn dự án và tất cả thông tin liên quan như các cột Kanban, công việc, chi phí website, và chi phí công cụ. Thao tác này không thể khôi phục."
        confirmText="Xóa hoàn toàn"
        cancelText="Hủy bỏ"
        isDanger={true}
        isLoading={deleting}
      />
    </div>
  );
}
