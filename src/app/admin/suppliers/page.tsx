'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge, showToast, Dialog, PageHeader, EmptyState, LoadingSkeleton, Input } from '@/components/ui';
import { Search, Plus, Eye, Edit2, Trash2, Calendar, ExternalLink, Tag } from 'lucide-react';
import { SupplierAvatar, SUPPLIER_ICONS, SUPPLIER_ICON_STYLES } from '@/components/SupplierAvatar';

interface Supplier {
  id: string;
  name: string;
  contactUrl: string | null;
  icon: string | null;
  createdAt: string;
  _count: {
    orders: number;
  };
}

const IconPicker = ({ selectedIcon, onChange }: { selectedIcon: string; onChange: (icon: string) => void }) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#697a8d' }}>
        Biểu tượng đại diện (Avatar)
      </label>
      <div className="grid grid-cols-5 gap-2.5 p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-border max-h-48 overflow-y-auto">
        {Object.keys(SUPPLIER_ICONS).map((iconKey) => {
          const isSelected = selectedIcon === iconKey;
          const style = SUPPLIER_ICON_STYLES[iconKey] || SUPPLIER_ICON_STYLES.Tag;
          const IconComp = SUPPLIER_ICONS[iconKey];
          return (
            <button
              key={iconKey}
              type="button"
              onClick={() => onChange(iconKey)}
              title={iconKey}
              className={`p-2.5 rounded-lg flex items-center justify-center border transition-all duration-205 cursor-pointer ${
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

export default function AdminSuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierUrl, setNewSupplierUrl]   = useState('');
  const [newSupplierIcon, setNewSupplierIcon] = useState('Tag');
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editSupplierUrl, setEditSupplierUrl]   = useState('');
  const [editSupplierIcon, setEditSupplierIcon] = useState('Tag');
  const [updating, setUpdating] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      } else {
        showToast('Không thể tải danh sách nguồn hàng.', 'error');
      }
    } catch (error) {
      console.error('Fetch suppliers error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      showToast('Tên nguồn hàng là bắt buộc.', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSupplierName,
          contactUrl: newSupplierUrl,
          icon: newSupplierIcon,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Tạo nguồn hàng mới thành công!', 'success');
        setIsCreateOpen(false);
        setNewSupplierName('');
        setNewSupplierUrl('');
        setNewSupplierIcon('Tag');
        fetchSuppliers();
      } else {
        showToast(data.error || 'Lỗi khi tạo nguồn hàng.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setEditSupplierName(s.name);
    setEditSupplierUrl(s.contactUrl || '');
    setEditSupplierIcon(s.icon || 'Tag');
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    if (!editSupplierName.trim()) {
      showToast('Tên nguồn hàng là bắt buộc.', 'error');
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/suppliers/${editingSupplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editSupplierName,
          contactUrl: editSupplierUrl,
          icon: editSupplierIcon,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cập nhật nguồn hàng thành công!', 'success');
        setEditingSupplier(null);
        fetchSuppliers();
      } else {
        showToast(data.error || 'Lỗi cập nhật nguồn hàng.', 'error');
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
      const res = await fetch(`/api/admin/suppliers/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Xóa nguồn hàng thành công!', 'success');
        setSuppliers(prev => prev.filter(s => s.id !== deleteId));
      } else {
        showToast(data.error || 'Lỗi khi xóa nguồn hàng.', 'error');
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

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contactUrl && s.contactUrl.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Nguồn hàng (Tag)"
        description="Quản lý thẻ phân loại nguồn hàng, đối tác, CTV cung cấp tài nguyên."
      >
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Thêm nguồn hàng</span>
        </Button>
      </PageHeader>

      {/* Search Input */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <span className="absolute left-3 top-3.5 text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm nguồn hàng theo tên hoặc liên kết..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-all duration-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Supplier Grid/Table */}
      {loading ? (
        <LoadingSkeleton variant="table" />
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy nguồn hàng nào"
          description="Hệ thống chưa có nguồn hàng nào hoặc không có kết quả khớp với bộ lọc."
          actionLabel="Tạo nguồn hàng"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="px-6 py-5">Nguồn hàng (Tag)</th>
                  <th className="px-6 py-5">Liên kết liên hệ</th>
                  <th className="px-6 py-5 text-center">Đơn hàng đang dùng</th>
                  <th className="px-6 py-5 text-center">Ngày tạo</th>
                  <th className="px-6 py-5 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <SupplierAvatar iconName={s.icon} />
                        <Link href={`/admin/suppliers/${s.id}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-primary transition-colors">
                          {s.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {s.contactUrl ? (
                        <a
                          href={s.contactUrl.startsWith('http') ? s.contactUrl : `https://${s.contactUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold bg-primary/10 px-2.5 py-1 rounded-xl transition-all duration-150"
                        >
                          <span>{s.contactUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-slate-800 dark:text-slate-200">
                      <Badge variant={s._count.orders > 0 ? 'success' : 'secondary'} className="px-2.5 py-1 text-xs font-black">
                        {s._count.orders} đơn
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-center text-xs text-muted-foreground">
                      <div className="flex items-center justify-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(s.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/admin/suppliers/${s.id}`}>
                          <button
                            className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            title="Xem chi tiết các đơn hàng"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-slate-500 hover:text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 cursor-pointer"
                          title="Sửa nguồn hàng"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(s.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                          title="Xóa nguồn hàng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                Tạo Nguồn hàng mới
              </h3>
            </div>
            
            <form onSubmit={handleCreateSupplier}>
              <div className="p-6 space-y-4">
                <Input
                  label="Tên nguồn hàng *"
                  placeholder="Ví dụ: Nguồn hàng chính, CTV Thảo..."
                  value={newSupplierName}
                  onChange={e => setNewSupplierName(e.target.value)}
                  required
                />
                 <Input
                  label="Link liên hệ / URL"
                  placeholder="Ví dụ: https://zalo.me/username..."
                  value={newSupplierUrl}
                  onChange={e => setNewSupplierUrl(e.target.value)}
                />
                <IconPicker selectedIcon={newSupplierIcon} onChange={setNewSupplierIcon} />
              </div>

              <div className="px-6 py-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} disabled={creating}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={creating}>
                  Xác nhận tạo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                Chỉnh sửa nguồn hàng: {editingSupplier.name}
              </h3>
            </div>
            
            <form onSubmit={handleUpdateSupplier}>
              <div className="p-6 space-y-4">
                <Input
                  label="Tên nguồn hàng *"
                  placeholder="Ví dụ: Nguồn hàng chính, CTV Thảo..."
                  value={editSupplierName}
                  onChange={e => setEditSupplierName(e.target.value)}
                  required
                />
                  <Input
                   label="Link liên hệ / URL"
                   placeholder="Ví dụ: https://zalo.me/username..."
                   value={editSupplierUrl}
                   onChange={e => setEditSupplierUrl(e.target.value)}
                 />
                <IconPicker selectedIcon={editSupplierIcon} onChange={setEditSupplierIcon} />
              </div>

              <div className="px-6 py-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingSupplier(null)} disabled={updating}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={updating}>
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa nguồn hàng"
        description="Bạn có chắc chắn muốn xóa nguồn hàng này? Các đơn hàng đang liên kết với nguồn hàng này sẽ tự động chuyển về trạng thái Không có nguồn hàng (Set Null). Hành động này không thể hoàn tác."
        confirmText="Xóa nguồn hàng"
        isDanger={true}
        isLoading={deleting}
      />
    </div>
  );
}
