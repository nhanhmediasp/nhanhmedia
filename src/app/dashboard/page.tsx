'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Badge, showToast, PageHeader, StatCard, StatusBadge } from '@/components/ui';
import { AreaChart, DonutChart, HorizontalBarChart } from '@/components/Charts';
import {
  DollarSign,
  ShoppingCart,
  Users,
  ArrowUpRight,
  TrendingUp,
  Package,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';

interface OverviewStats {
  revenueToday: number;
  revenueMonth: number;
  lifetimeRevenue: number;
  totalOrdersCount: number;
  myCustomerCount: number;
}

interface RecentOrder {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  variantName: string;
  cost: number;
  status: string;
  startDate: string;
  endDate: string;
}

interface ChartData {
  dailyRevenue: { label: string; value: number }[];
  topProducts: { label: string; value: number }[];
  orderStatusDistribution: { label: string; value: number; color: string }[];
}

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/reports/my-revenue');
        if (res.ok) {
          const data = await res.json();
          setStats(data.overview);
          setRecentOrders(data.orders.slice(0, 5) || []);
          setCharts(data.charts);
        } else {
          showToast('Lỗi tải số liệu doanh thu cá nhân.', 'error');
        }
      } catch (error) {
        console.error('Fetch user dashboard error:', error);
        showToast('Lỗi kết nối máy chủ.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Đang tải số liệu thống kê cá nhân...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <PageHeader
        title="Bảng tin cá nhân"
        description={`Xin chào, ${user?.name}. Dưới đây là thống kê doanh số của riêng bạn.`}
      />

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Doanh thu hôm nay"
            value={formatVND(stats.revenueToday)}
            icon={<DollarSign className="w-5.5 h-5.5" />}
          />
          <StatCard
            title="Doanh thu tháng này"
            value={formatVND(stats.revenueMonth)}
            icon={<TrendingUp className="w-5.5 h-5.5" />}
          />
          <StatCard
            title="Đơn hàng đã tạo"
            value={`${stats.totalOrdersCount} đơn`}
            icon={<ShoppingCart className="w-5.5 h-5.5 text-emerald-500" />}
            className="border-emerald-100 dark:border-emerald-950/20"
          />
          <StatCard
            title="Khách hàng phụ trách"
            value={`${stats.myCustomerCount} khách`}
            icon={<Users className="w-5.5 h-5.5 text-indigo-500" />}
            className="border-indigo-100 dark:border-indigo-950/20"
          />
        </div>
      )}

      {/* Charts section */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue timeline */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="py-5">
                <CardTitle className="flex items-center gap-1.5">
                  <Activity className="w-5 h-5 text-primary" />
                  <span>Biểu đồ doanh thu 15 ngày qua</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AreaChart data={charts.dailyRevenue} height={250} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-5">
                <CardTitle className="flex items-center gap-1.5">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <span>Trạng thái đơn hàng của tôi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <DonutChart data={charts.orderStatusDistribution} />
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <div className="space-y-6">
            <Card className="h-full">
              <CardHeader className="py-5">
                <CardTitle className="flex items-center gap-1.5">
                  <Package className="w-5 h-5 text-primary" />
                  <span>Sản phẩm bán chạy nhất của bạn</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={charts.topProducts} isCurrency={true} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Recent Orders table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-5">
          <CardTitle>Đơn hàng vừa tạo gần đây</CardTitle>
          <Link href="/orders" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
            <span>Xem tất cả đơn hàng</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-6">Bạn chưa có đơn hàng nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                    <th className="px-6 py-3.5">Mã đơn</th>
                    <th className="px-6 py-3.5">Khách hàng</th>
                    <th className="px-6 py-3.5">Sản phẩm</th>
                    <th className="px-6 py-3.5 text-right">Chi phí</th>
                    <th className="px-6 py-3.5 text-center">Hết hạn</th>
                    <th className="px-6 py-3.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-5 font-bold text-foreground">{o.orderCode}</td>
                      <td className="px-6 py-5">
                        <div className="font-semibold text-foreground text-xs">{o.customerName}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{o.customerPhone}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-semibold text-foreground text-xs">{o.productName}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{o.variantName}</div>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-primary">{formatVND(o.cost)}</td>
                      <td className="px-6 py-5 text-center text-xs font-bold text-rose-500">{formatDate(o.endDate)}</td>
                      <td className="px-6 py-5 text-center">
                        <StatusBadge status={o.status} />
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
  );
}
