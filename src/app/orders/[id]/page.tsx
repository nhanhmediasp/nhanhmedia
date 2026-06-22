'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, showToast, Select, Dialog } from '@/components/ui';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Package,
  History,
  Loader2,
  Undo2,
} from 'lucide-react';

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

interface Renewal {
  id: string;
  oldEndDate: string;
  newEndDate: string;
  price: number;
  createdAt: string;
  renewedByUser: { name: string };
  variant: { name: string };
}

interface Order {
  id: string;
  orderCode: string;
  customerId: string;
  customer: Customer;
  productId: string;
  product: Product;
  variantId: string;
  variant: Variant;
  price: number;
  customPrice: number | null;
  amountPaid: number;
  status: string;
  startDate: string;
  endDate: string;
  note: string | null;
  createdAt: string;
  refundAmount: number | null;
  refundedAt: string | null;
  renewals: Renewal[];
}

export default function UserOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Renewal Modal State
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewVariantId, setRenewVariantId] = useState('');
  const [startDateOption, setStartDateOption] = useState('old_end_date');
  const [renewing, setRenewing] = useState(false);

  // Payment editing
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [customPaymentVal, setCustomPaymentVal] = useState('');





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
        setAuditLogs(data.auditLogs || []);
        // Set default renewal variant to current variant
        const variants = data.order.product?.variants;
        if (variants?.length > 0) {
          // Try to select current variant, otherwise first active
          const currentExists = variants.some((v: { id: string }) => v.id === data.order.variantId);
          setRenewVariantId(currentExists ? data.order.variantId : variants[0].id);
        }
      } else {
        showToast('Không thể tải chi tiết đơn hàng.', 'error');
        router.push('/orders');
      }
    } catch (error) {
      console.error('Fetch order detail error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async (val: number) => {
    setUpdatingPayment(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountPaid: val }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cập nhật số tiền thanh toán thành công!', 'success');
        setOrder(data.order);
        setCustomPaymentVal('');
      } else {
        showToast(data.error || 'Cập nhật thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setUpdatingPayment(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

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
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Gia hạn dịch vụ thành công!', 'success');
        setIsRenewOpen(false);
        fetchOrderDetail(); // Refresh detail to update end date and history list
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/orders">
            <button className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Chi tiết Đơn hàng {order.orderCode}</h1>
            <p className="text-sm text-muted-foreground">Theo dõi cấu hình, lịch sử gia hạn của dịch vụ.</p>
          </div>
        </div>
        
        <Button variant="outline" size="sm" onClick={() => setIsRenewOpen(true)} className="flex items-center gap-1.5 self-start sm:self-center cursor-pointer">
          <History className="w-4 h-4" />
          <span>Gia hạn dịch vụ</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <CardContent className="space-y-4">
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
              </div>

              {/* Payment Info & Actions */}
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-border/60">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tình trạng thanh toán:</span>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-extrabold text-foreground text-sm">
                        Đã nhận: {formatVND(order.amountPaid ?? 0)} / {formatVND(currentPrice)}
                      </span>
                      {(order.amountPaid ?? 0) >= currentPrice ? (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                          Đã thanh toán đủ
                        </span>
                      ) : (order.amountPaid ?? 0) > 0 ? (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                          Thanh toán một phần
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                          Chưa thanh toán
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                      type="button" 
                      size="sm" 
                      variant={(order.amountPaid ?? 0) >= currentPrice ? "outline" : "primary"}
                      onClick={() => handleUpdatePayment(currentPrice)}
                      disabled={updatingPayment}
                      className="cursor-pointer font-bold text-xs"
                    >
                      Đã thanh toán
                    </Button>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleUpdatePayment(currentPrice * 0.5)}
                      disabled={updatingPayment}
                      className="cursor-pointer font-bold text-xs"
                    >
                      Khách đã thanh toán 50%
                    </Button>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number"
                        placeholder="Tùy chỉnh..."
                        value={customPaymentVal}
                        onChange={(e) => setCustomPaymentVal(e.target.value)}
                        className="w-24 px-2 py-1 text-xs bg-white dark:bg-zinc-800 border border-border rounded-lg"
                      />
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const val = parseFloat(customPaymentVal);
                          if (isNaN(val) || val < 0) {
                            showToast("Vui lòng nhập số tiền hợp lệ", "error");
                            return;
                          }
                          handleUpdatePayment(val);
                        }}
                        disabled={updatingPayment}
                        className="cursor-pointer font-bold text-xs px-2"
                      >
                        Lưu
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {order.note && (
                <div className="pt-4 border-t border-border space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Ghi chú đơn hàng:</span>
                  <p className="text-sm bg-muted/40 p-3 rounded-lg text-foreground">{order.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Renewals History */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <span>Lịch sử gia hạn dịch vụ ({(order.renewals ?? []).length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(order.renewals ?? []).length === 0 ? (
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
                        <th className="py-3 pl-4 text-right">Chi phí</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(order.renewals ?? []).map((r) => (
                        <tr key={r.id} className="hover:bg-muted/10">
                          <td className="py-3 pr-4 font-medium">{formatDate(r.createdAt)}</td>
                          <td className="py-3 px-4 font-bold text-foreground">{r.variant.name}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(r.oldEndDate)}</td>
                          <td className="py-3 px-4 font-bold text-rose-500">{formatDate(r.newEndDate)}</td>
                          <td className="py-3 pl-4 text-right font-bold text-primary">{formatVND(r.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Log Timeline */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <span>Nhật ký hoạt động đơn hàng ({auditLogs.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">Chưa có nhật ký hoạt động nào.</p>
              ) : (
                <div className="relative pl-6 border-l border-border space-y-6">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[29.5px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs font-bold text-foreground bg-primary/5 px-2.5 py-0.5 rounded-xl border border-primary/10">
                            {log.actionLabel}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-foreground font-semibold">{log.description}</p>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Thực hiện bởi: <span className="font-bold text-slate-700 dark:text-slate-350">{log.actorName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
            <CardContent className="space-y-4">
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

          {/* Billing & Status */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span>Trạng thái & Hóa đơn</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Tổng tiền thanh toán:</span>
                <div className="text-xl font-extrabold text-primary">{formatVND(currentPrice)}</div>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-muted-foreground">Trạng thái dịch vụ:</span>
                  {getStatusBadge(order.status)}
                </div>

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
                  </div>
                )}

                <div className="pt-2 text-[10px] text-slate-500 leading-normal border-t border-border/60 mt-2">
                  Ngày đăng ký đơn: <span className="font-medium text-foreground">{formatDateTime(order.createdAt)}</span>
                </div>
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

    </div>
  );
}
