'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card, CardHeader, CardTitle, CardContent,
  showToast, PageHeader, StatCard, StatusBadge,
} from '@/components/ui';
import { AreaChart, DonutChart, HorizontalBarChart, MultiLineChart } from '@/components/Charts';
import {
  DollarSign, ShoppingCart, Users, AlertTriangle,
  ArrowUpRight, TrendingUp, Package, Activity, CalendarClock,
  FolderGit2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface OverviewStats {
  revenueToday:           number;
  revenueMonth:           number;
  totalCustomers:         number;
  totalOrders:            number;
  expiringSoonCount:      number;
  revenueLast7Days:       number;
  revenueLast7DaysGrowth: number;
  revenueTodayGrowth:     number;
  totalProjects:          number;
  runningProjectsCount:   number;
  productRevenueMonth:    number;
  projectRevenueMonth:    number;
  expensesMonth:          number;
  profitMonth:            number;
}

interface RecentOrder {
  createdAt:    string;
  orderCode:    string;
  customerName: string;
  customerPhone:string;
  creatorName:  string;
  creatorRole:  string;
  productName:  string;
  variantName:  string;
  cost:         number;
  status:       string;
  startDate:    string;
  endDate:      string;
}

interface ChartData {
  dailyRevenue:           { label: string; [key: string]: any }[];
  monthlyRevenue:         { label: string; value: number }[];
  topProducts:            { label: string; value: number }[];
  topCreators:            { label: string; value: number; subLabel?: string }[];
  topProjects:            { label: string; value: number; subLabel?: string }[];
  orderStatusDistribution:{ label: string; value: number; color: string }[];
  projectStatusDistribution:{ label: string; value: number; color: string }[];
}

// ── Skeleton components ────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
      <div className="h-3 bg-slate-200 rounded w-1/2 mb-3" />
      <div className="h-7 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-2 bg-slate-100 rounded w-1/3" />
    </div>
  );
}

function SkeletonChart({ height = 240 }: { height?: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="h-full bg-slate-100 rounded-xl" />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  // Critical data (load ngay)
  const [stats,        setStats]        = useState<OverviewStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [criticalLoading, setCriticalLoading] = useState(true);

  // Non-critical data (lazy load sau)
  const [charts,        setCharts]        = useState<ChartData | null>(null);
  const [chartsLoading, setChartsLoading] = useState(true);

  // ── Load 1: Critical KPIs + recent orders ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/dashboard?section=critical', {
          // Dùng cache của browser – đã set Cache-Control 30s phía server
          next: { revalidate: 30 },
        } as RequestInit);

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setStats(data.overview ?? null);
          setRecentOrders(data.filteredReport?.orders?.slice(0, 5) ?? []);
        } else {
          showToast('Lỗi tải dữ liệu Dashboard.', 'error');
        }
      } catch {
        if (!cancelled) showToast('Lỗi kết nối máy chủ.', 'error');
      } finally {
        if (!cancelled) setCriticalLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // Chỉ chạy 1 lần khi mount

  // ── Load 2: Charts + rankings (lazy — chạy sau critical xong) ────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/dashboard?section=charts', {
          next: { revalidate: 60 },
        } as RequestInit);

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setCharts(data.charts ?? null);
        }
      } catch {
        // Charts là non-critical — không show toast lỗi
        console.error('[dashboard] charts load failed');
      } finally {
        if (!cancelled) setChartsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // Chỉ chạy 1 lần khi mount

  const formatVND  = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

  // ── Critical loading: spinner toàn màn hình ───────────────────────────
  if (criticalLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-5">
        <div
          className="w-11 h-11 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: '#f3d0f7', borderTopColor: '#a145ab' }}
        />
        <p className="text-sm font-semibold" style={{ color: '#a1acb8' }}>
          Đang tải số liệu hệ thống...
        </p>
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

      {/* ── KPI Stats (Critical — hiển thị ngay) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {stats ? (
          <>
            <StatCard
              title="Doanh thu tháng này"
              value={formatVND(stats.revenueMonth)}
              description={`SP: ${formatVND(stats.productRevenueMonth || 0)} | DA: ${formatVND(stats.projectRevenueMonth || 0)}`}
              icon={<DollarSign className="w-5.5 h-5.5" />}
              iconColor="primary"
            />
            <StatCard
              title="Chi phí tháng này"
              value={formatVND(stats.expensesMonth || 0)}
              description="Gồm giá nhập SP & chi phí DA"
              icon={<TrendingUp className="w-5.5 h-5.5" style={{ color: '#ef4444' }} />}
              iconColor="danger"
            />
            <StatCard
              title="Lợi nhuận tháng này"
              value={formatVND(stats.profitMonth || 0)}
              description="Doanh thu trừ Chi phí"
              icon={<TrendingUp className="w-5.5 h-5.5" />}
              iconColor="success"
            />
            <StatCard
              title="Đơn hàng & Dự án"
              value={`${stats.totalOrders} Đơn hàng`}
              description={`${stats.totalProjects || 0} Dự án (${stats.runningProjectsCount || 0} đang chạy)`}
              icon={<FolderGit2 className="w-5.5 h-5.5" />}
              iconColor="info"
            />
            <StatCard
              title="Khách hàng & Nhắc hạn"
              value={`${stats.totalCustomers} Khách hàng`}
              description={`${stats.expiringSoonCount} dịch vụ sắp hết hạn`}
              icon={<AlertTriangle className="w-5.5 h-5.5" />}
              iconColor="danger"
            />
          </>
        ) : (
          // Skeleton cho KPI cards khi stats null
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        )}
      </div>

      {/* ── Charts Section (Non-critical — skeleton trong khi lazy load) ── */}
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
              {chartsLoading
                ? <SkeletonChart height={240} />
                : (
                  <>
                    <MultiLineChart 
                      data={charts?.dailyRevenue ?? []} 
                      keys={['productRevenue', 'projectRevenue']} 
                      colors={['#a145ab', '#10b981']} 
                      height={240} 
                    />
                    <div className="flex justify-center gap-6 mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#a145ab' }} />
                        <span>Sản phẩm & Dịch vụ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                        <span>Dự án</span>
                      </div>
                    </div>
                  </>
                )
              }
            </CardContent>
          </Card>

          {/* Status Donut Charts side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                {chartsLoading
                  ? <SkeletonChart height={200} />
                  : <DonutChart data={charts?.orderStatusDistribution ?? []} />
                }
              </CardContent>
            </Card>

            {/* Project status donut */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', color: '#0369a1' }}
                  >
                    <FolderGit2 className="w-4 h-4" />
                  </span>
                  Phân bổ trạng thái Dự án
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                {chartsLoading
                  ? <SkeletonChart height={200} />
                  : <DonutChart data={charts?.projectStatusDistribution ?? []} />
                }
              </CardContent>
            </Card>
          </div>
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
              {chartsLoading
                ? <SkeletonChart height={160} />
                : <HorizontalBarChart data={charts?.topProducts ?? []} isCurrency={true} />
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#e0e7ff,#c7d2fe)', color: '#4f46e5' }}
                >
                  <FolderGit2 className="w-4 h-4" />
                </span>
                Top 5 dự án (Ngân sách)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartsLoading
                ? <SkeletonChart height={160} />
                : <HorizontalBarChart data={charts?.topProjects ?? []} isCurrency={true} />
              }
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
              {chartsLoading
                ? <SkeletonChart height={160} />
                : <HorizontalBarChart data={charts?.topCreators ?? []} isCurrency={true} />
              }
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Recent Orders Table (Critical — hiển thị ngay) ── */}
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
