'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, showToast, Button, PageHeader, StatCard, StatusBadge, EmptyState, LoadingSkeleton } from '@/components/ui';
import { AreaChart, DonutChart, HorizontalBarChart } from '@/components/Charts';
import { Download, Calendar, BarChart3, ShoppingCart } from 'lucide-react';

interface OrderReportItem {
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
  createdAt: string;
}

interface OverviewStats {
  revenueToday: number;
  revenueMonth: number;
  lifetimeRevenue: number;
  totalOrdersCount: number;
  myCustomerCount: number;
}

interface ChartData {
  dailyRevenue: { label: string; value: number }[];
  topProducts: { label: string; value: number }[];
  orderStatusDistribution: { label: string; value: number; color: string }[];
}

export default function UserRevenueReportsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [orders, setOrders] = useState<OrderReportItem[]>([]);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMyReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/my-revenue');
      if (res.ok) {
        const data = await res.json();
        setStats(data.overview);
        setOrders(data.orders || []);
        setCharts(data.charts);
      } else {
        showToast('Không thể tải báo cáo doanh thu cá nhân.', 'error');
      }
    } catch (error) {
      console.error('Fetch my revenue report error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, []);

  const exportCSV = () => {
    if (orders.length === 0) {
      showToast('Không có dữ liệu đơn hàng để xuất.', 'info');
      return;
    }

    const headers = [
      'Ngày Tạo Đơn',
      'Mã Đơn',
      'Tên Khách Hàng',
      'Số Điện Thoại',
      'Sản Phẩm',
      'Gói Thời Gian',
      'Chi Phí (VND)',
      'Trạng Thái',
      'Ngày Bắt Đầu',
      'Ngày Hết Hạn',
    ];

    const rows = orders.map((item) => [
      formatDate(item.createdAt),
      item.orderCode,
      item.customerName,
      item.customerPhone,
      item.productName,
      item.variantName,
      item.cost,
      item.status,
      formatDate(item.startDate),
      formatDate(item.endDate),
    ]);

    const csvContent =
      '\ufeff' +
      [headers.join(','), ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bao-cao-doanh-thu-ca-nhan-${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Xuất báo cáo doanh thu cá nhân CSV thành công!', 'success');
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Báo cáo Doanh thu cá nhân" 
          description="Theo dõi và trích xuất số liệu doanh số cá nhân của bạn trên hệ thống."
        />
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Báo cáo Doanh thu cá nhân" 
        description="Theo dõi và trích xuất số liệu doanh số cá nhân của bạn trên hệ thống."
      >
        <Button onClick={exportCSV} className="flex items-center gap-2 cursor-pointer">
          <Download className="w-4 h-4" />
          <span>Xuất Báo cáo CSV</span>
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard
            title="Tổng doanh thu trọn đời"
            value={formatVND(stats.lifetimeRevenue)}
            description="Tổng doanh số tích lũy"
            icon={<BarChart3 className="w-5 h-5" />}
          />
          <StatCard
            title="Doanh thu tháng này"
            value={formatVND(stats.revenueMonth)}
            description="Doanh số trong tháng hiện tại"
            icon={<Calendar className="w-5 h-5" />}
          />
          <StatCard
            title="Số lượng Đơn hàng đã tạo"
            value={`${stats.totalOrdersCount} đơn`}
            description="Tổng đơn hàng tự phục vụ"
            icon={<ShoppingCart className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Charts (Line / Bar) */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="py-5 border-b border-border/30">
                <CardTitle>Biến động doanh thu cá nhân (15 ngày qua)</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <AreaChart data={charts.dailyRevenue} height={240} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-5 border-b border-border/30">
                <CardTitle>Trạng thái đơn hàng của riêng bạn</CardTitle>
              </CardHeader>
              <CardContent className="py-6 flex justify-center">
                <div className="w-full max-w-md">
                  <DonutChart data={charts.orderStatusDistribution} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="h-full">
              <CardHeader className="py-5 border-b border-border/30">
                <CardTitle>Sản phẩm bán chạy nhất</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <HorizontalBarChart data={charts.topProducts} isCurrency={true} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Orders details table */}
      <Card>
        <CardHeader className="py-5 border-b border-border/30 flex flex-row items-center justify-between">
          <CardTitle>Danh sách chi tiết đơn hàng cá nhân</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                title="Bạn chưa có đơn hàng nào" 
                description="Hãy bắt đầu tạo đơn hàng dịch vụ đầu tiên để theo dõi báo cáo doanh thu."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-[#f5f5f9] text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-5">Ngày tạo</th>
                    <th className="px-6 py-5">Mã đơn</th>
                    <th className="px-6 py-5">Khách hàng</th>
                    <th className="px-6 py-5">Dịch vụ</th>
                    <th className="px-6 py-5">Gói chu kỳ</th>
                    <th className="px-6 py-5 text-right">Chi phí</th>
                    <th className="px-6 py-5 text-center">Trạng thái</th>
                    <th className="px-6 py-5 text-center">Ngày bắt đầu</th>
                    <th className="px-6 py-5 text-center">Ngày hết hạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {orders.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#f8f7fa] h-[64px] transition-colors duration-150">
                      <td className="px-6 py-5 text-slate-500 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                      <td className="px-6 py-5 font-semibold text-slate-800">{item.orderCode}</td>
                      <td className="px-6 py-5">
                        <div className="font-semibold text-slate-800">{item.customerName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.customerPhone}</div>
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-700">{item.productName}</td>
                      <td className="px-6 py-5 text-slate-500">{item.variantName}</td>
                      <td className="px-6 py-5 text-right font-semibold text-[#a145ab]">{formatVND(item.cost)}</td>
                      <td className="px-6 py-5 text-center whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-5 text-center whitespace-nowrap text-slate-500">{formatDate(item.startDate)}</td>
                      <td className="px-6 py-5 text-center whitespace-nowrap font-semibold text-rose-500">{formatDate(item.endDate)}</td>
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
