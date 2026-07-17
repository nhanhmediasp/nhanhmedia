'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Input, Select, Card, CardContent, Badge, showToast, Dialog, PageHeader, RoleBadge, EmptyState, LoadingSkeleton } from '@/components/ui';
import { Search, Plus, Edit2, Trash2, UserCheck, ShieldAlert, DollarSign, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Eye, Mail } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  note: string | null;
  createdAt: string;
  orderCount: number;
  totalSales: number;
  avatarUrl?: string | null;
}

type SortField = 'name' | 'orderCount' | 'totalSales';
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

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Sort state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal form states
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userRole, setUserRole] = useState('collaborator');
  const [status, setStatus] = useState('active');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete states
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Email states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTargetUser, setEmailTargetUser] = useState<UserItem | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isResetPasswordMail, setIsResetPasswordMail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleOpenEmailModal = (u: UserItem) => {
    setEmailTargetUser(u);
    setEmailSubject('Thông báo từ Ban quản trị Nhanh Media');
    setEmailMessage('');
    setIsResetPasswordMail(false);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTargetUser) return;
    if (!isResetPasswordMail && !emailMessage.trim()) {
      showToast('Vui lòng nhập nội dung email.', 'error');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch(`/api/admin/users/${emailTargetUser.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: emailSubject,
          message: emailMessage,
          isResetPassword: isResetPasswordMail
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Gửi email thành công!', 'success');
        setIsEmailModalOpen(false);
      } else {
        showToast(data.error || 'Gửi email thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        showToast('Không thể tải danh sách tài khoản.', 'error');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setEditId(null);
    setName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setUserRole('member');
    setStatus('active');
    setNote('');
    setIsOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setEditId(u.id);
    setName(u.name);
    setEmail(u.email.includes('staff_') && u.email.includes('@nhanhmedia.com') ? '' : u.email);
    setPassword('');
    setPhone(u.phone || '');
    setUserRole(u.role);
    setStatus(u.status);
    setNote(u.note || '');
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !userRole) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editId ? `/api/admin/users/${editId}` : '/api/admin/users';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, userRole, status, note }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || 'Lưu nhân sự thành công!', 'success');
        setIsOpen(false);
        fetchUsers();
      } else {
        showToast(data.error || 'Lỗi khi lưu nhân sự.', 'error');
      }
    } catch (error) {
      console.error('Save user error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Xóa tài khoản thành công!', 'success');
        setUsers(users.filter((u) => u.id !== deleteId));
      } else {
        showToast(data.error || 'Lỗi khi xóa tài khoản.', 'error');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getStatusBadge = (st: string) => {
    switch (st.toLowerCase()) {
      case 'active': return <Badge variant="success">Hoạt động</Badge>;
      case 'inactive': return <Badge variant="secondary">Ngưng hoạt động</Badge>;
      case 'locked': return <Badge variant="danger">Bị khóa</Badge>;
      default: return <Badge variant="secondary">{st}</Badge>;
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));

    const matchesRole = roleFilter === '' || u.role === roleFilter;
    const matchesStatus = statusFilter === '' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name': return a.name.localeCompare(b.name) * dir;
      case 'orderCount': return (a.orderCount - b.orderCount) * dir;
      case 'totalSales': return (a.totalSales - b.totalSales) * dir;
      default: return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Nhân sự 👥"
        description="Quản lý thông tin Nhân sự của Nhanh Media. Thêm mới nhân sự để gán vào các dự án."
      >
        <Button onClick={openAddModal} className="flex items-center gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Thêm nhân sự</span>
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
                placeholder="Tìm kiếm tài khoản theo tên, email, hoặc số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-all duration-200"
              />
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Tất cả vai trò</option>
                <option value="admin">Quản trị viên (Admin)</option>
                <option value="collaborator">Cộng tác viên (CTV)</option>
                <option value="agency">Đại lý (Agency)</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Ngưng hoạt động</option>
                <option value="locked">Bị khóa</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User listing */}
      {loading ? (
        <LoadingSkeleton variant="table" />
      ) : sortedUsers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy tài khoản nào"
          description="Chưa có tài khoản nào được tạo hoặc từ khóa tìm kiếm không khớp."
          actionLabel="Thêm tài khoản"
          onAction={openAddModal}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="px-4 py-5 w-[48px] text-center">STT</th>
                  <SortableHeader label="Nhân sự" field="name" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <th className="px-6 py-5">Số điện thoại</th>
                  <th className="px-6 py-5 text-center">Vai trò</th>
                  <th className="px-6 py-5 text-center">Trạng thái</th>
                  <SortableHeader label="Số đơn" field="orderCount" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-center" />
                  <SortableHeader label="Tổng doanh thu" field="totalSales" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right" />
                  <th className="px-6 py-5 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {sortedUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-5 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 select-none border border-slate-200"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 select-none"
                            style={{ background: 'linear-gradient(135deg,#c060c8 0%,#a145ab 100%)' }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
                        </div>
                      </div>
                      {u.note && (
                        <div className="text-[10px] text-amber-500 font-semibold mt-2 pl-11">Ghi chú: {u.note}</div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-muted-foreground">{u.phone || '-'}</td>
                    <td className="px-6 py-5 text-center">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-5 text-center">{getStatusBadge(u.status)}</td>
                    <td className="px-6 py-5 text-center font-bold text-foreground">{u.orderCount}</td>
                    <td className="px-6 py-5 text-right font-bold text-primary">{formatVND(u.totalSales)}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/admin/users/${u.id}`}>
                          <button
                            className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Sửa nhân sự"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => setDeleteId(u.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                            title="Xóa nhân sự"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit User Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.28)] overflow-hidden animate-fade-in">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground">
                {editId ? 'Chỉnh sửa thông tin Nhân sự' : 'Thêm mới Nhân sự'}
              </h3>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                <Input
                  label="Họ tên nhân sự *"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                
                <Input
                  label="Email liên hệ (Không bắt buộc)"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Input
                  label="Số điện thoại"
                  placeholder="Ví dụ: 0977111222"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-5">
                  <Select
                    label="Vai trò nhân sự *"
                    options={[
                      { value: 'member', label: 'Nhân viên (Member)' },
                      { value: 'collaborator', label: 'Cộng tác viên (CTV)' },
                      { value: 'agency', label: 'Đại lý / Đối tác' },
                      { value: 'admin', label: 'Quản trị viên (Admin)' },
                    ]}
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    disabled={editId === currentUser?.id}
                  />

                  <Select
                    label="Trạng thái làm việc *"
                    options={[
                      { value: 'active', label: 'Hoạt động (Active)' },
                      { value: 'inactive', label: 'Ngưng (Inactive)' },
                      { value: 'locked', label: 'Tạm khóa (Locked)' },
                    ]}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={editId === currentUser?.id}
                  />
                </div>

                <Input
                  label="Ghi chú (Kỹ năng, mô tả...)"
                  placeholder="Ví dụ: Designer Figma, Lập trình React..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="px-6 py-5 bg-muted/50 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={saving}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  {editId ? 'Lưu thay đổi' : 'Thêm nhân sự'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa tài khoản"
        description="Bạn có chắc chắn muốn xóa tài khoản này? Hành động này chỉ thực hiện được nếu tài khoản chưa từng phát sinh đơn hàng hoặc thêm khách hàng nào trong hệ thống."
        confirmText="Xóa tài khoản"
        isDanger={true}
        isLoading={deleting}
      />

      {/* Send Email Modal */}
      {isEmailModalOpen && emailTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 animate-fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.28)] overflow-hidden animate-fade-in">
            <div className="px-6 py-5 border-b border-border flex justify-between items-center">
              <h3 className="text-base font-bold text-foreground">
                Gửi Email tới: {emailTargetUser.name}
              </h3>
            </div>
            
            <form onSubmit={handleSendEmail}>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2 bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-border">
                  <input
                    type="checkbox"
                    id="isResetPasswordMail"
                    checked={isResetPasswordMail}
                    onChange={(e) => setIsResetPasswordMail(e.target.checked)}
                    className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="isResetPasswordMail" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer">
                    Gửi liên kết đặt lại mật khẩu nhanh
                  </label>
                </div>

                {!isResetPasswordMail && (
                  <>
                    <Input
                      label="Tiêu đề Email *"
                      placeholder="Nhập tiêu đề email..."
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      required
                    />
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Nội dung Email *
                      </label>
                      <textarea
                        rows={6}
                        placeholder="Nhập nội dung thư gửi..."
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </>
                )}

                {isResetPasswordMail && (
                  <p className="text-xs text-amber-500 leading-normal bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                    Hệ thống sẽ tự động sinh mã Token đặt lại mật khẩu bảo mật (hết hạn trong 15 phút) và gửi email trực tiếp cho CTV {emailTargetUser.email}.
                  </p>
                )}
              </div>

              <div className="px-6 py-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEmailModalOpen(false)} disabled={sendingEmail}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={sendingEmail}>
                  Gửi Email ngay
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
