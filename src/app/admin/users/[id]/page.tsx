'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge, showToast, PageHeader, RoleBadge, EmptyState, LoadingSkeleton } from '@/components/ui';
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
  Users,
  Search,
} from 'lucide-react';

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

interface Order {
  id: string;
  orderCode: string;
  customer: Customer;
  product: Product;
  variant: Variant;
  price: number;
  customPrice: number | null;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  note: string | null;
  createdAt: string;
  orderCount: number;
  customerCount: number;
  totalSales: number;
  orders: Order[];
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUserDetail = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUserDetail(data.user);
      } else {
        showToast('Không thể tải chi tiết tài khoản.', 'error');
        router.push('/admin/users');
      }
    } catch (error) {
      console.error('Fetch user detail error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [id]);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  const getStatusBadge = (st: string) => {
    switch (st.toLowerCase()) {
      case 'active': return <Badge variant="success">Hoạt động</Badge>;
      case 'inactive': return <Badge variant="secondary">Ngưng hoạt động</Badge>;
      case 'locked': return <Badge variant="danger">Bị khóa</Badge>;
      default: return <Badge variant="secondary">{st}</Badge>;
    }
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
        <p className="text-sm text-muted-foreground font-semibold">Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  if (!userDetail) return null;

  const filteredOrders = userDetail.orders.filter(
    (o) =>
      o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.phone.includes(searchTerm) ||
      o.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <button className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chi tiết Tài khoản</h1>
          <p className="text-sm text-muted-foreground">Xem chi tiết hoạt động kinh doanh và hồ sơ người dùng.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Profile card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-purple-400 to-indigo-500" />
            <CardContent className="pt-0 px-6 pb-6 relative">
              <div className="flex flex-col items-center -mt-10 text-center space-y-3">
                {/* Avatar icon */}
                <div className="w-20 h-20 rounded-full border-4 border-card bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-md select-none">
                  {userDetail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{userDetail.name}</h2>
                  <div className="text-xs text-muted-foreground mt-0.5">{userDetail.email}</div>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <RoleBadge role={userDetail.role} />
                  {getStatusBadge(userDetail.status)}
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-border space-y-3.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" /> Số điện thoại:
                  </span>
                  <span className="font-semibold text-foreground">{userDetail.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" /> Ngày tạo:
                  </span>
                  <span className="font-semibold text-foreground">{formatDate(userDetail.createdAt)}</span>
                </div>
                {userDetail.note && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Ghi chú:</span>
                    <p className="text-xs bg-muted/40 p-2.5 rounded-lg text-slate-600 dark:text-slate-350 mt-1">
                      {userDetail.note}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Aggregates Card */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Thống kê hoạt động</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/5 border border-primary/10 p-3 rounded-xl">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Tổng doanh số</div>
                  <div className="text-base font-black text-primary mt-1">{formatVND(userDetail.totalSales)}</div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Khách hàng</div>
                  <div className="text-base font-black text-emerald-500 mt-1 flex items-center gap-1.5">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{userDetail.customerCount}</span>
                  </div>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl col-span-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">Số đơn hàng đã tạo</div>
                  <div className="text-base font-black text-blue-500 mt-1 flex items-center gap-1.5">
                    <FileText className="w-4.5 h-4.5 shrink-0" />
                    <span>{userDetail.orderCount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Orders created by user */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="py-4 flex items-center justify-between flex-wrap gap-4">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>Danh sách Đơn hàng đã tạo ({filteredOrders.length})</span>
              </h3>
              
              {/* Search filter */}
              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm đơn hàng, khách..."
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
              description={searchTerm ? "Không có đơn hàng nào khớp với từ khóa tìm kiếm." : "Tài khoản này chưa tạo đơn hàng nào."}
            />
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="px-5 py-4">Mã đơn</th>
                      <th className="px-5 py-4">Khách hàng</th>
                      <th className="px-5 py-4">Dịch vụ</th>
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
                            <div className="font-bold text-slate-800 dark:text-slate-200">{o.customer.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{o.customer.phone}</div>
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
                            <Link href={`/admin/orders/${o.id}`}>
                              <button
                                className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer animate-all"
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
