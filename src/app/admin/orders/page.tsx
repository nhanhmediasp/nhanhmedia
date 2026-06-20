'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Button, Badge, showToast, Dialog, PageHeader, StatusBadge, RoleBadge, EmptyState, LoadingSkeleton } from '@/components/ui';
import { Search, Plus, Eye, Edit2, Trash2, FileText, Download, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Clock } from 'lucide-react';

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
  durationValue: number;
  durationUnit: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface SupplierInfo {
  id: string;
  name: string;
  contactUrl: string | null;
}

interface Order {
  id: string;
  orderCode: string;
  customerId: string;
  customer: Customer;
  createdByUserId: string;
  createdByUser: User;
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
  supplierId?: string | null;
  supplier?: SupplierInfo | null;
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

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  // Advanced Filters
  const [supplierFilter, setSupplierFilter] = useState('');
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [creatorFilter, setCreatorFilter] = useState('');
  const [creators, setCreators] = useState<{ id: string; name: string; role: string }[]>([]);
  const [expiryFilter, setExpiryFilter] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch orders, products, suppliers, and creators in parallel
      const [ordersRes, productsRes, suppliersRes, usersRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/admin/products'),
        fetch('/api/admin/suppliers').catch(() => null),
        fetch('/api/admin/users').catch(() => null)
      ]);

      if (ordersRes.ok && productsRes.ok) {
        const ordersData = await ordersRes.json();
        const productsData = await productsRes.json();
        setOrders(ordersData.orders || []);
        setProducts(productsData.products || []);

        if (suppliersRes && suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(suppliersData.suppliers || []);
        }
        if (usersRes && usersRes.ok) {
          const usersData = await usersRes.json();
          setCreators(usersData.users || []);
        }
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

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Xóa đơn hàng thành công!', 'success');
        setOrders(orders.filter((o) => o.id !== deleteId));
      } else {
        showToast(data.error || 'Lỗi khi xóa đơn hàng.', 'error');
      }
    } catch (error) {
      console.error('Delete order error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

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
    const matchesSupplier = supplierFilter === '' || o.supplierId === supplierFilter;
    const matchesCreator = creatorFilter === '' || o.createdByUserId === creatorFilter;

    // Matches Expiry Filter
    let matchesExpiry = true;
    if (expiryFilter !== '') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;
      const end = new Date(o.endDate).getTime();

      if (expiryFilter === 'active') {
        matchesExpiry = end > now.getTime() && o.status !== 'cancelled' && o.status !== 'refunded';
      } else if (expiryFilter === 'expired') {
        matchesExpiry = end <= now.getTime() || o.status === 'expired';
      } else if (expiryFilter === 'today') {
        matchesExpiry = end >= todayStart && end < todayEnd;
      } else if (expiryFilter === '7_days') {
        const sevenDaysLater = todayStart + 7 * 24 * 60 * 60 * 1000;
        matchesExpiry = end >= now.getTime() && end <= sevenDaysLater;
      } else if (expiryFilter === '3_days') {
        const threeDaysLater = todayStart + 3 * 24 * 60 * 60 * 1000;
        matchesExpiry = end >= now.getTime() && end <= threeDaysLater;
      }
    }

    return matchesSearch && matchesStatus && matchesProduct && matchesSupplier && matchesCreator && matchesExpiry;
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

      // Define CSV headers (including UTF-8 BOM)
      const headers = [
        'Mã Đơn Hàng',
        'Khách Hàng',
        'Số Điện Thoại',
        'Sản Phẩm',
        'Gói Đăng Ký',
        'Người Tạo',
        'Vai Trò Người Tạo',
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
        o.createdByUser?.name || '',
        o.createdByUser?.role || '',
        (o.customPrice !== null && o.customPrice !== undefined) ? o.customPrice : (o.price || 0),
        o.status || '',
        formatDate(o.startDate),
        formatDate(o.endDate),
        formatDateTime(o.createdAt),
      ]);

      const csvContent =
        '\ufeff' + // BOM for UTF-8 Excel support
        [headers.join(','), ...rows.map((row) => row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `bao-cao-don-hang-${new Date().toISOString().substring(0, 10)}.csv`);
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
        title="Quản lý Đơn hàng"
        description="Theo dõi toàn bộ đơn hàng dịch vụ, trạng thái kích hoạt và chu kỳ gia hạn."
      >
        <div className="flex gap-2.5 w-full sm:w-auto shrink-0">
          <Button variant="outline" onClick={exportCSV} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 cursor-pointer">
            <Download className="w-4 h-4" />
            <span>Xuất CSV</span>
          </Button>
          <Link href="/admin/orders/create" className="flex-1 sm:flex-initial">
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
          <div className="space-y-4">
            {/* Row 1: Search, Status, Product */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <Search className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm mã đơn, tên khách, SĐT..."
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
                  <option value="">Tất cả sản phẩm</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Supplier, Creator, Expiry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Tất cả nguồn hàng</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={creatorFilter}
                  onChange={(e) => setCreatorFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Tất cả người tạo</option>
                  {creators.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'admin' ? 'Admin' : u.role === 'collaborator' ? 'CTV' : u.role === 'agency' ? 'Đại lý' : 'Thành viên'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Tất cả thời hạn</option>
                  <option value="active">Đang chạy (còn hạn)</option>
                  <option value="today">Hết hạn trong hôm nay</option>
                  <option value="3_days">{"Sắp hết hạn (<= 3 ngày)"}</option>
                  <option value="7_days">{"Sắp hết hạn (<= 7 ngày)"}</option>
                  <option value="expired">Đã hết hạn</option>
                </select>
              </div>
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
          description="Không có đơn hàng nào khớp với các bộ lọc của bạn hoặc hệ thống chưa có dữ liệu."
          actionLabel="Tạo đơn hàng"
          onAction={() => router.push('/admin/orders/create')}
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
                  <th className="px-6 py-5">Người tạo</th>
                  <SortableHeader label="Chi phí" field="price" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-right" />
                  <SortableHeader label="Thời gian" field="createdAt" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="text-center" />
                  <th className="px-6 py-5 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {sortedOrders.map((o) => {
                  const finalPrice = o.customPrice !== null ? o.customPrice : o.price;
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-5">
                        <div className="text-xs font-bold text-foreground">{o.orderCode}</div>
                        <div className="mt-1.5">
                          <StatusBadge status={o.status} />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{o.customer.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{o.customer.phone}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{o.product.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{o.variant.name}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{o.createdByUser.name}</div>
                        <div className="mt-1">
                          <RoleBadge role={o.createdByUser.role} />
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-sm font-bold text-primary">{formatVND(finalPrice)}</div>
                        {o.customPrice !== null && (
                          <div className="text-[10px] text-amber-500 font-semibold mt-0.5">Sửa thủ công</div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center gap-0.5 text-xs">
                          <span className="text-muted-foreground">Tạo: {formatDate(o.createdAt)}</span>
                          <span className="font-bold text-rose-500">Hạn: {formatDate(o.endDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/admin/orders/${o.id}`}>
                            <button
                              className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                              title="Xem chi tiết & Gia hạn"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          <button
                            onClick={() => setDeleteId(o.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                            title="Xóa đơn hàng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Confirm Delete Dialog */}
      <Dialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa đơn hàng"
        description="Bạn có chắc chắn muốn xóa đơn hàng này? Việc xóa đơn hàng sẽ xóa lịch sử gia hạn và các nhật ký gửi email liên quan. Hành động này không thể hoàn tác."
        confirmText="Xóa đơn hàng"
        isDanger={true}
        isLoading={deleting}
      />
    </div>
  );
}
