'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Input, Textarea, Select, Badge, showToast, Dialog, PageHeader, EmptyState, LoadingSkeleton } from '@/components/ui';
import { Bell, Plus, Trash2, Users, Clock, Send } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  content: string;
  targetRole: string;
  createdByUser: { id: string; name: string };
  createdAt: string;
  _count: { reads: number };
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        showToast('Không thể tải danh sách thông báo.', 'error');
      }
    } catch (error) {
      console.error('Fetch notifications error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      showToast('Vui lòng nhập tiêu đề và nội dung thông báo.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, targetRole }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Gửi thông báo thành công!', 'success');
        setIsOpen(false);
        setTitle('');
        setContent('');
        setTargetRole('all');
        fetchNotifications();
      } else {
        showToast(data.error || 'Lỗi tạo thông báo.', 'error');
      }
    } catch (error) {
      console.error('Create notification error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/notifications/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Xóa thông báo thành công!', 'success');
        setNotifications(notifications.filter((n) => n.id !== deleteId));
      } else {
        showToast(data.error || 'Lỗi xóa thông báo.', 'error');
      }
    } catch (error) {
      console.error('Delete notification error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'all': return 'Tất cả';
      case 'member': return 'Thành viên';
      case 'collaborator': return 'Cộng tác viên';
      case 'agency': return 'Đại lý';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string): 'primary' | 'info' | 'success' | 'warning' => {
    switch (role) {
      case 'all': return 'primary';
      case 'member': return 'info';
      case 'collaborator': return 'success';
      case 'agency': return 'warning';
      default: return 'primary';
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} ngày trước`;
    return formatDateTime(dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Thông báo"
        description="Tạo và gửi thông báo đến các thành viên theo cấp bậc vai trò."
      >
        <Button onClick={() => setIsOpen(true)} className="flex items-center gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Tạo thông báo</span>
        </Button>
      </PageHeader>

      {/* Notifications List */}
      {loading ? (
        <LoadingSkeleton variant="card" />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="Chưa có thông báo nào"
          description="Bạn chưa tạo thông báo nào cho các thành viên trong hệ thống."
          actionLabel="Tạo thông báo"
          onAction={() => setIsOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notifications.map((n) => (
            <Card key={n.id} className="hover:border-primary/20 transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg,#f3d0f7 0%,#e9b6f0 100%)' }}
                      >
                        <Bell className="w-4 h-4 text-[#a145ab]" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">{n.title}</h3>
                      <Badge variant={getRoleBadgeVariant(n.targetRole)}>
                        <Users className="w-3 h-3 mr-1" />
                        {getRoleLabel(n.targetRole)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-10">{n.content}</p>
                    <div className="flex items-center gap-4 pl-10 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(n.createdAt)}
                      </span>
                      <span>•</span>
                      <span>Người gửi: <strong className="text-foreground">{n.createdByUser.name}</strong></span>
                      <span>•</span>
                      <span>Đã đọc: <strong className="text-foreground">{n._count.reads}</strong> người</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteId(n.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0"
                    title="Xóa thông báo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Notification Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="px-6 py-5 border-b border-border flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#f3d0f7 0%,#e9b6f0 100%)' }}
              >
                <Send className="w-4 h-4 text-[#a145ab]" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Gửi Thông báo Mới</h3>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-6 space-y-5">
                <Input
                  label="Tiêu đề thông báo *"
                  placeholder="Ví dụ: Thông báo bảo trì hệ thống"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />

                <Textarea
                  label="Nội dung thông báo *"
                  placeholder="Nhập nội dung chi tiết cho thông báo..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />

                <Select
                  label="Gửi đến đối tượng"
                  options={[
                    { value: 'all', label: '🔔 Tất cả thành viên' },
                    { value: 'member', label: '👤 Thành viên (Member)' },
                    { value: 'collaborator', label: '🤝 Cộng tác viên (CTV)' },
                    { value: 'agency', label: '🏢 Đại lý (Agency)' },
                  ]}
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>

              <div className="px-6 py-5 bg-muted/50 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={saving}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={saving}>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Gửi thông báo
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
        title="Xác nhận xóa thông báo"
        description="Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác."
        confirmText="Xóa thông báo"
        isDanger={true}
        isLoading={deleting}
      />
    </div>
  );
}
