'use client';

import React, { use, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, showToast, PageHeader, LoadingSkeleton, StatCard, StatusBadge } from '@/components/ui';
import { ArrowLeft, Calendar, DollarSign, FileText, Tag, ExternalLink, ArrowRight } from 'lucide-react';
import { SupplierAvatar } from '@/components/SupplierAvatar';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
}

interface UserSession {
  name: string;
  role: string;
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
  importPrice: number | null;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  createdByUser: UserSession;
}

interface Supplier {
  id: string;
  name: string;
  contactUrl: string | null;
  icon: string | null;
  manualRating: number | null;
  internalNotes: string | null;
  createdAt: string;
  orders: Order[];
  totalRevenue?: number;
  totalCost?: number;
  cancelledCount?: number;
  totalRefundAmount?: number;
  autoRating?: number;
}

export default function AdminSupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSupplierDetail = async () => {
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSupplier(data.supplier);
      } else {
        showToast('Không thể tải chi tiết nguồn hàng.', 'error');
        router.push('/admin/suppliers');
      }
    } catch (error) {
      console.error('Fetch supplier detail error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierDetail();
  }, [id]);

  const stats = useMemo(() => {
    if (!supplier || !supplier.orders) return { count: 0, revenue: 0, cost: 0, profit: 0, cancelled: 0, refundedAmount: 0 };
    let revenue = 0;
    let cost = 0;
    let cancelled = 0;
    let refundedAmount = 0;

    supplier.orders.forEach((o) => {
      const sellPrice = o.customPrice !== null ? o.customPrice : o.price;
      revenue += sellPrice;
      cost += o.importPrice || 0;
      if (o.status === 'cancelled') {
        cancelled++;
      }
      refundedAmount += o.refundAmount || 0;
    });

    return {
      count: supplier.orders.length,
      revenue,
      cost,
      profit: revenue - cost,
      cancelled,
      refundedAmount,
    };
  }, [supplier]);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#f3d0f7', borderTopColor: '#a145ab' }} />
        <p className="text-sm font-semibold" style={{ color: '#a1acb8' }}>Đang tải chi tiết nguồn hàng...</p>
      </div>
    );
  }

  if (!supplier) return null;

  const effectiveRating = supplier.manualRating || supplier.autoRating || 4;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 animate-fade-in-up">
        <Link href="/admin/suppliers">
          <Button variant="outline" size="sm"
            className="p-2 h-10 w-10 flex items-center justify-center rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <SupplierAvatar iconName={supplier.icon} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#1e293b' }}>
              Nguồn hàng: {supplier.name}
            </h1>
            <Badge variant="primary" className="ml-1">Tag</Badge>
            {stats.cancelled > 2 && <Badge variant="danger" className="scale-90 font-black animate-pulse">Tỷ lệ hủy cao ⚠️</Badge>}
          </div>
          {/* Rating stars */}
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => {
                const starVal = i + 1;
                return (
                  <span
                    key={i}
                    className={`text-sm ${
                      starVal <= effectiveRating ? 'text-amber-400 font-extrabold' : 'text-slate-200'
                    }`}
                  >
                    ★
                  </span>
                );
              })}
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              ({supplier.manualRating ? 'Đánh giá bởi Admin' : 'Tính toán tự động'})
            </span>
          </div>

          {supplier.internalNotes && (
            <div className="mt-2 bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 p-3 rounded-xl max-w-xl text-xs text-slate-500 italic">
              Ghi chú uy tín: "{supplier.internalNotes}"
            </div>
          )}

          {supplier.contactUrl ? (
            <a
              href={supplier.contactUrl.startsWith('http') ? supplier.contactUrl : `https://${supplier.contactUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-semibold mt-2.5 inline-flex items-center gap-1"
            >
              <span>Liên hệ: {supplier.contactUrl}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <p className="text-sm font-medium mt-1" style={{ color: '#a1acb8' }}>
              Không có link liên hệ.
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-in-up">
        <StatCard
          title="Tổng đơn hàng"
          value={`${stats.count} đơn`}
          description={stats.cancelled > 0 ? `Bị hủy ${stats.cancelled} đơn` : "Hoạt động tốt"}
          icon={<FileText className="w-5 h-5" />}
          iconColor="primary"
        />
        <StatCard
          title="Tổng doanh thu"
          value={formatVND(stats.revenue)}
          description="Doanh thu bán ra"
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="info"
        />
        <StatCard
          title="Tổng vốn nhập"
          value={formatVND(stats.cost)}
          description="Chi phí gốc"
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="danger"
        />
        <StatCard
          title="Tổng lợi nhuận"
          value={formatVND(stats.profit)}
          description="Lợi nhuận ròng"
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="success"
          trend={{ value: stats.revenue > 0 ? `${Math.round((stats.profit / stats.revenue) * 100)}%` : '0%', isPositive: stats.profit >= 0 }}
        />
      </div>

      {/* Orders List using this Supplier */}
      <Card className="animate-fade-in-up">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <span>Danh sách đơn hàng sử dụng nguồn hàng này ({supplier.orders.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.orders.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground italic">
              Hiện chưa có đơn hàng nào liên kết với Tag nguồn hàng này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold bg-muted/20">
                    <th className="py-3 px-4">Mã đơn</th>
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4">Dịch vụ</th>
                    <th className="py-3 px-4 text-center">Ngày tạo</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Giá bán</th>
                    <th className="py-3 px-4 text-right">Giá nhập gốc</th>
                    <th className="py-3 px-4 text-right">Lợi nhuận</th>
                    <th className="py-3 px-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {supplier.orders.map((o) => {
                    const sellPrice = o.customPrice !== null ? o.customPrice : o.price;
                    const importPrice = o.importPrice || 0;
                    const profit = sellPrice - importPrice;
                    return (
                      <tr key={o.id} className="hover:bg-muted/10">
                        <td className="py-3.5 px-4 font-bold text-foreground">{o.orderCode}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{o.customer.name}</div>
                          <div className="text-xs text-muted-foreground">{o.customer.phone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{o.product.name}</div>
                          <div className="text-xs text-muted-foreground">{o.variant.name}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center text-xs text-muted-foreground">
                          {formatDate(o.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                          {formatVND(sellPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-rose-500">
                          {formatVND(importPrice)}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-rose-600'}`}>
                          {formatVND(profit)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Link href={`/admin/orders/${o.id}`}>
                            <button className="p-1 text-primary hover:bg-primary/10 rounded-lg cursor-pointer flex items-center justify-center mx-auto" title="Xem chi tiết đơn hàng">
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
