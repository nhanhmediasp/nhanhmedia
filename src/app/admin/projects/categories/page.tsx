'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button, Badge, showToast, Dialog, PageHeader, EmptyState, LoadingSkeleton, Input, StatusBadge } from '@/components/ui';
import { Search, Plus, Edit2, Trash2, Calendar, Folder, Eye } from 'lucide-react';
import { ProjectCategoryAvatar, CATEGORY_ICONS, CATEGORY_ICON_STYLES } from '@/components/ProjectCategoryAvatar';

interface ProjectCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  createdAt: string;
  projects?: any[];
  totalSpent: number;
  _count: {
    projects: number;
  };
}

const IconPicker = ({ selectedIcon, onChange }: { selectedIcon: string; onChange: (icon: string) => void }) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
        Biểu tượng đại diện (Icon)
      </label>
      <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-border max-h-48 overflow-y-auto">
        {Object.keys(CATEGORY_ICONS).map((iconKey) => {
          const isSelected = selectedIcon === iconKey;
          const style = CATEGORY_ICON_STYLES[iconKey] || CATEGORY_ICON_STYLES.Folder;
          const IconComp = CATEGORY_ICONS[iconKey];
          return (
            <button
              key={iconKey}
              type="button"
              onClick={() => onChange(iconKey)}
              title={iconKey}
              className={`p-2.5 rounded-lg flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                isSelected ? 'ring-2 ring-primary scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105'
              }`}
              style={{
                background: style.bg,
                color: style.color,
                borderColor: isSelected ? style.color : 'transparent'
              }}
            >
              <IconComp className="w-5 h-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function ProjectCategoriesPage() {
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Projects preview state (fallback/unused but kept)
  const [viewProjects, setViewProjects] = useState<any[] | null>(null);
  const [viewName, setViewName] = useState<string>('');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('Folder');
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [editingCategory, setEditingCategory] = useState<ProjectCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Folder');
  const [updating, setUpdating] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/projects/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      } else {
        showToast('Không thể tải danh sách phân loại dự án.', 'error');
      }
    } catch (error) {
      console.error('Fetch project categories error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Tên phân loại là bắt buộc.', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/projects/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          icon: newIcon,
          color: newIcon, // for simplicity, store same value or support separately
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Tạo phân loại dự án mới thành công!', 'success');
        setIsCreateOpen(false);
        setNewName('');
        setNewIcon('Folder');
        fetchCategories();
      } else {
        showToast(data.error || 'Lỗi khi tạo phân loại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (c: ProjectCategory) => {
    setEditingCategory(c);
    setEditName(c.name);
    setEditIcon(c.icon || 'Folder');
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editName.trim()) {
      showToast('Tên phân loại là bắt buộc.', 'error');
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/projects/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          icon: editIcon,
          color: editIcon,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cập nhật phân loại thành công!', 'success');
        setEditingCategory(null);
        fetchCategories();
      } else {
        showToast(data.error || 'Lỗi cập nhật phân loại.', 'error');
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
      const res = await fetch(`/api/admin/projects/categories/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Xóa phân loại dự án thành công!', 'success');
        setCategories(prev => prev.filter(c => c.id !== deleteId));
      } else {
        showToast(data.error || 'Lỗi khi xóa phân loại.', 'error');
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

  const filtered = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedCategories = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Phân loại Dự Án 📁"
          description="Quản lý danh mục, loại hình và biểu tượng nhận diện các dự án."
        />
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Thêm phân loại</span>
        </Button>
      </div>

      {/* Controls Card */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Tìm kiếm phân loại dự án..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-xs font-bold text-slate-400 self-end sm:self-center shrink-0">
            Tổng cộng: <span className="text-primary">{filtered.length}</span> phân loại
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
          icon={Folder}
          title="Không tìm thấy phân loại nào"
          description={searchTerm ? "Hãy thử tìm kiếm với từ khóa khác." : "Bắt đầu bằng việc thêm một phân loại dự án mới."}
          action={
            !searchTerm ? (
              <Button onClick={() => setIsCreateOpen(true)}>
                Tạo phân loại đầu tiên
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
                  <th className="px-6 py-5 w-20 text-center">Icon</th>
                  <th className="px-6 py-5">Tên phân loại</th>
                  <th className="px-6 py-5 w-40 text-center">Số lượng dự án</th>
                  <th className="px-6 py-5 w-44 text-right">Tổng tiền sử dụng</th>
                  <th className="px-6 py-5 w-40">Ngày tạo</th>
                  <th className="px-6 py-5 w-32 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedCategories.map((cat, idx) => {
                  const stt = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="px-6 py-4.5 align-middle text-center text-xs font-bold text-slate-400">
                        {stt}
                      </td>
                      <td className="px-6 py-4.5 align-middle text-center">
                        <ProjectCategoryAvatar iconName={cat.icon} size="md" />
                      </td>
                      <td className="px-6 py-4.5 align-middle">
                        <div className="font-bold text-sm text-foreground">{cat.name}</div>
                      </td>
                      <td className="px-6 py-4.5 align-middle text-center">
                        <Link href={`/admin/projects/categories/${cat.id}`}>
                          <Badge variant={cat._count.projects > 0 ? "primary" : "secondary"} className="cursor-pointer hover:scale-105 transition-transform">
                            {cat._count.projects} dự án
                          </Badge>
                        </Link>
                      </td>
                      <td className="px-6 py-4.5 align-middle text-right font-extrabold text-rose-600 text-sm">
                        {formatVND(cat.totalSpent || 0)}
                      </td>
                      <td className="px-6 py-4.5 align-middle text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          <span>{formatDate(cat.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 align-middle text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <Link href={`/admin/projects/categories/${cat.id}`}>
                            <button
                              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                              title="Xem chi tiết & thống kê"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(cat.id)}
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
        </Card>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                Thêm Phân loại Dự Án mới 📁
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCategory}>
              <div className="px-6 py-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tên phân loại <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Ví dụ: Thiết kế Website, SEO, Marketing..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>

                <IconPicker selectedIcon={newIcon} onChange={setNewIcon} />
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
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-base">
                Chỉnh sửa Phân loại Dự Án 📁
              </h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg focus:outline-none cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateCategory}>
              <div className="px-6 py-6 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tên phân loại <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Tên phân loại..."
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <IconPicker selectedIcon={editIcon} onChange={setEditIcon} />
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCategory(null)}
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
        title="Xác nhận xóa phân loại ⚠️"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-655 leading-relaxed">
            Bạn có chắc chắn muốn xóa phân loại dự án này? Các dự án thuộc phân loại này sẽ bị hủy liên kết danh mục (chuyển về không phân loại).
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="cursor-pointer"
            >
              {deleting ? 'Đang xóa...' : 'Đồng ý xóa'}
            </Button>
          </div>
        </div>
      </Dialog>

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
                  Chưa có dự án nào liên kết với danh mục này.
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
    </div>
  );
}
