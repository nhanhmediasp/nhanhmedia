'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, showToast, Button, PageHeader, StatCard, StatusBadge, EmptyState, LoadingSkeleton } from '@/components/ui';
import { AreaChart, DonutChart, HorizontalBarChart } from '@/components/Charts';
import { Download, Calendar, BarChart3, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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

  // Sorting States
  type SortField = 'createdAt' | 'orderCode' | 'customerName' | 'productName' | 'variantName' | 'cost' | 'status' | 'endDate';
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedOrders = React.useMemo(() => {
    return [...orders].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal === undefined || aVal === null) return sortDirection === 'asc' ? -1 : 1;
      if (bVal === undefined || bVal === null) return sortDirection === 'asc' ? 1 : -1;

      if (sortField === 'createdAt' || sortField === 'endDate') {
        const dateA = new Date(aVal).getTime();
        const dateB = new Date(bVal).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal, 'vi') 
          : bVal.localeCompare(aVal, 'vi');
      }

      if (typeof aVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [orders, sortField, sortDirection]);

  // Paginated Orders
  const paginatedOrders = React.useMemo(() => {
    return sortedOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  }, [sortedOrders, currentPage]);

  const totalPages = Math.ceil(sortedOrders.length / PAGE_SIZE);

  // Reset to page 1 when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortField, sortDirection]);

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

  const translateStatus = (st: string) => {
    const statusMap: Record<string, string> = {
      new: 'Mới tạo',
      processing: 'Đang xử lý',
      running: 'Đang chạy',
      expired_soon: 'Sắp hết hạn',
      expired: 'Đã hết hạn',
      cancelled: 'Đã hủy',
      refunded: 'Đã bảo hành',
    };
    return statusMap[st?.toLowerCase()] || st;
  };

  const exportCSV = () => {
    if (sortedOrders.length === 0) {
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

    const rows = sortedOrders.map((item) => [
      formatDate(item.createdAt),
      item.orderCode,
      item.customerName,
      item.customerPhone,
      item.productName,
      item.variantName,
      item.cost,
      translateStatus(item.status),
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
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-[#f5f5f9] text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-5 w-[48px] text-center text-xs">STT</th>
                      <th 
                        onClick={() => handleSort('createdAt')} 
                        className="px-6 py-5 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-1">
                          Ngày tạo
                          {sortField === 'createdAt' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('orderCode')} 
                        className="px-6 py-5 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-1">
                          Mã đơn
                          {sortField === 'orderCode' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('customerName')} 
                        className="px-6 py-5 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-1">
                          Khách hàng
                          {sortField === 'customerName' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('productName')} 
                        className="px-6 py-5 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-1">
                          Dịch vụ
                          {sortField === 'productName' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('variantName')} 
                        className="px-6 py-5 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-1">
                          Gói chu kỳ
                          {sortField === 'variantName' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('cost')} 
                        className="px-6 py-5 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group text-right font-semibold uppercase tracking-wider"
                      >
                        <div className="flex items-center justify-end gap-1">
                          Chi phí
                          {sortField === 'cost' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('status')} 
                        className="px-6 py-5 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group text-center font-semibold uppercase tracking-wider"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Trạng thái
                          {sortField === 'status' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-5 text-center font-semibold uppercase tracking-wider">Ngày bắt đầu</th>
                      <th 
                        onClick={() => handleSort('endDate')} 
                        className="px-6 py-5 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group text-center font-semibold uppercase tracking-wider"
                      >
                        <div className="flex items-center justify-center gap-1">
                          Ngày hết hạn
                          {sortField === 'endDate' ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {paginatedOrders.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#f8f7fa] h-[64px] transition-colors duration-150">
                        <td className="px-4 py-5 text-center text-xs font-bold text-slate-400">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-4 border-t border-border bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium">
                    Hiển thị <span className="font-bold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span>
                    {' '}– <span className="font-bold text-foreground">{Math.min(currentPage * PAGE_SIZE, sortedOrders.length)}</span>
                    {' '}trong tổng số <span className="font-bold text-foreground">{sortedOrders.length}</span> đơn hàng
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-8 px-2.5 cursor-pointer text-xs">Đầu</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="h-8 px-2.5 cursor-pointer text-xs">Trước</Button>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                        return (
                          <Button key={pageNum} variant={currentPage === pageNum ? 'primary' : 'outline'} size="sm" onClick={() => setCurrentPage(pageNum)} className="h-8 w-8 p-0 cursor-pointer text-xs">
                            {pageNum}
                          </Button>
                        );
                      }
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span key={pageNum} className="text-slate-400 px-1 text-xs">...</span>;
                      }
                      return null;
                    })}
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 px-2.5 cursor-pointer text-xs">Sau</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-8 px-2.5 cursor-pointer text-xs">Cuối</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
