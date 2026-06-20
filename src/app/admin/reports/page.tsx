'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, showToast, Input, Select, PageHeader, StatCard, StatusBadge, RoleBadge, EmptyState, LoadingSkeleton } from '@/components/ui';
import { AreaChart, MultiLineChart, ColumnChart } from '@/components/Charts';
import { Download, BarChart3, Calendar, Users, TrendingUp, DollarSign, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
}

interface OrderReportItem {
  createdAt: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  creatorName: string;
  creatorRole: string;
  productName: string;
  variantName: string;
  cost: number;
  importPrice: number;
  profit: number;
  status: string;
  startDate: string;
  endDate: string;
}

interface Creator {
  id: string;
  name: string;
  role: string;
}

interface Product {
  id: string;
  name: string;
}

export default function AdminReportsPage() {
  const [reportData, setReportData] = useState<OrderReportItem[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for stats and charts
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalImport, setTotalImport] = useState(0);
  const [dailyChartData, setDailyChartData] = useState<{ label: string; value: number; revenue: number; importPrice: number; profit: number }[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [topCreators, setTopCreators] = useState<{ label: string; value: number; subLabel?: string }[]>([]);
  const [topCustomers, setTopCustomers] = useState<{ label: string; value: number; subLabel?: string }[]>([]);
  const [topProducts, setTopProducts] = useState<{ label: string; value: number }[]>([]);
  const [revenueLast7Days, setRevenueLast7Days] = useState(0);
  const [revenueLast7DaysGrowth, setRevenueLast7DaysGrowth] = useState(0);

  // Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [creatorId, setCreatorId] = useState('');
  const [productId, setProductId] = useState('');
  const [status, setStatus] = useState('');
  const [supplierId, setSupplierId] = useState('');

  // Sorting States
  type SortField = 'createdAt' | 'orderCode' | 'customerName' | 'creatorName' | 'productName' | 'cost' | 'profit' | 'status' | 'endDate';
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedReportData = React.useMemo(() => {
    return [...reportData].sort((a, b) => {
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
  }, [reportData, sortField, sortDirection]);

  const fetchFilters = async () => {
    try {
      const userRes = await fetch('/api/admin/users');
      const prodRes = await fetch('/api/admin/products');
      const suppRes = await fetch('/api/admin/suppliers');

      if (userRes.ok && prodRes.ok && suppRes.ok) {
        const userData = await userRes.json();
        const prodData = await prodRes.json();
        const suppData = await suppRes.json();
        setCreators(userData.users || []);
        setProducts(prodData.products || []);
        setSuppliers(suppData.suppliers || []);
      }
    } catch (error) {
      console.error('Fetch report filters error:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (creatorId) queryParams.append('creatorId', creatorId);
      if (productId) queryParams.append('productId', productId);
      if (status) queryParams.append('status', status);
      if (supplierId) queryParams.append('supplierId', supplierId);

      const res = await fetch(`/api/admin/reports?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data.filteredReport.orders || []);
        setTotalRevenue(data.filteredReport.totalRevenue || 0);
        setTotalImport(data.filteredReport.totalImport || 0);
        setTotalProfit(data.filteredReport.totalProfit || 0);
        setDailyChartData(data.charts.dailyRevenue || []);
        setTotalCustomers(data.overview?.totalCustomers || 0);
        setTopCreators(data.charts?.topCreators || []);
        setTopCustomers(data.charts?.topCustomers || []);
        setTopProducts(data.charts?.topProducts || []);
        setRevenueLast7Days(data.overview?.revenueLast7Days || 0);
        setRevenueLast7DaysGrowth(data.overview?.revenueLast7DaysGrowth || 0);
      } else {
        showToast('Không thể tải báo cáo doanh thu.', 'error');
      }
    } catch (error) {
      console.error('Fetch reports error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, creatorId, productId, status, supplierId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, creatorId, productId, status, supplierId, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedReportData.length / itemsPerPage);
  const paginatedReportData = React.useMemo(() => {
    return sortedReportData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedReportData, currentPage]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCreatorId('');
    setProductId('');
    setStatus('');
    setSupplierId('');
    showToast('Đã xóa tất cả bộ lọc', 'info');
  };

  const exportCSV = () => {
    if (sortedReportData.length === 0) {
      showToast('Không có dữ liệu báo cáo để xuất.', 'info');
      return;
    }

    const headers = [
      'Ngày Tạo Đơn',
      'Mã Đơn',
      'Tên Khách Hàng',
      'Số Điện Thoại',
      'Người Tạo Đơn',
      'Cấp Quyền Người Tạo',
      'Sản Phẩm',
      'Gói Thời Gian',
      'Chi Phí (VND)',
      'Giá Nhập (VND)',
      'Lợi Nhuận (VND)',
      'Trạng Thái',
      'Ngày Bắt Đầu',
      'Ngày Hết Hạn',
    ];

    const rows = sortedReportData.map((item) => [
      formatDate(item.createdAt),
      item.orderCode,
      item.customerName,
      item.customerPhone,
      item.creatorName,
      item.creatorRole,
      item.productName,
      item.variantName,
      item.cost,
      item.importPrice,
      item.profit,
      item.status,
      formatDate(item.startDate),
      formatDate(item.endDate),
    ]);

    const csvContent =
      '\ufeff' + // UTF-8 BOM
      [headers.join(','), ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bao-cao-doanh-thu-${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Xuất báo cáo CSV thành công!', 'success');
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'member': return 'Thành viên';
      case 'collaborator': return 'Cộng tác viên';
      case 'agency': return 'Đại lý';
      default: return role;
    }
  };

  const statuses = [
    { value: 'new', label: 'Mới tạo' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'running', label: 'Đang chạy' },
    { value: 'expired_soon', label: 'Sắp hết hạn' },
    { value: 'expired', label: 'Đã hết hạn' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Báo cáo Doanh thu hệ thống" 
        description="Phân tích chuyên sâu doanh số theo khoảng thời gian, sản phẩm và cộng tác viên."
      >
        <Button onClick={exportCSV} className="flex items-center gap-2 cursor-pointer">
          <Download className="w-4 h-4" />
          <span>Xuất Báo cáo CSV</span>
        </Button>
      </PageHeader>

      {/* Filter and settings */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Bộ lọc thống kê</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <Input
                label="Từ ngày"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Input
                label="Đến ngày"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Select
              label="Cộng tác viên / Đại lý"
              options={[
                { value: '', label: 'Tất cả người tạo' },
                ...creators.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${getRoleLabel(c.role)})`,
                })),
              ]}
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
            />

            <Select
              label="Sản phẩm"
              options={[
                { value: '', label: 'Tất cả sản phẩm' },
                ...products.map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            />

            <Select
              label="Trạng thái đơn"
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                ...statuses,
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />

            <Select
              label="Nguồn hàng (Tag)"
              options={[
                { value: '', label: 'Tất cả nguồn hàng' },
                ...suppliers.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            />
          </div>

          {(startDate || endDate || creatorId || productId || status || supplierId) && (
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards overview in reporting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="Doanh thu bộ lọc"
          value={formatVND(totalRevenue)}
          description="Doanh thu tính theo bộ lọc"
        />
        <StatCard
          title="Chi phí bộ lọc (Giá nhập)"
          value={formatVND(totalImport)}
          description="Tổng vốn nhập theo bộ lọc"
        />
        <StatCard
          title="Lợi nhuận bộ lọc"
          value={formatVND(totalProfit)}
          description="Lợi nhuận (Doanh thu - Giá nhập)"
        />
        <StatCard
          title="Doanh thu 7 ngày qua"
          value={formatVND(revenueLast7Days)}
          trend={revenueLast7DaysGrowth !== undefined ? {
            value: `${revenueLast7DaysGrowth >= 0 ? '+' : '-'}${Math.abs(revenueLast7DaysGrowth).toFixed(1)}% - 7 ngày trước`,
            isPositive: revenueLast7DaysGrowth >= 0
          } : undefined}
          description="Hệ thống 7 ngày qua"
        />
        <StatCard
          title="Số lượng Đơn hàng"
          value={`${reportData.length} đơn`}
          description="Đơn hàng theo bộ lọc"
        />
        <StatCard
          title="Tổng số khách hàng"
          value={`${totalCustomers} khách`}
          description="Khách hàng trên hệ thống"
        />
      </div>

      {/* SVG Column charts for daily trends (side-by-side) */}
      {dailyChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Revenue vs Cost */}
          <Card>
            <CardHeader className="py-5 border-b border-border/30 flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle>Biểu đồ Doanh thu & Chi phí</CardTitle>
              <div className="flex gap-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#a145ab]" />Doanh thu</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-500" />Chi phí (Giá nhập)</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ColumnChart 
                data={dailyChartData} 
                height={300} 
                keys={['revenue', 'importPrice']} 
                colors={['#a145ab', '#f97316']} 
              />
            </CardContent>
          </Card>

          {/* Card 2: Profit */}
          <Card>
            <CardHeader className="py-5 border-b border-border/30 flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle>Biểu đồ Lợi nhuận ròng</CardTitle>
              <div className="flex gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" />Lợi nhuận</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ColumnChart 
                data={dailyChartData} 
                height={300} 
                keys={['profit']} 
                colors={['#10b981']} 
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rankings Cards (Top 5 CTV/Đại lý, Top 5 Khách hàng, Top 5 Sản phẩm) */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top CTV/Đại lý */}
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Top 5 CTV / Đại lý doanh số cao</CardTitle>
            </CardHeader>
            <CardContent className="py-1 pb-6">
              {topCreators.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">Chưa có dữ liệu thống kê.</p>
              ) : (
                <div className="space-y-4">
                  {topCreators.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground font-semibold">{item.subLabel}</div>
                        </div>
                      </div>
                      <div className="font-extrabold text-primary shrink-0">{formatVND(item.value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Khách hàng */}
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Top 5 Khách hàng chi tiêu nhiều</CardTitle>
            </CardHeader>
            <CardContent className="py-1 pb-6">
              {topCustomers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">Chưa có dữ liệu thống kê.</p>
              ) : (
                <div className="space-y-4">
                  {topCustomers.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground font-semibold">{item.subLabel}</div>
                        </div>
                      </div>
                      <div className="font-extrabold text-emerald-600 shrink-0">{formatVND(item.value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Sản phẩm */}
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Top 5 Sản phẩm bán chạy</CardTitle>
            </CardHeader>
            <CardContent className="py-1 pb-6">
              {topProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">Chưa có dữ liệu thống kê.</p>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{item.label}</div>
                        </div>
                      </div>
                      <div className="font-extrabold text-blue-600 shrink-0">{formatVND(item.value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Reports list */}
      <Card>
        <CardHeader className="py-5 border-b border-border/30 flex flex-row items-center justify-between">
          <CardTitle>Bảng chi tiết báo cáo doanh thu</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton variant="table" />
            </div>
          ) : sortedReportData.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                title="Không tìm thấy dữ liệu" 
                description="Không tìm thấy đơn hàng nào khớp điều kiện lọc." 
                actionLabel="Xóa bộ lọc" 
                onAction={handleClearFilters}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-[#f5f5f9] text-slate-500 font-semibold uppercase tracking-wider">
                    <th 
                      onClick={() => handleSort('createdAt')} 
                      className="px-4 py-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
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
                      className="px-4 py-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
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
                      className="px-4 py-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
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
                      onClick={() => handleSort('creatorName')} 
                      className="px-4 py-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-1">
                        Người tạo / Cấp bậc
                        {sortField === 'creatorName' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('productName')} 
                      className="px-4 py-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group font-semibold uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-1">
                        Dịch vụ / Gói
                        {sortField === 'productName' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('cost')} 
                      className="px-4 py-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group text-right font-semibold uppercase tracking-wider"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Chi phí / Giá nhập
                        {sortField === 'cost' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('profit')} 
                      className="px-4 py-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group text-right font-semibold uppercase tracking-wider"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Lợi nhuận
                        {sortField === 'profit' ? (
                          sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-60" />
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('status')} 
                      className="px-4 py-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group text-center font-semibold uppercase tracking-wider"
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
                    <th 
                      onClick={() => handleSort('endDate')} 
                      className="px-4 py-4 cursor-pointer hover:bg-slate-200/50 transition-colors select-none group text-center font-semibold uppercase tracking-wider"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Bắt đầu / Hết hạn
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
                  {paginatedReportData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#f8f7fa] transition-colors duration-150">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.orderCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.customerName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{item.creatorName}</div>
                        <div className="mt-0.5"><RoleBadge role={item.creatorRole} /></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{item.productName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.variantName}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-[#a145ab]">{formatVND(item.cost)}</div>
                        <div className="text-[11px] text-rose-400 mt-0.5">{formatVND(item.importPrice)}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatVND(item.profit)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="text-slate-500">{formatDate(item.startDate)}</div>
                        <div className="text-[11px] font-semibold text-rose-500 mt-0.5">{formatDate(item.endDate)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-4 border-t border-border bg-[#f8f9fa] dark:bg-slate-900/50">
              <div className="text-xs text-slate-500 font-semibold text-center sm:text-left">
                Hiển thị <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-foreground">{Math.min(currentPage * itemsPerPage, sortedReportData.length)}</span> trong tổng số <span className="text-foreground">{sortedReportData.length}</span> đơn hàng
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 cursor-pointer"
                >
                  Đầu
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 cursor-pointer"
                >
                  Trước
                </Button>
                
                {/* Page numbers */}
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  // Show current page, and a range around it
                  if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8 p-0 cursor-pointer"
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="text-slate-400 px-1 text-xs">...</span>;
                  }
                  return null;
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 cursor-pointer"
                >
                  Sau
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 cursor-pointer"
                >
                  Cuối
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
