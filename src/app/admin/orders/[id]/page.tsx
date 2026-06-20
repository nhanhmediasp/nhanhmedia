'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, showToast, Dialog, Input, Select } from '@/components/ui';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Package,
  Layers,
  FileText,
  Mail,
  History,
  Send,
  Loader2,
  Trash2,
  Undo2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { SupplierAvatar } from '@/components/SupplierAvatar';

interface Customer {
  id: string;
  name: string;
  phone: string;
  facebook: string | null;
  zalo: string | null;
  email: string | null;
}

interface Product {
  id: string;
  name: string;
  variants: { id: string; name: string }[];
}

interface Variant {
  id: string;
  name: string;
  durationValue: number;
  durationUnit: string;
}

interface UserSession {
  id: string;
  name: string;
  role: string;
}

interface Renewal {
  id: string;
  oldEndDate: string;
  newEndDate: string;
  price: number;
  createdAt: string;
  renewedByUser: { name: string };
  variant: { name: string };
}

interface EmailLog {
  id: string;
  emailTo: string;
  subject: string;
  status: string;
  sentAt: string;
  errorMessage: string | null;
}

interface Order {
  id: string;
  orderCode: string;
  customerId: string;
  customer: Customer;
  createdByUserId: string;
  createdByUser: UserSession;
  productId: string;
  product: Product;
  variantId: string;
  variant: Variant;
  price: number;
  customPrice: number | null;
  importPrice: number | null;
  status: string;
  startDate: string;
  endDate: string;
  note: string | null;
  internalNote: string | null;
  createdAt: string;
  refundAmount: number | null;
  refundedAt: string | null;
  supplierId?: string | null;
  supplier?: { id: string; name: string; contactUrl: string | null; icon?: string | null } | null;
  renewals: Renewal[];
  emailLogs: EmailLog[];
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Status editing
  const [status, setStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Supplier editing
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; contactUrl: string | null; icon?: string | null }[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [updatingSupplier, setUpdatingSupplier] = useState(false);

  // Renewal Modal State
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewVariantId, setRenewVariantId] = useState('');
  const [startDateOption, setStartDateOption] = useState('old_end_date');
  const [renewCustomPrice, setRenewCustomPrice] = useState('');
  const [renewing, setRenewing] = useState(false);

  // Email manual state
  const [sendingEmail, setSendingEmail] = useState(false);

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Import Price editing
  const [isEditingImportPrice, setIsEditingImportPrice] = useState(false);
  const [importPriceInput, setImportPriceInput] = useState('');
  const [savingImportPrice, setSavingImportPrice] = useState(false);

  // Refund/Warranty State
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const handleRefund = async () => {
    setRefunding(true);
    try {
      const res = await fetch(`/api/orders/${id}/refund`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Xử lý bảo hành / hoàn tiền thành công!', 'success');
        setIsRefundOpen(false);
        fetchOrderDetail();
      } else {
        showToast(data.error || 'Xử lý hoàn tiền thất bại.', 'error');
      }
    } catch (error) {
      console.error('Refund error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setRefunding(false);
    }
  };

  const calculateRefundDetails = (orderItem: Order) => {
    const start = new Date(orderItem.startDate).getTime();
    const end = new Date(orderItem.endDate).getTime();
    const now = new Date().getTime();
    
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const orderPrice = orderItem.customPrice !== null ? orderItem.customPrice : orderItem.price;
    const pricePerDay = orderPrice / totalDays;
    
    let remainingDays = 0;
    if (now < start) {
      remainingDays = totalDays;
    } else if (now > end) {
      remainingDays = 0;
    } else {
      remainingDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
    }
    
    const refundAmount = Math.max(0, Math.round(remainingDays * pricePerDay));
    return {
      totalDays,
      remainingDays,
      pricePerDay,
      refundAmount,
    };
  };

  const fetchOrderDetail = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setStatus(data.order.status);
        setSupplierId(data.order.supplierId || '');
        if (data.order.product?.variants?.length > 0) {
          setRenewVariantId(data.order.variantId);
        }
      } else {
        showToast('Không thể tải chi tiết đơn hàng.', 'error');
        router.push('/admin/orders');
      }
    } catch (error) {
      console.error('Fetch order detail error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImportPrice = async () => {
    setSavingImportPrice(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importPrice: importPriceInput === '' ? null : importPriceInput }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Đã cập nhật giá nhập gốc!', 'success');
        setOrder(data.order);
        setIsEditingImportPrice(false);
      } else {
        showToast(data.error || 'Cập nhật thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSavingImportPrice(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/admin/suppliers');
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error('Fetch suppliers error:', error);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
    fetchSuppliers();
  }, [id]);

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cập nhật trạng thái đơn hàng thành công!', 'success');
        setOrder(data.order);
        setStatus(newStatus);
      } else {
        showToast(data.error || 'Cập nhật thất bại.', 'error');
      }
    } catch (error) {
      console.error('Update status error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateSupplier = async (newSupplierId: string) => {
    setUpdatingSupplier(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: newSupplierId || '' }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cập nhật nguồn hàng thành công!', 'success');
        setOrder(data.order);
        setSupplierId(newSupplierId);
      } else {
        showToast(data.error || 'Cập nhật thất bại.', 'error');
      }
    } catch (error) {
      console.error('Update supplier error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setUpdatingSupplier(false);
    }
  };

  const handleSendReminderManual = async () => {
    if (!order?.customer.email) {
      showToast('Khách hàng này chưa cấu hình email!', 'error');
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/orders/${id}/remind-manual`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Gửi mail nhắc nhở thành công!', 'success');
        fetchOrderDetail(); // Refresh list to get new logs
      } else {
        showToast(data.error || 'Gửi email thất bại.', 'error');
      }
    } catch (error) {
      console.error('Manual email error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewVariantId) return;

    setRenewing(true);
    try {
      const res = await fetch(`/api/orders/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: renewVariantId,
          startDateOption,
          customPrice: renewCustomPrice ? parseFloat(renewCustomPrice) : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Gia hạn dịch vụ thành công!', 'success');
        setIsRenewOpen(false);
        setRenewCustomPrice('');
        fetchOrderDetail(); // Refresh detail to show new end date and renewals log
      } else {
        showToast(data.error || 'Gia hạn thất bại.', 'error');
      }
    } catch (error) {
      console.error('Renew error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setRenewing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast('Đã xóa đơn hàng thành công!', 'success');
        router.push('/admin/orders');
      } else {
        showToast(data.error || 'Xóa đơn hàng thất bại.', 'error');
      }
    } catch (error) {
      console.error('Delete order error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return <Badge variant="secondary">Mới tạo</Badge>;
      case 'processing': return <Badge variant="info">Đang xử lý</Badge>;
      case 'running': return <Badge variant="success">Đang chạy</Badge>;
      case 'expired_soon': return <Badge variant="warning">Sắp hết hạn</Badge>;
      case 'expired': return <Badge variant="danger">Đã hết hạn</Badge>;
      case 'cancelled': return <Badge variant="secondary" className="opacity-55">Đã hủy</Badge>;
      case 'refunded': return <Badge variant="warning">Đã bảo hành (Hoàn tiền)</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Đang tải chi tiết đơn hàng...</p>
      </div>
    );
  }

  if (!order) return null;

  const currentPrice = order.customPrice !== null ? order.customPrice : order.price;
  const refundDetails = calculateRefundDetails(order);
  const productVariantsOptions = (order.product?.variants ?? []).map((v) => ({
    value: v.id,
    label: v.name,
  }));

  const orderStatusesOptions = [
    { value: 'new', label: 'Mới tạo' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'running', label: 'Đang chạy' },
    { value: 'expired_soon', label: 'Sắp hết hạn' },
    { value: 'expired', label: 'Đã hết hạn' },
    { value: 'cancelled', label: 'Đã hủy' },
    { value: 'refunded', label: 'Đã hoàn tiền (Bảo hành)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <button className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chi tiết Đơn hàng {order.orderCode}</h1>
            <p className="text-sm text-muted-foreground">Theo dõi cấu hình, lịch sử và nhật ký email.</p>
          </div>
        </div>
        
        {/* Quick actions for admin */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button variant="outline" size="sm" onClick={() => setIsRenewOpen(true)} className="flex items-center gap-1.5 cursor-pointer">
            <History className="w-4 h-4" />
            <span>Gia hạn gói</span>
          </Button>
          {order.customer.email && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendReminderManual}
              loading={sendingEmail}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Gửi mail nhắc</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Left cols (2/3): Service Details & Log History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <span>Chi tiết dịch vụ đăng ký</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tên Dịch vụ:</span>
                  <div className="font-bold text-foreground text-base">{order.product.name}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gói chu kỳ:</span>
                  <div className="font-bold text-foreground text-base">{order.variant.name}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày Bắt đầu:</span>
                  <div className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                    <Calendar className="w-4.5 h-4.5 text-slate-400" />
                    <span>{formatDate(order.startDate)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày Hết hạn:</span>
                  <div className="font-extrabold text-rose-500 flex items-center gap-1.5 text-sm">
                    <Calendar className="w-4.5 h-4.5" />
                    <span>{formatDate(order.endDate)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Người tạo đơn:</span>
                  <div className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                    <span>{order.createdByUser.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">({order.createdByUser.role})</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ngày tạo đơn:</span>
                  <div className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                {order.note && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Ghi chú đơn hàng:</span>
                    <p className="text-sm bg-muted/40 p-3 rounded-lg text-foreground">{order.note}</p>
                  </div>
                )}
                {order.internalNote && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-amber-500 uppercase">Ghi chú nội bộ (Chỉ Admin):</span>
                    <p className="text-sm bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg text-foreground">
                      {order.internalNote}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Renewals History */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <span>Lịch sử gia hạn dịch vụ ({order.renewals.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.renewals.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">Đơn hàng này chưa từng thực hiện gia hạn.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="py-3 pr-4">Ngày gia hạn</th>
                        <th className="py-3 px-4">Gói dịch vụ</th>
                        <th className="py-3 px-4">Ngày hết hạn cũ</th>
                        <th className="py-3 px-4">Ngày hết hạn mới</th>
                        <th className="py-3 px-4 text-right">Chi phí</th>
                        <th className="py-3 pl-4">Người thực hiện</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {order.renewals.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/10">
                          <td className="py-3 pr-4 font-medium">{formatDate(r.createdAt)}</td>
                          <td className="py-3 px-4 font-bold text-foreground">{r.variant.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(r.oldEndDate)}</td>
                          <td className="py-3 px-4 font-bold text-rose-500">{formatDate(r.newEndDate)}</td>
                          <td className="py-3 px-4 text-right font-bold text-primary">{formatVND(r.price)}</td>
                          <td className="py-3 pl-4">{r.renewedByUser.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Logs */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <span>Nhật ký gửi email nhắc nhở ({order.emailLogs.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.emailLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">Chưa phát sinh gửi email nhắc hạn.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="py-3 pr-4">Thời điểm gửi</th>
                        <th className="py-3 px-4">Gửi tới email</th>
                        <th className="py-3 px-4">Tiêu đề thư</th>
                        <th className="py-3 px-4 text-center">Trạng thái</th>
                        <th className="py-3 pl-4">Thông báo lỗi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {order.emailLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/10">
                          <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(log.sentAt)}</td>
                          <td className="py-3 px-4 font-semibold">{log.emailTo}</td>
                          <td className="py-3 px-4 truncate max-w-[200px]" title={log.subject}>
                            {log.subject}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {log.status === 'success' ? (
                              <Badge variant="success">Thành công</Badge>
                            ) : (
                              <Badge variant="danger">Lỗi</Badge>
                            )}
                          </td>
                          <td className="py-3 pl-4 text-rose-500 font-medium truncate max-w-[150px]" title={log.errorMessage || ''}>
                            {log.errorMessage || '-'}
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

        {/* Right col (1/3): Customer Profile and Billing/Status Settings */}
        <div className="space-y-6">
          {/* Customer Profile Info */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span>Hồ sơ khách hàng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Họ tên:</span>
                <div className="font-bold text-foreground">{order.customer.name}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Số điện thoại:</span>
                <div className="font-bold text-foreground text-sm">{order.customer.phone}</div>
              </div>
              
              <div className="flex flex-col gap-2 pt-2 text-xs border-t border-border">
                {order.customer.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Email:</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]" title={order.customer.email}>
                      {order.customer.email}
                    </span>
                  </div>
                )}
                {order.customer.zalo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Zalo:</span>
                    <a href={`https://zalo.me/${order.customer.zalo}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">
                      {order.customer.zalo}
                    </a>
                  </div>
                )}
                {order.customer.facebook && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Facebook:</span>
                    <a href={order.customer.facebook} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold truncate max-w-[120px]">
                      Xem profile
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing & Status Management */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span>Trạng thái & Hóa đơn</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Tổng tiền thanh toán:</span>
                <div className="text-xl font-extrabold text-primary">{formatVND(currentPrice)}</div>
                {order.customPrice !== null && (
                  <div className="text-[10px] text-amber-500 font-bold">Giá điều chỉnh thủ công bởi Admin</div>
                )}
              </div>

              <div className="space-y-1 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Giá nhập gốc:</span>
                  {!isEditingImportPrice ? (
                    <button
                      type="button"
                      onClick={() => { setImportPriceInput(String(order.importPrice ?? '')); setIsEditingImportPrice(true); }}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      title="Sửa giá nhập gốc"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleSaveImportPrice}
                        disabled={savingImportPrice}
                        className="p-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors cursor-pointer"
                        title="Lưu"
                      >
                        {savingImportPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingImportPrice(false)}
                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                        title="Hủy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {isEditingImportPrice ? (
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={importPriceInput}
                    onChange={e => setImportPriceInput(e.target.value)}
                    placeholder="Nhập giá nhập gốc (VND)..."
                    autoFocus
                    className="w-full px-3 py-2 text-sm rounded-xl border focus:outline-none transition-all"
                    style={{ border: '1.5px solid rgba(161,69,171,0.35)', background: '#fdf4ff', color: '#1e293b' }}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveImportPrice(); if (e.key === 'Escape') setIsEditingImportPrice(false); }}
                  />
                ) : (
                  <div className="text-md font-bold text-rose-500">{formatVND(order.importPrice || 0)}</div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="text-xs font-semibold text-muted-foreground uppercase block">Nguồn hàng (Tag):</span>
                {order.supplier ? (
                  <div className="mb-2 flex items-center gap-2">
                    <SupplierAvatar iconName={order.supplier.icon} size="sm" />
                    {order.supplier.contactUrl ? (
                      <a
                        href={order.supplier.contactUrl.startsWith('http') ? order.supplier.contactUrl : `https://${order.supplier.contactUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-bold bg-primary/10 px-2.5 py-1 rounded-xl transition-all duration-150"
                      >
                        {order.supplier.name}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl font-bold">
                        {order.supplier.name}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic mb-2">Chưa chọn nguồn hàng</div>
                )}
                
                <Select
                  label="Thay đổi nguồn hàng"
                  options={[
                    { value: '', label: '-- Không chọn --' },
                    ...suppliers.map(s => ({ value: s.id, label: s.name }))
                  ]}
                  value={supplierId}
                  onChange={(e) => handleUpdateSupplier(e.target.value)}
                  disabled={updatingSupplier}
                />
              </div>

              <div className="pt-4 border-t border-border space-y-3.5">
                <Select
                  label="Trạng thái dịch vụ"
                  options={orderStatusesOptions}
                  value={status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  disabled={updatingStatus}
                />

                {order.status === 'refunded' ? (
                  <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center font-bold text-amber-600">
                      <span>Bảo hành hoàn tiền:</span>
                      <span>Đã hoàn tất</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">Số tiền đã hoàn:</span>
                      <span className="font-extrabold text-foreground">{formatVND(order.refundAmount || 0)}</span>
                    </div>
                    {order.refundedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">Thời điểm hoàn:</span>
                        <span className="font-semibold text-foreground">{formatDateTime(order.refundedAt)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 dark:bg-zinc-800/40 border border-border p-3.5 rounded-xl space-y-2">
                      <div className="flex justify-between font-medium text-slate-550">
                        <span>Giá / 1 ngày:</span>
                        <span className="font-bold text-foreground">{formatVND(refundDetails.pricePerDay)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-slate-550">
                        <span>Thời gian còn lại:</span>
                        <span className="font-bold text-foreground">{refundDetails.remainingDays} / {refundDetails.totalDays} ngày</span>
                      </div>
                      <div className="flex justify-between font-medium text-slate-550 pt-1 border-t border-border/40">
                        <span>Hoàn tiền bảo hành:</span>
                        <span className="font-black text-rose-500">{formatVND(refundDetails.refundAmount)}</span>
                      </div>
                    </div>

                    {refundDetails.remainingDays > 0 && order.status !== 'cancelled' && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center justify-center gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold cursor-pointer"
                        onClick={() => setIsRefundOpen(true)}
                      >
                        <Undo2 className="w-4 h-4" />
                        <span>Thực hiện Bảo hành (Hoàn tiền)</span>
                      </Button>
                    )}
                  </div>
                )}
                

              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Renewal Dialog Modal */}
      {isRenewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in">
            <div className="px-6 py-5 border-b border-border">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <span>Gia hạn dịch vụ</span>
              </h3>
            </div>
            
            <form onSubmit={handleRenew}>
              <div className="p-6 space-y-4">
                <Select
                  label="Chọn gói đăng ký gia hạn"
                  options={productVariantsOptions}
                  value={renewVariantId}
                  onChange={(e) => setRenewVariantId(e.target.value)}
                />

                <Select
                  label="Thời điểm bắt đầu tính gia hạn"
                  options={[
                    { value: 'old_end_date', label: `Nối tiếp hạn cũ (${formatDate(order.endDate)})` },
                    { value: 'today', label: `Bắt đầu từ hôm nay (${formatDate(new Date().toISOString())})` },
                  ]}
                  value={startDateOption}
                  onChange={(e) => setStartDateOption(e.target.value)}
                />

                <Input
                  label="Nhập chi phí sửa đổi (VND - Tùy chọn)"
                  type="number"
                  min="0"
                  placeholder="Bỏ trống để sử dụng giá gốc"
                  value={renewCustomPrice}
                  onChange={(e) => setRenewCustomPrice(e.target.value)}
                />
              </div>

              <div className="px-6 py-4 bg-muted/50 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsRenewOpen(false)} disabled={renewing}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={renewing}>
                  Xác nhận gia hạn
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa đơn hàng"
        description="Bạn có chắc chắn muốn xóa đơn hàng này? Toàn bộ lịch sử gia hạn và email logs liên kết cũng sẽ bị xóa. Hành động này không thể hoàn tác."
        confirmText="Xóa đơn hàng"
        isDanger={true}
        isLoading={deleting}
      />

      {/* Refund/Warranty Confirmation Dialog */}
      <Dialog
        isOpen={isRefundOpen}
        onClose={() => setIsRefundOpen(false)}
        onConfirm={handleRefund}
        title="Xác nhận thực hiện bảo hành (Hoàn tiền)"
        description={`Bạn có chắc chắn muốn thực hiện bảo hành và hoàn tiền cho đơn hàng này? Số tiền hoàn lại tính theo số ngày còn lại (${refundDetails.remainingDays} ngày) là ${formatVND(refundDetails.refundAmount)}. Trạng thái đơn hàng sẽ chuyển sang "Đã hoàn tiền". Hành động này không thể hoàn tác.`}
        confirmText="Xác nhận hoàn tiền"
        isDanger={true}
        isLoading={refunding}
      />
    </div>
  );
}
