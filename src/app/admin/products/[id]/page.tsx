'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge, showToast, PageHeader, StatusBadge, RoleBadge, EmptyState, LoadingSkeleton } from '@/components/ui';
import { ArrowLeft, Search, Calendar, DollarSign, User, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
}

interface Variant {
  id: string;
  name: string;
}

interface Creator {
  id: string;
  name: string;
  role: string;
}

interface Order {
  id: string;
  orderCode: string;
  customerId: string;
  customer: Customer;
  price: number;
  customPrice: number | null;
  importPrice: number | null;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  variant: Variant;
  createdByUser: Creator;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  orderCount: number;
  orders: Order[];
}

type SortField = 'orderCode' | 'customerName' | 'price' | 'importPrice' | 'profit' | 'createdAt';
type SortDirection = 'asc' | 'desc';

function SortableHeader({ label, field, currentField, currentDirection, onSort, className }: {
  label: string;
  field: SortField;
  currentField: SortField | null;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;
  return (
    <th
      className={`px-6 py-5 cursor-pointer select-none hover:text-primary transition-colors group ${className || ''}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {isActive ? (
            currentDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5" />
          )}
        </span>
      </div>
    </th>
  );
}

export default function ProductStatsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sort State
  const [sortField, setSortField] = useState<SortField | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchProductStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
      } else {
        showToast('Không thể tải thông tin sản phẩm.', 'error');
        router.push('/admin/products');
      }
    } catch (error) {
      console.error('Fetch product stats error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductStats();
  }, [id]);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="table" />;
  }

  if (!product) return null;

  // Filter orders
  const filteredOrders = (product.orders || []).filter((o) => {
    const matchesSearch =
      o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.phone.includes(searchTerm);

    const matchesStatus = statusFilter === '' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDirection === 'asc' ? 1 : -1;

    const priceA = a.customPrice !== null ? a.customPrice : a.price;
    const priceB = b.customPrice !== null ? b.customPrice : b.price;
    const costA = a.importPrice !== null ? a.importPrice : 0;
    const costB = b.importPrice !== null ? b.importPrice : 0;
    const profitA = priceA - costA;
    const profitB = priceB - costB;

    switch (sortField) {
      case 'orderCode':
        return a.orderCode.localeCompare(b.orderCode) * dir;
      case 'customerName':
        return a.customer.name.localeCompare(b.customer.name) * dir;
      case 'price':
        return (priceA - priceB) * dir;
      case 'importPrice':
        return (costA - costB) * dir;
      case 'profit':
        return (profitA - profitB) * dir;
      case 'createdAt':
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedOrders.length / PAGE_SIZE);
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const statuses = [
    { value: 'new', label: 'Mới tạo' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'running', label: 'Đang chạy' },
    { value: 'expired_soon', label: 'Sắp hết hạn' },
    { value: 'expired', label: 'Đã hết hạn' },
    { value: 'cancelled', label: 'Đã hủy' },
    { value: 'refunded', label: 'Đã bảo hành' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <button className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-foreground cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Báo cáo Số liệu: {product.name}</h1>
          <p className="text-sm text-muted-foreground">Thống kê chi tiết doanh thu, chi phí đầu vào và lợi nhuận.</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Số đơn hàng</span>
              <div className="text-2xl font-black text-foreground">{product.orderCount} đơn</div>
            </div>
            <FileText className="w-8 h-8 text-primary/30" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Tổng doanh thu</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatVND(product.totalRevenue)}</div>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500/30" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Tổng vốn nhập</span>
              <div className="text-2xl font-black text-rose-500">{formatVND(product.totalCost)}</div>
            </div>
            <DollarSign className="w-8 h-8 text-rose-500/30" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Lợi nhuận ròng</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatVND(product.totalProfit)}</div>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-500/30" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <Search className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                placeholder="Tìm đơn hàng, khách hàng, số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-all duration-200"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {sortedOrders.length === 0 ? (
        <EmptyState
          title="Không tìm thấy đơn hàng nào"
          description="Sản phẩm này chưa có phát sinh đơn hàng hoặc không khớp bộ lọc."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="px-4 py-5 w-[48px] text-center text-xs">STT</th>
                  <SortableHeader label="Mã đơn" field="orderCode" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Khách hàng" field="customerName" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <th className="px-6 py-5">Gói dịch vụ</th>
                  <th className="px-6 py-5">Người tạo</th>
                  <SortableHeader label="Doanh thu" field="price" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right" />
                  <SortableHeader label="Vốn nhập" field="importPrice" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right" />
                  <SortableHeader label="Lợi nhuận" field="profit" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right" />
                  <SortableHeader label="Thời gian" field="createdAt" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {paginatedOrders.map((o, idx) => {
                  const finalPrice = o.customPrice !== null ? o.customPrice : o.price;
                  const finalCost = o.importPrice !== null ? o.importPrice : 0;
                  const profit = finalPrice - finalCost;

                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-5 text-center text-xs font-bold text-slate-400">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-6 py-5 font-bold">
                        <Link href={`/admin/orders/${o.id}`} className="hover:text-primary transition-colors">
                          {o.orderCode}
                        </Link>
                        <div className="mt-1">
                          <StatusBadge status={o.status} />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{o.customer.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{o.customer.phone}</div>
                      </td>
                      <td className="px-6 py-5 text-slate-700 dark:text-slate-300 font-semibold">{o.variant.name}</td>
                      <td className="px-6 py-5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{o.createdByUser.name}</div>
                        <div className="mt-1">
                          <RoleBadge role={o.createdByUser.role} />
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-primary">{formatVND(finalPrice)}</td>
                      <td className="px-6 py-5 text-right font-bold text-rose-500">{formatVND(finalCost)}</td>
                      <td className="px-6 py-5 text-right font-black text-emerald-600 dark:text-emerald-400">{formatVND(profit)}</td>
                      <td className="px-6 py-5 text-center text-xs text-muted-foreground">{formatDate(o.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-4 border-t border-border bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">
                Hiển thị <span className="font-bold text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span>
                {' '}– <span className="font-bold text-foreground">{Math.min(currentPage * PAGE_SIZE, sortedOrders.length)}</span>
                {' '}trong tổng số <span className="font-bold text-foreground">{sortedOrders.length}</span> đơn hàng
              </span>
              <div className="flex items-center gap-1.5 justify-center">
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
                  return null;
                })}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="h-8 px-2.5 cursor-pointer text-xs">Sau</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-8 px-2.5 cursor-pointer text-xs">Cuối</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
