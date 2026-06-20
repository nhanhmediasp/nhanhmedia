'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge, showToast, PageHeader, EmptyState, LoadingSkeleton } from '@/components/ui';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Package,
  FileText,
  Mail,
  Phone,
  Eye,
  Loader2,
  Search,
  MessageSquare,
  Facebook,
} from 'lucide-react';

interface Order {
  id: string;
  orderCode: string;
  product: { name: string };
  variant: { name: string };
  price: number;
  customPrice: number | null;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  createdByUser: { name: string; role: string };
}

interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  facebook: string | null;
  zalo: string | null;
  email: string | null;
  note: string | null;
  createdAt: string;
  createdByUserId: string;
  createdByUser: { id: string; name: string; role: string };
  orderCount: number;
  totalSpent: number;
  orders: Order[];
}

export default function UserCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomerDetail = async () => {
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      } else {
        showToast('Không thể tải chi tiết khách hàng hoặc khách hàng không thuộc quản lý của bạn.', 'error');
        router.push('/customers');
      }
    } catch (error) {
      console.error('Fetch customer detail error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return <Badge variant="secondary">Mới tạo</Badge>;
      case 'processing': return <Badge variant="info">Đang xử lý</Badge>;
      case 'running': return <Badge variant="success">Đang chạy</Badge>;
      case 'expired_soon': return <Badge variant="warning">Sắp hết hạn</Badge>;
      case 'expired': return <Badge variant="danger">Đã hết hạn</Badge>;
      case 'cancelled': return <Badge variant="secondary" className="opacity-55">Đã hủy</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Đang tải thông tin khách hàng...</p>
      </div>
    );
  }

  if (!customer) return null;

  const filteredOrders = customer.orders.filter(
    (o) =>
      o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <button className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chi tiết Khách hàng</h1>
          <p className="text-sm text-muted-foreground">Theo dõi thông tin liên lạc và lịch sử đơn hàng của khách hàng của bạn.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Contact Info card */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xl font-bold shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-extrabold text-foreground truncate">{customer.name}</h2>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Khách hàng của tôi</div>
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-3.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" /> SĐT:
                  </span>
                  <span className="font-semibold text-foreground">{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-400" /> Email:
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]" title={customer.email}>
                      {customer.email}
                    </span>
                  </div>
                )}
                {customer.zalo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-slate-400" /> Zalo:
                    </span>
                    <a href={`https://zalo.me/${customer.zalo}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">
                      {customer.zalo}
                    </a>
                  </div>
                )}
                {customer.facebook && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Facebook className="w-4 h-4 text-slate-400" /> Facebook:
                    </span>
                    <a href={customer.facebook} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold truncate max-w-[120px]">
                      Xem profile
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" /> Ngày tạo:
                  </span>
                  <span className="font-semibold text-foreground">{formatDate(customer.createdAt)}</span>
                </div>
                {customer.note && (
                  <div className="pt-3 border-t border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Ghi chú:</span>
                    <p className="text-xs bg-muted/40 p-2.5 rounded-lg text-slate-600 dark:text-slate-350 mt-1">
                      {customer.note}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Aggregates Card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Thống kê chi tiêu</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 border border-primary/10 p-3 rounded-xl col-span-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Tổng tiền đã chi tiêu</div>
                  <div className="text-lg font-black text-primary mt-1">{formatVND(customer.totalSpent)}</div>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl col-span-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Số lượng đơn hàng đã mua</div>
                  <div className="text-base font-black text-blue-500 mt-1 flex items-center gap-1.5">
                    <FileText className="w-4.5 h-4.5 shrink-0" />
                    <span>{customer.orderCount} đơn hàng</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Orders bought by customer */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="py-4 flex items-center justify-between flex-wrap gap-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <span>Danh sách dịch vụ đã mua ({filteredOrders.length})</span>
              </h3>
              
              {/* Search filter */}
              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm theo mã đơn, dịch vụ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-input border border-border rounded-xl text-foreground placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </CardContent>
          </Card>

          {filteredOrders.length === 0 ? (
            <EmptyState
              title="Không tìm thấy đơn hàng nào"
              description={searchTerm ? "Không có đơn hàng nào khớp với từ khóa tìm kiếm." : "Khách hàng này chưa mua đơn hàng nào từ tài khoản của bạn."}
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="px-5 py-4">Mã đơn</th>
                      <th className="px-5 py-4">Dịch vụ đăng ký</th>
                      <th className="px-5 py-4 text-right">Chi phí</th>
                      <th className="px-5 py-4 text-center">Hạn dùng</th>
                      <th className="px-5 py-4 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {filteredOrders.map((o) => {
                      const finalPrice = o.customPrice !== null ? o.customPrice : o.price;
                      return (
                        <tr key={o.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-5 py-4 font-bold text-foreground">
                            <div>{o.orderCode}</div>
                            <div className="mt-1">
                              {getOrderStatusBadge(o.status)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{o.product.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{o.variant.name}</div>
                          </td>
                          <td className="px-5 py-4 text-right font-bold text-primary">
                            {formatVND(finalPrice)}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="text-[10px] text-muted-foreground">Hết hạn:</div>
                            <div className="font-bold text-rose-500 mt-0.5">{formatDate(o.endDate)}</div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <Link href={`/orders/${o.id}`}>
                              <button
                                className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                                title="Xem chi tiết đơn hàng"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
