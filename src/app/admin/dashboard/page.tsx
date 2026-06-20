'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, showToast, PageHeader, StatCard, StatusBadge } from '@/components/ui';
import { AreaChart, DonutChart, HorizontalBarChart } from '@/components/Charts';
import {
  DollarSign,
  ShoppingCart,
  Users,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Package,
  Activity,
  CalendarClock,
} from 'lucide-react';

interface OverviewStats {
  revenueToday: number;
  revenueMonth: number;
  revenueYear: number;
  totalCustomers: number;
  totalOrders: number;
  expiringSoonCount: number;
  revenueLast7Days: number;
  revenueLast7DaysGrowth: number;
  revenueTodayGrowth: number;
}

interface RecentOrder {
  createdAt: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  creatorName: string;
  creatorRole: string;
  productName: string;
  variantName: string;
  cost: number;
  status: string;
  startDate: string;
  endDate: string;
}

interface ChartData {
  dailyRevenue: { label: string; value: number }[];
  monthlyRevenue: { label: string; value: number }[];
  topProducts: { label: string; value: number }[];
  topCreators: { label: string; value: number; subLabel?: string }[];
  orderStatusDistribution: { label: string; value: number; color: string }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats]               = useState<OverviewStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [charts, setCharts]             = useState<ChartData | null>(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data.overview);
          setRecentOrders(data.filteredReport.orders.slice(0, 5) || []);
          setCharts(data.charts);
        } else {
          showToast('Lỗi tải dữ liệu Dashboard.', 'error');
        }
      } catch {
        showToast('Lỗi kết nối máy chủ.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-5">
        <div
          className="w-11 h-11 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: '#f3d0f7', borderTopColor: '#a145ab' }}
        />
        <p className="text-sm font-semibold" style={{ color: '#a1acb8' }}>Đang tải số liệu hệ thống...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Page Header ── */}
      <PageHeader
        title="Bảng Tổng quan hệ thống"
        description="Theo dõi doanh thu, đơn hàng và hiệu suất kinh doanh của Nhanh Media."
      />

      {/* ── KPI Stats ── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          <StatCard
            title="Doanh thu hôm nay"
            value={formatVND(stats.revenueToday)}
            trend={stats.revenueTodayGrowth !== undefined ? {
              value: `${stats.revenueTodayGrowth >= 0 ? '+' : '-'}${Math.abs(stats.revenueTodayGrowth).toFixed(1)}% - 7 ngày trước`,
              isPositive: stats.revenueTodayGrowth >= 0
            } : undefined}
            icon={<DollarSign className="w-5.5 h-5.5" />}
            iconColor="primary"
          />
          <StatCard
            title="Doanh thu 7 ngày qua"
            value={formatVND(stats.revenueLast7Days)}
            trend={stats.revenueLast7DaysGrowth !== undefined ? {
              value: `${stats.revenueLast7DaysGrowth >= 0 ? '+' : '-'}${Math.abs(stats.revenueLast7DaysGrowth).toFixed(1)}% - 7 ngày trước`,
              isPositive: stats.revenueLast7DaysGrowth >= 0
            } : undefined}
            icon={<TrendingUp className="w-5.5 h-5.5" />}
            iconColor="success"
          />
          <StatCard
            title="Doanh thu tháng này"
            value={formatVND(stats.revenueMonth)}
            icon={<TrendingUp className="w-5.5 h-5.5" />}
            iconColor="success"
          />
          <StatCard
            title="Đơn hàng & Khách hàng"
            value={`${stats.totalOrders} đơn`}
            description={`${stats.totalCustomers} khách hàng`}
            icon={<Users className="w-5.5 h-5.5" />}
            iconColor="info"
          />
          <StatCard
            title="Sắp hết hạn"
            value={`${stats.expiringSoonCount} dịch vụ`}
            description="Trong 7 ngày tới"
            icon={<AlertTriangle className="w-5.5 h-5.5" />}
            iconColor="danger"
          />
        </div>
      )}

      {/* ── Charts Section ── */}
      {charts && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Left – Revenue + Status */}
          <div className="xl:col-span-2 space-y-5">

            {/* Revenue area chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#f3d0f7,#e9b6f0)', color: '#a145ab' }}
                  >
                    <Activity className="w-4 h-4" />
                  </span>
                  Doanh thu 15 ngày gần đây
                </CardTitle>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#f4f5fb', color: '#697a8d' }}>
                  15 ngày
                </span>
              </CardHeader>
              <CardContent className="pt-2">
                <AreaChart data={charts.dailyRevenue} height={240} />
              </CardContent>
            </Card>

            {/* Order status donut */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#cffafe,#a5f3fc)', color: '#0891b2' }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </span>
                  Phân bổ trạng thái Đơn hàng
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <DonutChart data={charts.orderStatusDistribution} />
              </CardContent>
            </Card>
          </div>

          {/* Right – Rankings */}
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', color: '#16a34a' }}
                  >
                    <Package className="w-4 h-4" />
                  </span>
                  Top 5 sản phẩm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={charts.topProducts} isCurrency={true} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)', color: '#d97706' }}
                  >
                    <Users className="w-4 h-4" />
                  </span>
                  Top 5 CTV/Đại lý
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={charts.topCreators} isCurrency={true} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Recent Orders Table ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#f3d0f7,#e9b6f0)', color: '#a145ab' }}
            >
              <CalendarClock className="w-4 h-4" />
            </span>
            Đơn hàng vừa phát sinh
          </CardTitle>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ background: '#f3d0f7', color: '#a145ab' }}
          >
            Xem tất cả <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-center py-10 font-medium" style={{ color: '#a1acb8' }}>
              Không có đơn hàng mới nào gần đây.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(108,117,147,0.10)', background: 'rgba(244,245,251,0.70)' }}>
                    {['Mã đơn', 'Khách hàng', 'Dịch vụ', 'Chi phí', 'Hết hạn', 'Trạng thái'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3.5 text-[10px] font-extrabold uppercase tracking-wider ${i === 3 ? 'text-right' : i >= 4 ? 'text-center' : ''}`}
                        style={{ color: '#a1acb8' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o, idx) => (
                    <tr
                      key={idx}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid rgba(108,117,147,0.07)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(244,245,251,0.70)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-xs px-2.5 py-1 rounded-lg" style={{ background: '#f3d0f7', color: '#a145ab' }}>
                          {o.orderCode}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-xs" style={{ color: '#1e293b' }}>{o.customerName}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: '#a1acb8' }}>{o.customerPhone}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-xs" style={{ color: '#1e293b' }}>{o.productName}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: '#a1acb8' }}>{o.variantName}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-sm" style={{ color: '#a145ab' }}>
                        {formatVND(o.cost)}
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs font-bold" style={{ color: '#ef4444' }}>
                        {formatDate(o.endDate)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
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
