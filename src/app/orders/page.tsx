'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Button, Badge, showToast, PageHeader, StatusBadge, EmptyState, LoadingSkeleton } from '@/components/ui';
import { Search, Plus, Eye, FileText, Download, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Clock } from 'lucide-react';

interface Product {
  id: string;
  name: string;
}

interface Variant {
  id: string;
  name: string;
  durationValue: number;
  durationUnit: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
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
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

type SortField = 'orderCode' | 'customerName' | 'price' | 'startDate' | 'endDate' | 'createdAt';
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

export default function UserOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  // Sort state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchData = async () => {
    setLoading(true);
    try {
      const ordersRes = await fetch('/api/orders');
      const productsRes = await fetch('/api/products');

      if (ordersRes.ok && productsRes.ok) {
        const ordersData = await ordersRes.json();
        const productsData = await productsRes.json();
        setOrders(ordersData.orders || []);
        setProducts(productsData.products || []);
      } else {
        showToast('Không thể tải danh sách đơn hàng.', 'error');
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('vi-VN');
    } catch (e) {
      return '';
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return '';
    }
  };

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.phone.includes(searchTerm);

    const matchesStatus = statusFilter === '' || o.status === statusFilter;
    const matchesProduct = productFilter === '' || o.productId === productFilter;

    return matchesSearch && matchesStatus && matchesProduct;
  });

  // Sort orders
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDirection === 'asc' ? 1 : -1;

    switch (sortField) {
      case 'orderCode':
        return a.orderCode.localeCompare(b.orderCode) * dir;
      case 'customerName':
        return a.customer.name.localeCompare(b.customer.name) * dir;
      case 'price': {
        const priceA = a.customPrice !== null ? a.customPrice : a.price;
        const priceB = b.customPrice !== null ? b.customPrice : b.price;
        return (priceA - priceB) * dir;
      }
      case 'startDate':
        return (new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) * dir;
      case 'endDate':
        return (new Date(a.endDate).getTime() - new Date(b.endDate).getTime()) * dir;
      case 'createdAt':
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      default:
        return 0;
    }
  });

  // Client-side CSV Export
  const exportCSV = () => {
    try {
      if (sortedOrders.length === 0) {
        showToast('Không có dữ liệu để xuất.', 'info');
        return;
      }

      const headers = [
        'Mã Đơn Hàng',
        'Khách Hàng',
        'Số Điện Thoại',
        'Sản Phẩm',
        'Gói Đăng Ký',
        'Chi Phí (VND)',
        'Trạng Thái',
        'Ngày Bắt Đầu',
        'Ngày Hết Hạn',
        'Ngày Tạo Đơn',
      ];

      const rows = sortedOrders.map((o) => [
        o.orderCode || '',
        o.customer?.name || '',
        o.customer?.phone || '',
        o.product?.name || '',
        o.variant?.name || '',
        (o.customPrice !== null && o.customPrice !== undefined) ? o.customPrice : (o.price || 0),
        o.status || '',
        formatDate(o.startDate),
        formatDate(o.endDate),
        formatDateTime(o.createdAt),
      ]);

      const csvContent =
        '\ufeff' +
        [headers.join(','), ...rows.map((row) => row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `don-hang-cua-toi-${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Xuất báo cáo CSV thành công!', 'success');
    } catch (error: any) {
      console.error('CSV export error:', error);
      showToast('Lỗi xuất file CSV: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

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
      <PageHeader
        title="Đơn hàng của tôi"
        description="Theo dõi và quản lý trạng thái các đơn hàng dịch vụ bạn đã tạo."
      >
        <div className="flex gap-2.5 w-full sm:w-auto shrink-0">
          <Button variant="outline" onClick={exportCSV} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 cursor-pointer">
            <Download className="w-4 h-4" />
            <span>Xuất CSV</span>
          </Button>
          <Link href="/orders/create" className="flex-1 sm:flex-initial">
            <Button className="w-full flex items-center justify-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Tạo đơn hàng</span>
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Filters */}
      <Card>
        <CardContent className="py-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="md:col-span-2 relative">
              <span className="absolute left-3 top-3 text-slate-400">
                <Search className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm theo mã đơn, khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-all duration-200"
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

            <div>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Tất cả dịch vụ</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List content */}
      {loading ? (
        <LoadingSkeleton variant="table" />
      ) : sortedOrders.length === 0 ? (
        <EmptyState
          title="Không tìm thấy đơn hàng nào"
          description="Bạn chưa có đơn hàng nào khớp với các bộ lọc hoặc chưa tạo đơn hàng nào."
          actionLabel="Tạo đơn hàng"
          onAction={() => router.push('/orders/create')}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <SortableHeader label="Mã đơn" field="orderCode" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <SortableHeader label="Khách hàng" field="customerName" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} />
                  <th className="px-6 py-5">Dịch vụ</th>
                  <SortableHeader label="Chi phí" field="price" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right" />
                  <SortableHeader label="Thời hạn" field="endDate" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-center" />
                  <SortableHeader label="Ngày tạo" field="createdAt" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-center" />
                  <th className="px-6 py-5 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {sortedOrders.map((o) => {
                  const finalPrice = o.customPrice !== null ? o.customPrice : o.price;
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-5">
                        <div className="font-bold text-foreground">{o.orderCode}</div>
                        <div className="mt-1">
                          <StatusBadge status={o.status} />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{o.customer.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{o.customer.phone}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{o.product.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{o.variant.name}</div>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-primary">{formatVND(finalPrice)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center gap-1 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Bắt đầu: {formatDate(o.startDate)}</span>
                          </div>
                          <div className="flex items-center gap-1 font-bold text-rose-500">
                            <Calendar className="w-3 h-3" />
                            <span>Hết hạn: {formatDate(o.endDate)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(o.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
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
  );
}
