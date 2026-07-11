'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  StatCard,
  StatusBadge,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  showToast,
} from '@/components/ui';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Clock,
  TrendingUp,
  ExternalLink,
  Filter,
  RefreshCw,
  FolderGit2,
  Tag,
  Briefcase,
  User,
} from 'lucide-react';

interface WorkLogItem {
  id: string;
  projectId: string | null;
  categoryId: string | null;
  customerId: string | null;
  title: string;
  description: string | null;
  hours: number;
  hourlyRate: number;
  websiteUrl: string | null;
  status: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string } | null;
  category: { id: string; name: string; color: string | null } | null;
  customer: { id: string; name: string } | null;
}

export default function WorkLogsDashboard() {
  const [workLogs, setWorkLogs] = useState<WorkLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Lists for dropdowns
  const [projects, setProjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRange, setFilterRange] = useState('all');

  // Aggregated Metrics
  const [metrics, setMetrics] = useState({
    totalHours: 0,
    totalEarnings: 0,
    activeTasksCount: 0,
  });

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [status, setStatus] = useState('completed');
  const [date, setDate] = useState('');
  const [projectId, setProjectId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [customerId, setCustomerId] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchLists = async () => {
    try {
      const [resProj, resCat, resCust] = await Promise.all([
        fetch('/api/admin/projects'),
        fetch('/api/admin/projects/categories'),
        fetch('/api/admin/projects/customers'),
      ]);

      if (resProj.ok) {
        const data = await resProj.json();
        setProjects(data.projects || []);
      }
      if (resCat.ok) {
        const data = await resCat.json();
        setCategories(data.categories || []);
      }
      if (resCust.ok) {
        const data = await resCust.json();
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error('Error fetching list data:', err);
    }
  };

  const fetchWorkLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filterProject !== 'all') queryParams.append('projectId', filterProject);
      if (filterCategory !== 'all') queryParams.append('categoryId', filterCategory);
      if (filterStatus !== 'all') queryParams.append('status', filterStatus);
      if (filterRange !== 'all') queryParams.append('range', filterRange);
      if (search.trim()) queryParams.append('search', search);

      const res = await fetch(`/api/admin/work-logs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setWorkLogs(data.workLogs || []);
        setMetrics(data.metrics || { totalHours: 0, totalEarnings: 0, activeTasksCount: 0 });
      } else {
        showToast('Lỗi tải danh sách công việc.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [filterProject, filterCategory, filterStatus, filterRange, search]);

  const handleOpenAddModal = () => {
    setEditId(null);
    setTitle('');
    setDescription('');
    setHours('1');
    setHourlyRate('');
    setWebsiteUrl('');
    setStatus('completed');
    setDate(new Date().toISOString().split('T')[0]);
    setProjectId('');
    setCategoryId('');
    setCustomerId('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (log: WorkLogItem) => {
    setEditId(log.id);
    setTitle(log.title);
    setDescription(log.description || '');
    setHours(String(log.hours));
    setHourlyRate(String(log.hourlyRate));
    setWebsiteUrl(log.websiteUrl || '');
    setStatus(log.status);
    setDate(new Date(log.date).toISOString().split('T')[0]);
    setProjectId(log.projectId || '');
    setCategoryId(log.categoryId || '');
    setCustomerId(log.customerId || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hours || !date) {
      showToast('Vui lòng điền đủ thông tin bắt buộc.', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/admin/work-logs/${editId}` : '/api/admin/work-logs';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          hours: parseFloat(hours),
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
          websiteUrl,
          status,
          date,
          projectId: projectId || null,
          categoryId: categoryId || null,
          customerId: customerId || null,
        }),
      });

      if (res.ok) {
        showToast(editId ? 'Cập nhật thành công!' : 'Thêm mới thành công!', 'success');
        setIsModalOpen(false);
        fetchWorkLogs();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || 'Có lỗi xảy ra.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/work-logs/${deleteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Xóa nhật ký công việc thành công!', 'success');
        setDeleteId(null);
        fetchWorkLogs();
      } else {
        showToast('Lỗi khi xóa nhật ký công việc.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Bảng kê khai thời gian làm việc (To-do) ⏱️"
        description="Ghi nhận, quản lý và thống kê thời gian thực hiện, đơn giá và chi phí của các đầu việc."
      >
        <Button variant="primary" size="sm" onClick={handleOpenAddModal} className="flex items-center gap-1.5 py-2.5">
          <Plus className="w-4 h-4" />
          Kê khai giờ làm mới
        </Button>
      </PageHeader>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Tổng thời gian làm việc"
          value={`${metrics.totalHours.toLocaleString('vi-VN')} giờ`}
          description="Tích lũy theo bộ lọc"
          icon={<Clock className="w-5 h-5" />}
          iconColor="primary"
        />
        <StatCard
          title="Tổng thu nhập / Chi phí kê khai"
          value={formatCurrency(metrics.totalEarnings)}
          description="Đã nhân với đơn giá giờ làm"
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="success"
        />
        <StatCard
          title="Đầu việc đang xử lý"
          value={`${metrics.activeTasksCount} công việc`}
          description="Đầu việc có trạng thái 'Đang xử lý'"
          icon={<TrendingUp className="w-5 h-5" />}
          iconColor="info"
        />
      </div>

      {/* Filter and Action Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-slate-400">
                Tìm kiếm đầu việc
              </label>
              <Input
                placeholder="Nhập tiêu đề hoặc mô tả..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                className="py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-slate-400">
                Lọc theo Dự án
              </label>
              <Select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                options={[
                  { value: 'all', label: 'Tất cả dự án' },
                  { value: 'none', label: 'Không liên kết dự án' },
                  ...projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
                className="py-2 text-xs h-[42px]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-slate-400">
                Lọc theo Phân loại
              </label>
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                options={[
                  { value: 'all', label: 'Tất cả phân loại' },
                  { value: 'none', label: 'Chưa phân loại' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                className="py-2 text-xs h-[42px]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-slate-400">
                Lọc Trạng thái
              </label>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'completed', label: 'Hoàn thành' },
                  { value: 'processing', label: 'Đang xử lý' },
                  { value: 'pending', label: 'Chờ duyệt / Tạm dừng' },
                ]}
                className="py-2 text-xs h-[42px]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5 text-slate-400">
                Mốc thời gian
              </label>
              <Select
                value={filterRange}
                onChange={(e) => setFilterRange(e.target.value)}
                options={[
                  { value: 'all', label: 'Toàn bộ thời gian' },
                  { value: '7days', label: '7 ngày qua' },
                  { value: '30days', label: '30 ngày qua' },
                  { value: 'lastMonth', label: 'Tháng trước' },
                ]}
                className="py-2 text-xs h-[42px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Logs List Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-200 tracking-wider">
                  <th className="px-6 py-4">Công việc & Mô tả</th>
                  <th className="px-6 py-4">Phân loại</th>
                  <th className="px-6 py-4">Dự án</th>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Đơn giá / 1h</th>
                  <th className="px-6 py-4">Thành tiền</th>
                  <th className="px-6 py-4">Website</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <LoadingSkeleton variant="table" />
                    </td>
                  </tr>
                ) : workLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <EmptyState
                        title="Chưa có nhật ký làm việc nào"
                        description="Không tìm thấy đầu việc nào phù hợp với bộ lọc hiện tại. Bấm nút bên dưới để kê khai công việc mới."
                        actionLabel="Kê khai giờ làm"
                        onAction={handleOpenAddModal}
                      />
                    </td>
                  </tr>
                ) : (
                  workLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{log.title}</div>
                        {log.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-xs" title={log.description}>
                            {log.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {log.category ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border uppercase tracking-wider"
                            style={{
                              backgroundColor: `${log.category.color ? log.category.color + '10' : '#f3e8ff'}`,
                              color: log.category.color || '#a855f7',
                              borderColor: `${log.category.color ? log.category.color + '25' : '#e9d5ff'}`,
                            }}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {log.category.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium italic">Không có</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {log.project ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100 max-w-[150px] truncate" title={log.project.name}>
                            <Briefcase className="w-3 h-3 shrink-0" />
                            {log.project.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium italic">Chưa liên kết</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-extrabold text-slate-800 text-sm">{log.hours} giờ</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{formatDate(log.date)}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600">
                        {log.hourlyRate > 0 ? formatCurrency(log.hourlyRate) : 'Miễn phí / lương cứng'}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800 text-sm">
                        {formatCurrency(log.hours * log.hourlyRate)}
                      </td>
                      <td className="px-6 py-4">
                        {log.websiteUrl ? (
                          <a
                            href={log.websiteUrl.startsWith('http') ? log.websiteUrl : `https://${log.websiteUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title={log.websiteUrl}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-slate-350">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(log)}
                            className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(log.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                {editId ? 'Cập nhật kê khai giờ làm ⏱️' : 'Kê khai giờ làm việc mới (To-do) ⏱️'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
                <Input
                  label="Tên đầu công việc *"
                  placeholder="Ví dụ: Thiết kế trang chủ, Sửa lỗi thanh toán..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />

                <Textarea
                  label="Mô tả chi tiết công việc"
                  placeholder="Ghi rõ chi tiết công việc đã thực hiện..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Số giờ làm việc *"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="Ví dụ: 2.5"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    required
                  />
                  <Input
                    label="Đơn giá / 1 giờ (VND)"
                    type="number"
                    step="1000"
                    placeholder="Ví dụ: 150000"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Ngày làm *"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                  <Select
                    label="Trạng thái *"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    options={[
                      { value: 'completed', label: 'Hoàn thành' },
                      { value: 'processing', label: 'Đang xử lý' },
                      { value: 'pending', label: 'Tạm dừng / Chờ duyệt' },
                    ]}
                  />
                </div>

                <Input
                  label="Website liên kết (Ví dụ link Trello, Figma, hoặc web dự án)"
                  placeholder="https://trello.com/..."
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Liên kết Dự án (Không bắt buộc)"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    options={[
                      { value: '', label: 'Không liên kết dự án' },
                      ...projects.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                  <Select
                    label="Phân loại (Không bắt buộc)"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    options={[
                      { value: '', label: 'Chưa phân loại' },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                </div>

                <Select
                  label="Liên kết Khách hàng (Không bắt buộc)"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={[
                    { value: '', label: 'Không liên kết' },
                    ...customers.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={saving} className="cursor-pointer">
                  {editId ? 'Cập nhật' : 'Lưu kê khai'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Xác nhận xóa kê khai làm việc ⚠️"
        description="Bạn có chắc chắn muốn xóa bản kê khai này không? Thao tác này sẽ cập nhật lại tổng giờ và tổng thành tiền thực nhận và không thể hoàn tác."
        confirmText="Xóa bản kê"
        cancelText="Hủy bỏ"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
      />
    </div>
  );
}
