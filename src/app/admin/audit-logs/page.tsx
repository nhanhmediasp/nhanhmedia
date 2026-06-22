'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, showToast, PageHeader, EmptyState, LoadingSkeleton } from '@/components/ui';
import { Search, Calendar, Shield, ArrowLeft, Download, Eye, FileText, Activity, Trash2, AlertCircle } from 'lucide-react';

const parseJson = (str: string | null) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorName: string;
  actorEmail: string | null;
  actorRole: string;
  action: string;
  actionLabel: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  description: string;
  oldValues: string | null;
  newValues: string | null;
  changedFields: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestMethod: string | null;
  requestPath: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  
  // Clear Logs Modal States
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearMode, setClearMode] = useState<'all' | 'olderThan'>('olderThan');
  const [clearDays, setClearDays] = useState('30');
  const [clearing, setClearing] = useState(false);

  // Detail Modal
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/admin/suppliers');
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data.suppliers || []);
        }
      } catch (err) {
        console.error('Fetch suppliers in logs error:', err);
      }
    };
    fetchSuppliers();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', String(page));
      queryParams.append('limit', '20');
      if (searchTerm) queryParams.append('search', searchTerm);
      if (roleFilter) queryParams.append('role', roleFilter);
      if (moduleFilter) queryParams.append('module', moduleFilter);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotal(data.pagination.total || 0);
      } else {
        const data = await res.json();
        showToast(data.error || 'Lỗi tải nhật ký hoạt động.', 'error');
      }
    } catch (e) {
      console.error('Fetch logs error:', e);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, roleFilter, moduleFilter, statusFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setModuleFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    showToast('Đã xóa tất cả bộ lọc', 'info');
  };

  const handleExport = () => {
    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.append('search', searchTerm);
    if (roleFilter) queryParams.append('role', roleFilter);
    if (moduleFilter) queryParams.append('module', moduleFilter);
    if (statusFilter) queryParams.append('status', statusFilter);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);

    window.open(`/api/admin/audit-logs/export?${queryParams.toString()}`, '_blank');
    showToast('Đang tải file CSV...', 'info');
  };

  const handleClearLogs = async () => {
    setClearing(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('mode', clearMode);
      if (clearMode === 'olderThan') {
        queryParams.append('days', clearDays);
      }
      
      const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Đã dọn dẹp nhật ký hoạt động thành công!', 'success');
        setShowClearModal(false);
        setPage(1);
        fetchLogs();
      } else {
        showToast(data.error || 'Lỗi dọn dẹp nhật ký.', 'error');
      }
    } catch (e) {
      console.error('Clear logs error:', e);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN');
    } catch (e) {
      return dateStr;
    }
  };

  // Helper render badges
  const renderRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#a145ab]/10 text-[#a145ab]">Admin</span>;
      case 'collaborator':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-600">CTV</span>;
      case 'agency':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600">Đại lý</span>;
      case 'member':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600">Thành viên</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-500">Khách</span>;
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'success') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">Thành công</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600">Thất bại</span>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Nhật ký hoạt động"
        description="Theo dõi, giám sát toàn bộ hoạt động truy cập và thay đổi cấu hình trên hệ thống."
      >
        <div className="flex gap-2.5 shrink-0">
          <Button variant="outline" onClick={() => setShowClearModal(true)} className="flex items-center gap-2 text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer">
            <Trash2 className="w-4 h-4" />
            <span>Dọn dẹp Nhật ký</span>
          </Button>
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2 cursor-pointer">
            <Download className="w-4 h-4" />
            <span>Xuất Nhật ký CSV</span>
          </Button>
        </div>
      </PageHeader>

      {/* Filter Options */}
      <Card>
        <CardContent className="py-5">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <Search className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm người dùng, email, mô tả..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Tất cả vai trò</option>
                  <option value="admin">Admin</option>
                  <option value="collaborator">Cộng tác viên</option>
                  <option value="agency">Đại lý</option>
                  <option value="member">Thành viên</option>
                  <option value="guest">Khách vãng lai</option>
                </select>
              </div>

              <div>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Tất cả phân hệ</option>
                  <option value="auth">Đăng nhập & Bảo mật</option>
                  <option value="users">Tài khoản & Phân quyền</option>
                  <option value="customers">Quản lý Khách hàng</option>
                  <option value="products">Sản phẩm & Dịch vụ</option>
                  <option value="orders">Quản lý Đơn hàng</option>
                  <option value="settings">Cấu hình hệ thống</option>
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="success">Thành công</option>
                  <option value="failed">Thất bại</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Từ ngày</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Đến ngày</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 cursor-pointer">Lọc kết quả</Button>
                {(searchTerm || roleFilter || moduleFilter || statusFilter || startDate || endDate) && (
                  <Button variant="outline" type="button" onClick={handleClearFilters} className="text-rose-500 border-rose-200 hover:bg-rose-50 cursor-pointer">
                    Xóa lọc
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Log list table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton variant="table" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Không có dữ liệu nhật ký"
                description="Không tìm thấy bản ghi nhật ký hoạt động nào khớp với bộ lọc."
                actionLabel="Xóa bộ lọc"
                onAction={handleClearFilters}
              />
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-[#f5f5f9] text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-4 w-[48px] text-center">STT</th>
                      <th className="px-5 py-4 w-[160px]">Thời gian</th>
                      <th className="px-5 py-4">Người thực hiện</th>
                      <th className="px-5 py-4 w-[100px]">Vai trò</th>
                      <th className="px-5 py-4">Hành động</th>
                      <th className="px-5 py-4 w-[120px]">Phân hệ</th>
                      <th className="px-5 py-4">Mô tả</th>
                      <th className="px-5 py-4 text-center w-[100px]">Trạng thái</th>
                      <th className="px-5 py-4 text-center w-[90px]">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {logs.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-[#f8f7fa] transition-colors duration-150">
                        <td className="px-4 py-3.5 text-center text-xs font-bold text-slate-400">{(page - 1) * 20 + idx + 1}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono">{formatDate(log.createdAt)}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-800">{log.actorName}</div>
                          {log.actorEmail && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.actorEmail}</div>}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{renderRoleBadge(log.actorRole)}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-700 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                            {log.actionLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 capitalize text-slate-500 font-semibold">{log.module}</td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium max-w-[280px] truncate" title={log.description}>
                          {log.description}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">{renderStatusBadge(log.status)}</td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveLog(log)}
                            className="px-2 py-1 h-7 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex justify-between items-center px-6 py-4 border-t border-border bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Hiển thị từ {(page - 1) * 20 + 1} đến {Math.min(page * 20, total)} trên tổng số {total} logs
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    className="cursor-pointer text-xs"
                  >
                    Trước
                  </Button>
                  <span className="px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 rounded-lg">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    className="cursor-pointer text-xs"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log details modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10">
          <div className="w-full max-w-4xl bg-card rounded-2xl border border-border shadow-[0_25px_80px_rgba(0,0,0,0.28)] overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-800">Chi tiết nhật ký hoạt động</h3>
              <button 
                onClick={() => setActiveLog(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Meta statistics in grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-xs border-b border-border/60 pb-5">
                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Người thao tác</span>
                  <div className="font-bold text-slate-800 text-sm">{activeLog.actorName}</div>
                  {activeLog.actorEmail && <span className="font-mono text-slate-500 block mt-0.5">{activeLog.actorEmail}</span>}
                  <div className="mt-1">{renderRoleBadge(activeLog.actorRole)}</div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Thời gian thao tác</span>
                  <div className="font-bold text-slate-700">{formatDate(activeLog.createdAt)}</div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{activeLog.createdAt}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Địa chỉ IP & Method</span>
                  <div className="font-mono text-slate-800">
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold mr-1.5">{activeLog.requestMethod || 'N/A'}</span>
                    {activeLog.ipAddress || 'Không có IP'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Đường dẫn Request</span>
                  <div className="font-mono text-slate-600 break-all select-all bg-slate-50 p-1.5 border border-border/40 rounded-lg">{activeLog.requestPath || 'N/A'}</div>
                </div>

                <div className="md:col-span-2">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Trình duyệt (User Agent)</span>
                  <div className="font-mono text-slate-500 break-all bg-slate-50 p-1.5 border border-border/40 rounded-lg">{activeLog.userAgent || 'N/A'}</div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Hành động & Phân hệ</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">{activeLog.actionLabel}</span>
                    <span className="font-semibold text-slate-400 uppercase tracking-widest text-[10px]">{activeLog.module}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Trạng thái</span>
                  <div className="mt-0.5">{renderStatusBadge(activeLog.status)}</div>
                </div>

                {activeLog.entityName && (
                  <div>
                    <span className="text-slate-400 font-semibold uppercase tracking-wider block mb-1">Đối tượng tác động</span>
                    <div className="font-bold text-slate-800">{activeLog.entityName}</div>
                    {activeLog.entityType && <span className="text-[10px] text-slate-400">Loại: {activeLog.entityType} ({activeLog.entityId})</span>}
                  </div>
                )}

                <div className="md:col-span-2 bg-purple-500/5 border border-purple-500/10 rounded-xl p-3.5">
                  <span className="text-purple-600 font-semibold uppercase tracking-wider block mb-1 text-[10px]">Mô tả hành động</span>
                  <p className="text-slate-700 font-semibold text-sm leading-relaxed">{activeLog.description}</p>
                </div>

                {activeLog.errorMessage && (
                  <div className="md:col-span-2 bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-700">
                    <span className="font-semibold uppercase tracking-wider block mb-1 text-[10px]">Lỗi hệ thống ghi nhận</span>
                    <p className="font-mono text-xs break-all">{activeLog.errorMessage}</p>
                  </div>
                )}
              </div>

              {/* Old vs New values Comparison */}
              <div>
                <h4 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>So sánh thay đổi dữ liệu</span>
                </h4>
                <LogDataDiff
                  oldStr={activeLog.oldValues}
                  newStr={activeLog.newValues}
                  changedFieldsStr={activeLog.changedFields}
                  suppliers={suppliers}
                />
              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setActiveLog(null)} className="cursor-pointer">
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Logs Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-[0_25px_80px_rgba(0,0,0,0.28)] overflow-hidden animate-scale-in flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-rose-600 flex items-center gap-1.5">
                <Trash2 className="w-5 h-5 text-rose-500" />
                <span>Dọn dẹp nhật ký hoạt động</span>
              </h3>
              <button 
                onClick={() => setShowClearModal(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Hành động dọn dẹp sẽ xóa vĩnh viễn dữ liệu nhật ký hoạt động cũ của hệ thống. Bạn có muốn dọn dẹp các bản ghi này không?
              </p>
              
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Phương thức dọn dẹp</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setClearMode('olderThan')}
                    className={`p-3.5 rounded-xl border text-center cursor-pointer select-none transition-all duration-200 ${
                      clearMode === 'olderThan'
                        ? 'border-[#a145ab] bg-[#a145ab]/5 text-[#a145ab] font-bold shadow-sm'
                        : 'border-border bg-card text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm">Xóa nhật ký cũ</div>
                  </div>
                  <div
                    onClick={() => setClearMode('all')}
                    className={`p-3.5 rounded-xl border text-center cursor-pointer select-none transition-all duration-200 ${
                      clearMode === 'all'
                        ? 'border-rose-500 bg-rose-500/5 text-rose-600 font-bold shadow-sm'
                        : 'border-border bg-card text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm">Xóa tất cả</div>
                  </div>
                </div>
              </div>

              {clearMode === 'olderThan' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Mốc thời gian xóa</label>
                  <select
                    value={clearDays}
                    onChange={(e) => setClearDays(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer font-semibold text-slate-700"
                  >
                    <option value="7">Cũ hơn 7 ngày trước</option>
                    <option value="30">Cũ hơn 30 ngày trước (Mặc định)</option>
                    <option value="90">Cũ hơn 90 ngày trước</option>
                    <option value="180">Cũ hơn 180 ngày trước</option>
                  </select>
                </div>
              )}

              {clearMode === 'all' && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 flex gap-2 items-start">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold leading-relaxed">
                    Cảnh báo: Hành động này sẽ xóa sạch 100% dữ liệu nhật ký hoạt động hệ thống. Sau khi xóa, chỉ còn lại duy nhất 1 bản ghi lưu vết hành động dọn dẹp này.
                  </span>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={() => setShowClearModal(false)} className="cursor-pointer">
                Hủy bỏ
              </Button>
              <Button 
                variant={clearMode === 'all' ? 'danger' : 'primary'} 
                size="sm" 
                onClick={handleClearLogs} 
                loading={clearing}
                className="cursor-pointer font-bold"
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Side-by-side properties comparison component
function LogDataDiff({ 
  oldStr, 
  newStr, 
  changedFieldsStr, 
  suppliers 
}: { 
  oldStr: string | null; 
  newStr: string | null; 
  changedFieldsStr: string | null; 
  suppliers: { id: string; name: string }[];
}) {
  const oldVal = parseJson(oldStr);
  const newVal = parseJson(newStr);
  const changedFields = parseJson(changedFieldsStr) || [];

  if (!oldVal && !newVal) {
    return <p className="text-xs text-muted-foreground italic bg-slate-50 py-4 text-center rounded-xl border border-border/40">Không ghi nhận thay đổi dữ liệu chi tiết cho hành động này.</p>;
  }

  // Gather all unique keys from both objects
  const keys = Array.from(new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal || {})]))
    .filter(k => k !== 'updatedAt' && k !== 'updated_at');

  const translateKey = (k: string) => {
    const mapping: Record<string, string> = {
      status: 'Trạng thái',
      price: 'Đơn giá',
      customPrice: 'Giá tùy chỉnh',
      importPrice: 'Giá nhập',
      amountPaid: 'Đã thanh toán',
      note: 'Ghi chú',
      internalNote: 'Ghi chú nội bộ',
      startDate: 'Ngày bắt đầu',
      endDate: 'Ngày hết hạn',
      supplierId: 'Nguồn hàng',
      productId: 'Sản phẩm',
      variantId: 'Gói dịch vụ',
      customerId: 'Khách hàng',
      createdByUserId: 'Người tạo',
    };
    return mapping[k] || k;
  };

  const formatVal = (key: string, v: any): string => {
    if (v === undefined || v === null) return 'Trống';
    if (typeof v === 'boolean') return v ? 'Bật' : 'Tắt';
    if (key === 'status') {
      const statusMap: Record<string, string> = {
        new: 'Mới tạo',
        processing: 'Đang xử lý',
        running: 'Đang chạy',
        expired_soon: 'Sắp hết hạn',
        expired: 'Đã hết hạn',
        cancelled: 'Đã hủy',
        refunded: 'Đã bảo hành / Hoàn tiền',
      };
      return statusMap[String(v).toLowerCase()] || String(v);
    }
    if (key === 'supplierId') {
      const found = suppliers.find(s => s.id === v);
      return found ? found.name : String(v);
    }
    if (key.toLowerCase().includes('price') || key === 'amountPaid') {
      try {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));
      } catch {
        return String(v);
      }
    }
    if (key.toLowerCase().includes('date')) {
      try {
        return new Date(v).toLocaleDateString('vi-VN');
      } catch {
        return String(v);
      }
    }
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden text-xs">
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="bg-slate-50 border-b border-border/60 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <th className="px-4 py-2.5 w-1/4">Trường</th>
            <th className="px-4 py-2.5 w-3/8">Giá trị trước</th>
            <th className="px-4 py-2.5 w-3/8">Giá trị sau</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-mono">
          {keys.map((key) => {
            const isChanged = changedFields.includes(key) || (!oldVal && newVal) || (oldVal && !newVal);
            const valBefore = oldVal ? oldVal[key] : undefined;
            const valAfter = newVal ? newVal[key] : undefined;

            return (
              <tr 
                key={key} 
                className={`transition-colors duration-150 ${isChanged ? 'bg-amber-50/10' : 'hover:bg-slate-50/10'}`}
              >
                <td className="px-4 py-3 font-semibold text-slate-700 truncate">{translateKey(key)}</td>
                <td className={`px-4 py-3 select-all whitespace-pre-wrap break-all ${isChanged && valBefore !== undefined ? 'bg-rose-50 text-rose-700 font-medium' : 'text-slate-400'}`}>
                  {formatVal(key, valBefore)}
                </td>
                <td className={`px-4 py-3 select-all whitespace-pre-wrap break-all ${isChanged && valAfter !== undefined ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600'}`}>
                  {formatVal(key, valAfter)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
