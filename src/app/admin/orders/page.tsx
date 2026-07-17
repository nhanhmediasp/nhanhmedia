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
  amountPaid: number;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  supplierId?: string | null;
  supplier?: SupplierInfo | null;
  importPrice?: number | null;
  note?: string | null;
  internalNote?: string | null;
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
  const isCenter = className?.includes('text-center');
  const isRight = className?.includes('text-right');
  return (
    <th
      className={`px-4 py-4 cursor-pointer select-none hover:text-primary transition-colors group ${className || ''}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1.5 ${isCenter ? 'justify-center' : isRight ? 'justify-end' : ''}`}>
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

function getStatusTagStyles(status: string, isSelected: boolean) {
  if (!isSelected) {
    return 'bg-slate-50 border-border text-slate-500 hover:bg-slate-100 dark:bg-zinc-900/30 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50';
  }
  switch (status) {
    case 'new':
      return 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 font-bold shadow-[0_2px_8px_rgba(59,130,246,0.15)]';
    case 'processing':
      return 'bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 font-bold shadow-[0_2px_8px_rgba(245,158,11,0.15)]';
    case 'running':
      return 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold shadow-[0_2px_8px_rgba(16,185,129,0.15)]';
    case 'expired_soon':
      return 'bg-yellow-50 border-yellow-500 text-yellow-600 dark:bg-yellow-950/20 dark:text-yellow-400 font-bold shadow-[0_2px_8px_rgba(202,138,4,0.15)]';
    case 'expired':
      return 'bg-slate-100 border-slate-500 text-slate-700 dark:bg-zinc-800 dark:border-zinc-500 dark:text-zinc-300 font-bold shadow-[0_2px_8px_rgba(100,116,139,0.15)]';
    case 'cancelled':
      return 'bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 font-bold shadow-[0_2px_8px_rgba(244,63,94,0.15)]';
    case 'refunded':
      return 'bg-[#a145ab]/10 border-[#a145ab] text-[#a145ab] dark:bg-[#a145ab]/20 dark:text-[#f3d0f7] font-bold shadow-[0_2px_8px_rgba(161,69,171,0.15)]';
    default:
      return 'bg-[#a145ab]/10 border-[#a145ab] text-[#a145ab] font-bold';
  }
}

function getSupplierTagStyles(isSelected: boolean, index: number) {
  if (!isSelected) {
    return 'bg-slate-50 border-border text-slate-500 hover:bg-slate-100 dark:bg-zinc-900/30 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50';
  }
  const colors = [
    'bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 font-bold shadow-[0_2px_8px_rgba(99,102,241,0.15)]',
    'bg-pink-50 border-pink-500 text-pink-600 dark:bg-pink-950/20 dark:text-pink-400 font-bold shadow-[0_2px_8px_rgba(236,72,153,0.15)]',
    'bg-cyan-50 border-cyan-500 text-cyan-600 dark:bg-cyan-950/20 dark:text-cyan-400 font-bold shadow-[0_2px_8px_rgba(6,182,212,0.15)]',
    'bg-teal-50 border-teal-500 text-teal-600 dark:bg-teal-950/20 dark:text-teal-400 font-bold shadow-[0_2px_8px_rgba(20,184,166,0.15)]',
    'bg-violet-50 border-violet-500 text-violet-600 dark:bg-violet-950/20 dark:text-violet-400 font-bold shadow-[0_2px_8px_rgba(139,92,246,0.15)]',
  ];
  return colors[index % colors.length];
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
  const [expiryFilter, setExpiryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<SortField | null>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Quick Edit Modal State
  const [quickEditOrder, setQuickEditOrder] = useState<Order | null>(null);
  const [quickStatus, setQuickStatus] = useState('');
  const [quickAmountPaid, setQuickAmountPaid] = useState('');
  const [quickCustomPrice, setQuickCustomPrice] = useState('');
  const [quickImportPrice, setQuickImportPrice] = useState('');
  const [quickSupplierId, setQuickSupplierId] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickInternalNote, setQuickInternalNote] = useState('');
  const [quickStartDate, setQuickStartDate] = useState('');
  const [quickEndDate, setQuickEndDate] = useState('');
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);

  // Bulk Action States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkAmountPaid, setBulkAmountPaid] = useState('');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedOrders.map(o => o.id);
      setSelectedIds(prev => {
        const otherIds = prev.filter(id => !pageIds.includes(id));
        return [...otherIds, ...pageIds];
      });
    } else {
      const pageIds = paginatedOrders.map(o => o.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        showToast(`Đã xóa thành công ${selectedIds.length} đơn hàng!`, 'success');
        setSelectedIds([]);
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Có lỗi xảy ra khi xóa hàng loạt.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setBulkActionLoading(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleBulkUpdateStatus = async (status: string) => {
    if (selectedIds.length === 0 || !status) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      });

      if (res.ok) {
        showToast(`Đã cập nhật trạng thái cho ${selectedIds.length} đơn hàng thành công!`, 'success');
        setSelectedIds([]);
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Có lỗi xảy ra khi cập nhật hàng loạt.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdatePaymentPercentage = async (percentage: number) => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, paymentPercentage: percentage }),
      });

      if (res.ok) {
        showToast(`Đã cập nhật mức thanh toán ${percentage * 100}% cho ${selectedIds.length} đơn hàng thành công!`, 'success');
        setSelectedIds([]);
        fetchData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Có lỗi xảy ra khi cập nhật hàng loạt.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const topSuppliers = React.useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.supplierId) {
        counts[o.supplierId] = (counts[o.supplierId] || 0) + 1;
      }
    });
    return [...suppliers]
      .map(s => ({ ...s, count: counts[s.id] || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders, suppliers]);

  const handleOpenQuickEdit = (order: Order) => {
    setQuickEditOrder(order);
    setQuickStatus(order.status);
    setQuickAmountPaid(String(order.amountPaid ?? 0));
    setQuickCustomPrice(order.customPrice !== null ? String(order.customPrice) : '');
    setQuickImportPrice(order.importPrice !== null ? String(order.importPrice) : '');
    setQuickSupplierId(order.supplierId || '');
    setQuickNote(order.note || '');
    setQuickInternalNote(order.internalNote || '');
    setQuickStartDate(order.startDate ? new Date(order.startDate).toISOString().substring(0, 10) : '');
    setQuickEndDate(order.endDate ? new Date(order.endDate).toISOString().substring(0, 10) : '');
  };

  const handleSaveQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditOrder) return;
    setSavingQuickEdit(true);
    try {
      const res = await fetch(`/api/orders/${quickEditOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: quickStatus,
          amountPaid: quickAmountPaid === '' ? 0 : parseFloat(quickAmountPaid),
          customPrice: quickCustomPrice === '' ? null : parseFloat(quickCustomPrice),
          importPrice: quickImportPrice === '' ? null : parseFloat(quickImportPrice),
          supplierId: quickSupplierId || null,
          note: quickNote,
          internalNote: quickInternalNote,
          startDate: quickStartDate || undefined,
          endDate: quickEndDate || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Sửa nhanh đơn hàng thành công!', 'success');
        setOrders(prev => prev.map(o => o.id === quickEditOrder.id ? { 
          ...o, 
          status: data.order.status,
          amountPaid: data.order.amountPaid,
          customPrice: data.order.customPrice,
          importPrice: data.order.importPrice,
          supplierId: data.order.supplierId,
          supplier: data.order.supplier,
          note: data.order.note,
          internalNote: data.order.internalNote,
          startDate: data.order.startDate,
          endDate: data.order.endDate,
        } : o));
        setQuickEditOrder(null);
      } else {
        showToast(data.error || 'Cập nhật thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSavingQuickEdit(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch orders, products, and suppliers in parallel
      const [ordersRes, productsRes, suppliersRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/admin/products'),
        fetch('/api/admin/suppliers').catch(() => null)
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
      setSortDirection(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const isFiltered = searchTerm !== '' || statusFilter !== '' || productFilter !== '' || supplierFilter !== '' || expiryFilter !== '' || paymentFilter !== '';

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setProductFilter('');
    setSupplierFilter('');
    setExpiryFilter('');
    setPaymentFilter('');
    showToast('Đã xóa tất cả bộ lọc', 'info');
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer.phone || '').includes(searchTerm);

    const matchesStatus = statusFilter === '' || o.status === statusFilter;
    const matchesProduct = productFilter === '' || o.productId === productFilter;
    const matchesSupplier = supplierFilter === '' || o.supplierId === supplierFilter;

    const finalPrice = o.customPrice !== null ? o.customPrice : o.price;
    const isPaid = (o.amountPaid ?? 0) >= finalPrice;
    const matchesPayment = paymentFilter === '' || 
      (paymentFilter === 'paid' && isPaid) || 
      (paymentFilter === 'unpaid' && !isPaid);

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

    return matchesSearch && matchesStatus && matchesProduct && matchesSupplier && matchesExpiry && matchesPayment;
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
      case 'startDate': {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return (dateA - dateB) * dir;
      }
      case 'endDate': {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        return (dateA - dateB) * dir;
      }
      case 'createdAt': {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (dateA - dateB) * dir;
      }
      default:
        return 0;
    }
  });

  // Paginate orders
  const totalPages = Math.ceil(sortedOrders.length / PAGE_SIZE);
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, productFilter, supplierFilter, expiryFilter, paymentFilter, sortField, sortDirection]);

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
        ({
          new: 'Mới tạo',
          processing: 'Đang xử lý',
          running: 'Đang chạy',
          expired_soon: 'Sắp hết hạn',
          expired: 'Đã hết hạn',
          cancelled: 'Đã hủy',
          refunded: 'Đã bảo hành'
        }[o.status?.toLowerCase()] || o.status || ''),
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
            {/* Row 1: Search, Status, Product, Payment */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              <div>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Tất cả thanh toán</option>
                  <option value="paid">Đã thanh toán đủ</option>
                  <option value="unpaid">Chưa thanh toán đủ</option>
                </select>
              </div>
            </div>

            {/* Row 2: Supplier, Expiry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
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
            {isFiltered && (
              <div className="flex justify-end pt-3 border-t border-dashed border-border/60">
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="text-xs py-1.5 h-8 text-rose-500 hover:text-rose-600 border-rose-200 hover:bg-rose-50/50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa bộ lọc</span>
                </Button>
              </div>
            )}
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
                  <th className="px-4 py-4 w-[48px] text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedOrders.length > 0 &&
                        paginatedOrders.every((o) => selectedIds.includes(o.id))
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#a145ab] focus:ring-[#a145ab] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-4 w-[60px] text-center text-muted-foreground font-semibold">STT</th>
                  <SortableHeader label="Mã đơn" field="orderCode" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="px-4 w-[140px]" />
                  <SortableHeader label="Khách hàng" field="customerName" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="px-4 w-[180px]" />
                  <th className="px-4 py-4 w-[200px]">Dịch vụ</th>
                  <SortableHeader label="Chi phí" field="price" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="px-4 w-[180px] text-right" />
                  <SortableHeader label="Thời gian" field="createdAt" currentField={sortField} currentDirection={sortDirection} onSort={handleSort} className="px-4 w-[150px] text-center" />
                  <th className="px-4 py-4 w-[110px] text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {paginatedOrders.map((o, idx) => {
                  const finalPrice = o.customPrice !== null ? o.customPrice : o.price;
                  return (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(o.id)}
                          onChange={() => handleSelectRow(o.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#a145ab] focus:ring-[#a145ab] cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 text-center text-xs font-semibold text-slate-400">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-4 w-[140px] max-w-[140px]">
                        <div className="text-xs font-bold text-foreground break-all">{o.orderCode}</div>
                        <div className="mt-1.5">
                          <StatusBadge status={o.status} />
                        </div>
                      </td>
                      <td className="px-4 py-4 w-[180px] max-w-[180px]">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={o.customer.name}>{o.customer.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{o.customer.phone}</div>
                      </td>
                      <td className="px-4 py-4 w-[200px] max-w-[200px]">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={o.product.name}>{o.product.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate" title={o.variant.name}>{o.variant.name}</div>
                      </td>
                      <td className="px-4 py-4 w-[180px] text-right font-medium">
                        <div className="flex flex-col gap-0.5 text-xs text-right font-medium">
                          <div className="text-slate-650 dark:text-slate-355">
                            Giá: <span className="font-bold text-foreground">{formatVND(finalPrice)}</span>
                            {o.customPrice !== null && (
                              <span className="text-[9px] text-amber-500 font-bold ml-0.5" title="Sửa thủ công">(*)</span>
                            )}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            Chi phí: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatVND(o.importPrice ?? 0)}</span>
                          </div>
                          <div className={`font-bold ${finalPrice - (o.importPrice ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            Lợi nhuận: {formatVND(finalPrice - (o.importPrice ?? 0))}
                          </div>
                          <div className="mt-1">
                            {(o.amountPaid ?? 0) >= finalPrice ? (
                              <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded">
                                Đã trả đủ
                              </span>
                            ) : (o.amountPaid ?? 0) > 0 ? (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded" title={`Đã trả: ${formatVND(o.amountPaid)}`}>
                                Còn nợ: {formatVND(finalPrice - o.amountPaid)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">
                                Nợ 100%
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 w-[150px] text-center">
                        <div className="flex flex-col items-center gap-0.5 text-xs">
                          <span className="text-muted-foreground">Tạo: {formatDate(o.createdAt)}</span>
                          <span className="font-bold text-rose-500">Hạn: {formatDate(o.endDate)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 w-[110px] text-center">
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
        </Card>
      )}

      {/* Thanh hành động hàng loạt */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-slide-up border border-slate-800">
          <div className="flex items-center gap-2 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-bold">Đã chọn {selectedIds.length} đơn hàng</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-3">
            {/* Status change select */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Trạng thái:</span>
              <select
                disabled={bulkActionLoading}
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkUpdateStatus(e.target.value);
                    e.target.value = ''; // Reset select
                  }
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Chọn --</option>
                {statuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Bulk Payment edit */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Nhận tiền:</span>
              <select
                disabled={bulkActionLoading}
                onChange={(e) => {
                  if (e.target.value !== '') {
                    handleBulkUpdatePaymentPercentage(parseFloat(e.target.value));
                    e.target.value = ''; // Reset select
                  }
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary cursor-pointer disabled:opacity-50"
              >
                <option value="">-- Chọn % --</option>
                <option value="1">THANH TOÁN 100%</option>
                <option value="0.5">THANH TOÁN 50%</option>
                <option value="0.25">THANH TOÁN 25%</option>
                <option value="0">CHƯA THANH TOÁN</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={bulkActionLoading}
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="h-8 text-rose-400 border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-300 font-bold text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Xóa hàng loạt
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={bulkActionLoading}
              onClick={() => setSelectedIds([])}
              className="h-8 text-slate-300 border-slate-700 hover:bg-slate-800 text-xs"
            >
              Hủy chọn
            </Button>
          </div>
        </div>
      )}

      {/* Hộp thoại xác nhận xóa hàng loạt */}
      <Dialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Xác nhận xóa hàng loạt"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.length} đơn hàng đã chọn? Hành động này không thể hoàn tác.`}
        confirmText="Có, xóa ngay"
        cancelText="Hủy bỏ"
        isDanger={true}
        isLoading={bulkActionLoading}
      />

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

      {/* Quick Edit Order Modal */}
      {quickEditOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent">
          <div 
            className="fixed inset-0 bg-slate-900/10 pointer-events-none" 
            style={{ zIndex: -1 }} 
          />
          <div 
            className="w-full max-w-lg rounded-2xl overflow-hidden bg-card border border-border shadow-2xl animate-scale-in"
            style={{ 
              boxShadow: '0 25px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.05)',
              background: 'var(--card, #fff)'
            }}
          >
            <form onSubmit={handleSaveQuickEdit}>
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Sửa nhanh đơn hàng: <span className="text-primary">{quickEditOrder.orderCode}</span></h3>
                <button type="button" onClick={() => setQuickEditOrder(null)} className="text-muted-foreground hover:text-foreground text-lg cursor-pointer">×</button>
              </div>
              <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Status and Supplier */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trạng thái dịch vụ</label>
                    <div className="flex flex-wrap gap-1.5">
                      {statuses.map((s) => {
                        const isSelected = quickStatus === s.value;
                        return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setQuickStatus(s.value)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all duration-200 cursor-pointer ${getStatusTagStyles(s.value, isSelected)}`}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nguồn hàng</label>
                      <select
                        value={quickSupplierId}
                        onChange={(e) => setQuickSupplierId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
                      >
                        <option value="">Không chọn nguồn hàng</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      {topSuppliers.length > 0 && (
                        <div className="h-full flex flex-col justify-end pb-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Gợi ý nhanh:</span>
                          <div className="flex flex-wrap gap-1">
                            {topSuppliers.map((s, index) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setQuickSupplierId(s.id)}
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all duration-200 cursor-pointer ${getSupplierTagStyles(quickSupplierId === s.id, index)}`}
                              >
                                {s.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Giá tùy chỉnh (VND)</label>
                    <input
                      type="number"
                      value={quickCustomPrice}
                      onChange={(e) => setQuickCustomPrice(e.target.value)}
                      placeholder="Mặc định"
                      className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Giá nhập gốc (VND)</label>
                    <input
                      type="number"
                      value={quickImportPrice}
                      onChange={(e) => setQuickImportPrice(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Đã trả (VND)</label>
                    <input
                      type="number"
                      value={quickAmountPaid}
                      onChange={(e) => setQuickAmountPaid(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={quickStartDate}
                      onChange={(e) => setQuickStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ngày hết hạn</label>
                    <input
                      type="date"
                      value={quickEndDate}
                      onChange={(e) => setQuickEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ghi chú khách hàng</label>
                  <textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring resize-y"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ghi chú nội bộ</label>
                  <textarea
                    value={quickInternalNote}
                    onChange={(e) => setQuickInternalNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-input border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring resize-y"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted/20">
                <Button variant="outline" size="sm" type="button" onClick={() => setQuickEditOrder(null)}>Hủy</Button>
                <Button variant="primary" size="sm" type="submit" loading={savingQuickEdit}>Lưu thay đổi</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
