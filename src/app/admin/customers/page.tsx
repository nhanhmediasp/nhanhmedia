'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Input, Card, CardContent, Badge, showToast, Dialog, PageHeader, RoleBadge, EmptyState, LoadingSkeleton } from '@/components/ui';
import { Search, Plus, Edit2, Trash2, UserCheck, MessageSquare, Phone, Facebook, ArrowUpDown, ArrowUp, ArrowDown, Eye } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  facebook: string | null;
  zalo: string | null;
  email: string | null;
  createdByUserId: string;
  createdByName: string;
  createdByRole: string;
  note: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

type SortField = 'name' | 'orderCount' | 'totalSpent';
type SortDirection = 'asc' | 'desc';

function SortableHeader({ label, field, currentField, currentDirection, onSort, className }: {
  label: string;
  field: SortField;
  currentField: SortField | null;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;
  return (
    <th
      className={`px-6 py-5 cursor-pointer select-none hover:text-primary transition-colors group ${className || ''}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {isActive ? (
            currentDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5" />
          )}
        </span>
      </div>
    </th>
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creators, setCreators] = useState<{ id: string; name: string; role: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [purchaseFilter, setPurchaseFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Sort state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modal form state
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [facebook, setFacebook] = useState('');
  const [zalo, setZalo] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCreators = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setCreators(data.users || []);
      }
    } catch (e) {
      console.error('Fetch creators error:', e);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      } else {
        showToast('Không thể tải danh sách khách hàng.', 'error');
      }
    } catch (error) {
      console.error('Fetch customers error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchCreators();
  }, []);

  const openAddModal = () => {
    setEditId(null);
    setName('');
    setPhone('');
    setFacebook('');
    setZalo('');
    setEmail('');
    setNote('');
    setIsOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setFacebook(c.facebook || '');
    setZalo(c.zalo || '');
    setEmail(c.email || '');
    setNote(c.note || '');
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      showToast('Họ tên và số điện thoại là bắt buộc.', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/customers/${editId}` : '/api/customers';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, facebook, zalo, email, note }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Lưu khách hàng thành công!', 'success');
        setIsOpen(false);
        fetchCustomers();
      } else {
        showToast(data.error || 'Lỗi khi lưu khách hàng.', 'error');
      }
    } catch (error) {
      console.error('Save customer error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deleteId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Xóa khách hàng thành công!', 'success');
        setCustomers(customers.filter((c) => c.id !== deleteId));
      } else {
        showToast(data.error || 'Lỗi khi xóa khách hàng.', 'error');
      }
    } catch (error) {
      console.error('Delete customer error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCreator = creatorFilter === '' || c.createdByUserId === creatorFilter;
    
    let matchesPurchase = true;
    if (purchaseFilter === 'purchased') {
      matchesPurchase = c.orderCount > 0;
    } else if (purchaseFilter === 'not_purchased') {
      matchesPurchase = c.orderCount === 0;
    }

    return matchesSearch && matchesCreator && matchesPurchase;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name': return a.name.localeCompare(b.name) * dir;
      case 'orderCount': return (a.orderCount - b.orderCount) * dir;
      case 'totalSpent': return (a.totalSpent - b.totalSpent) * dir;
      default: return 0;
    }
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, creatorFilter, purchaseFilter]);

  const totalPages = Math.ceil(sortedCustomers.length / PAGE_SIZE);
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Khách hàng"
        description="Xem toàn bộ thông tin khách hàng, số điện thoại, chi tiêu và lịch sử liên hệ."
      >
        <Button onClick={openAddModal} className="flex items-center gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Thêm khách hàng</span>
        </Button>
      </PageHeader>

      {/* Search and Filters */}
      <Card>
        <CardContent className="py-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="md:col-span-2 relative">
              <span className="absolute left-3 top-3.5 text-slate-400">
                <Search className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm khách hàng theo tên, số điện thoại hoặc email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-all duration-200"
              />
            </div>

            <div>
              <select
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Tất cả người tạo</option>
                {creators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role === 'collaborator' ? 'CTV' : c.role === 'agency' ? 'Đại lý' : 'Thành viên'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={purchaseFilter}
                onChange={(e) => setPurchaseFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Tình trạng mua hàng</option>
                <option value="purchased">Đã mua hàng</option>
                <option value="not_purchased">Chưa mua hàng</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Customers List */}
      {loading ? (
        <LoadingSkeleton variant="table" />
      ) : sortedCustomers.length === 0 ? (
        <EmptyState
          title="Chưa có dữ liệu khách hàng"
          description="Không tìm thấy khách hàng nào khớp với bộ lọc hoặc hệ thống chưa có dữ liệu khách hàng."
          actionLabel="Thêm khách hàng"
          onAction={openAddModal}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="px-4 py-5 w-[48px] text-center text-xs">STT</th>
                  <SortableHeader label="Khách hàng" field="name" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <th className="px-6 py-5">Liên lạc</th>
                  <th className="px-6 py-5">Phụ trách bởi</th>
                  <SortableHeader label="Đơn hàng" field="orderCount" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-center" />
                  <SortableHeader label="Tổng chi tiêu" field="totalSpent" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right" />
                  <th className="px-6 py-5 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {paginatedCustomers.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-5 text-center text-xs font-bold text-slate-400">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-foreground">{c.name}</div>
                      {c.note && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]" title={c.note}>
                          Ghi chú: {c.note}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {c.zalo && (
                          <a
                            href={`https://zalo.me/${c.zalo}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-500 hover:underline font-semibold"
                          >
                            Zalo
                          </a>
                        )}
                        {c.facebook && (
                          <a
                            href={c.facebook}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline font-semibold"
                          >
                            Facebook
                          </a>
                        )}
                        {c.email && <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{c.email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{c.createdByName}</div>
                      <div className="mt-1">
                        <RoleBadge role={c.createdByRole} />
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center font-bold text-foreground">{c.orderCount}</td>
                    <td className="px-6 py-5 text-right font-bold text-primary">{formatVND(c.totalSpent)}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/admin/customers/${c.id}`}>
                          <button
                            className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Sửa thông tin khách"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                          title="Xóa khách hàng"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-4 border-t border-border bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">
                Hiển thị <span className="font-bold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span>
                {' '}– <span className="font-bold text-foreground">{Math.min(currentPage * PAGE_SIZE, sortedCustomers.length)}</span>
                {' '}trong tổng số <span className="font-bold text-foreground">{sortedCustomers.length}</span> khách hàng
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-8 px-2.5 cursor-pointer text-xs">Đầu</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="h-8 px-2.5 cursor-pointer text-xs">Trước</Button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                    return (
                      <Button key={pageNum} variant={currentPage === pageNum ? 'primary' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)} className="h-8 w-8 p-0 cursor-pointer text-xs">
                        {pageNum}
                      </Button>
                    );
                  }
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="text-slate-400 px-1 text-xs">...</span>;
                  }
                  return null;
                })}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 px-2.5 cursor-pointer text-xs">Sau</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-8 px-2.5 cursor-pointer text-xs">Cuối</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Add/Edit Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">
                {editId ? 'Chỉnh sửa thông tin Khách hàng' : 'Thêm Khách hàng Mới'}
              </h3>
            </div>
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label="Họ tên khách hàng *"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    label="Số điện thoại *"
                    placeholder="Ví dụ: 0977111222"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label="Link Facebook"
                    placeholder="Ví dụ: https://facebook.com/user"
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                  />
                  <Input
                    label="Số Zalo"
                    placeholder="Ví dụ: 0977111222"
                    value={zalo}
                    onChange={(e) => setZalo(e.target.value)}
                  />
                </div>

                <Input
                  label="Email khách hàng"
                  type="email"
                  placeholder="Vi dụ: customer@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Ghi chú thêm"
                  placeholder="Ghi chú nhanh thông tin khách hàng..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="px-6 py-5 bg-muted/50 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={saving}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  {editId ? 'Lưu thay đổi' : 'Thêm mới'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <Dialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa khách hàng"
        description="Bạn có chắc chắn muốn xóa thông tin khách hàng này khỏi hệ thống? Hành động này chỉ có thể thực hiện nếu khách hàng chưa phát sinh đơn hàng nào."
        confirmText="Xóa thông tin"
        isDanger={true}
        isLoading={deleting}
      />
    </div>
  );
}
