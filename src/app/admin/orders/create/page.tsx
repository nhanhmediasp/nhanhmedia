'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Textarea, showToast,
} from '@/components/ui';
import {
  ArrowLeft, UserPlus, Users, Search, Sparkles,
  Calendar, DollarSign, CheckCircle2, X, ExternalLink, Package,
} from 'lucide-react';

interface Price  { role: string; price: number; }
interface Variant {
  id: string; name: string;
  durationValue: number; durationUnit: string;
  status: string; prices: Price[];
}
interface Product {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  importPrice?: number;
  supplierName?: string | null;
  supplierLink?: string | null;
  variants: Variant[];
}
interface Customer {
  id: string; name: string; phone: string;
  facebook: string | null; zalo: string | null; email: string | null;
}

function AdminOrderCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('product') || '';
  const initialVariantId = searchParams.get('variant') || '';

  /* ── data ── */
  const [products, setProducts]   = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* ── customer mode ── */
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  /* ── form fields ── */
  const [productId, setProductId]         = useState(initialProductId);
  const [variantId, setVariantId]         = useState(initialVariantId);
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerFacebook, setCustomerFacebook] = useState('');
  const [customerZalo, setCustomerZalo]   = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [startDate, setStartDate]         = useState(new Date().toISOString().substring(0, 10));
  const [note, setNote]                   = useState('');
  const [internalNote, setInternalNote]   = useState('');
  const [customPrice, setCustomPrice]     = useState('');
  const [importPrice, setImportPrice]     = useState('');

  /* ── product search ── */
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [prodRes, custRes] = await Promise.all([
          fetch('/api/admin/products'),
          fetch('/api/customers'),
        ]);
        if (prodRes.ok && custRes.ok) {
          const [prodData, custData] = await Promise.all([prodRes.json(), custRes.json()]);
          setProducts(prodData.products || []);
          setCustomers(custData.customers || []);
          if (!productId && prodData.products.length > 0) setProductId(prodData.products[0].id);
        }
      } catch { showToast('Lỗi tải dữ liệu biểu mẫu.', 'error'); }
      finally { setLoading(false); }
    })();
  }, []);

  /* ── derived ── */
  const activeProduct = useMemo(() => products.find(p => p.id === productId), [products, productId]);

  useEffect(() => {
    if (activeProduct?.variants.length) {
      const exists = activeProduct.variants.some(v => v.id === variantId);
      if (!exists) setVariantId(activeProduct.variants[0].id);
    } else setVariantId('');
  }, [activeProduct, productId]);

  const activeVariant = useMemo(
    () => activeProduct?.variants.find(v => v.id === variantId) ?? null,
    [activeProduct, variantId]
  );

  const defaultPrice = useMemo(() => {
    if (!activeVariant) return 0;
    return activeVariant.prices.find(p => p.role === 'member')?.price ?? 0;
  }, [activeVariant]);

  const displayEndDate = useMemo(() => {
    if (!activeVariant || !startDate) return '';
    const end = new Date(startDate);
    const { durationValue, durationUnit } = activeVariant;
    if (durationUnit === 'day')        end.setDate(end.getDate() + durationValue);
    else if (durationUnit === 'month') end.setMonth(end.getMonth() + durationValue);
    else                               end.setFullYear(end.getFullYear() + durationValue);
    return end.toLocaleDateString('vi-VN');
  }, [activeVariant, startDate]);

  /* ── customer search (existing mode) ── */
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerFacebook(c.facebook || '');
    setCustomerZalo(c.zalo || '');
    setCustomerEmail(c.email || '');
    setShowDropdown(false);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerName(''); setCustomerPhone('');
    setCustomerFacebook(''); setCustomerZalo(''); setCustomerEmail('');
  };

  /* ── autofill (new mode) ── */
  const matchingCustomer = useMemo(() => {
    if (customerMode !== 'new' || customerPhone.length < 8) return null;
    return customers.find(c => c.phone.trim() === customerPhone.trim()) ?? null;
  }, [customers, customerPhone, customerMode]);

  const handleAutofill = () => {
    if (!matchingCustomer) return;
    setCustomerName(matchingCustomer.name);
    setCustomerFacebook(matchingCustomer.facebook || '');
    setCustomerZalo(matchingCustomer.zalo || '');
    setCustomerEmail(matchingCustomer.email || '');
    showToast(`Đã tự động điền: "${matchingCustomer.name}"`, 'info');
  };

  /* ── switch mode ── */
  const switchMode = (mode: 'existing' | 'new') => {
    setCustomerMode(mode);
    clearSelectedCustomer();
    setCustomerName(''); setCustomerPhone('');
    setCustomerFacebook(''); setCustomerZalo(''); setCustomerEmail('');
  };

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !variantId || !customerName || !customerPhone) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId, variantId,
          customerName, customerPhone,
          customerFacebook, customerZalo, customerEmail,
          startDate, note, internalNote,
          customPrice: customPrice ? parseFloat(customPrice) : undefined,
          importPrice: importPrice ? parseFloat(importPrice) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Tạo đơn hàng mới thành công!', 'success');
        router.push('/admin/orders');
        router.refresh();
      } else {
        showToast(data.error || 'Lỗi khi tạo đơn hàng.', 'error');
      }
    } catch { showToast('Lỗi kết nối máy chủ.', 'error'); }
    finally { setSubmitting(false); }
  };

  const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#f3d0f7', borderTopColor: '#a145ab' }} />
        <p className="text-sm font-semibold" style={{ color: '#a1acb8' }}>Đang tải biểu mẫu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="outline" size="sm"
            className="p-2 h-10 w-10 flex items-center justify-center rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#1e293b' }}>
            Tạo Đơn hàng Dịch vụ (Admin)
          </h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: '#a1acb8' }}>
            Tạo mới đơn hàng, điều chỉnh giá thủ công và ghi chú nội bộ.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* ── LEFT ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ─ Customer Card ─ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#f3d0f7,#e9b6f0)', color: '#a145ab' }}>
                  <Users className="w-4 h-4" />
                </span>
                Thông tin Khách hàng
              </CardTitle>

              {/* Mode toggle */}
              <div className="flex items-center rounded-xl overflow-hidden border"
                style={{ borderColor: 'rgba(108,117,147,0.15)' }}>
                <button type="button"
                  onClick={() => switchMode('existing')}
                  className="px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                  style={customerMode === 'existing'
                    ? { background: '#a145ab', color: '#fff' }
                    : { background: '#fff', color: '#697a8d' }}>
                  <span className="flex items-center gap-1.5"><Search className="w-3 h-3" />Chọn có sẵn</span>
                </button>
                <button type="button"
                  onClick={() => switchMode('new')}
                  className="px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                  style={customerMode === 'new'
                    ? { background: '#a145ab', color: '#fff' }
                    : { background: '#fff', color: '#697a8d' }}>
                  <span className="flex items-center gap-1.5"><UserPlus className="w-3 h-3" />Tạo mới</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* ─── EXISTING MODE ─── */}
              {customerMode === 'existing' && (
                <div className="space-y-5">
                  {/* Search box */}
                  <div className="relative">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2"
                      style={{ color: '#697a8d' }}>
                      Tìm khách hàng *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: '#a1acb8' }} />
                      <input
                        type="text"
                        placeholder="Tìm theo tên hoặc số điện thoại..."
                        value={customerSearch}
                        onChange={e => { setCustomerSearch(e.target.value); setShowDropdown(true); setSelectedCustomer(null); }}
                        onFocus={() => setShowDropdown(true)}
                        className="w-full pl-10 pr-4 py-3 text-sm rounded-xl transition-all focus:outline-none"
                        style={{
                          background: '#fff',
                          border: '1.5px solid rgba(108,117,147,0.18)',
                          color: '#1e293b',
                        }}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                      />
                      {selectedCustomer && (
                        <button type="button" onClick={clearSelectedCustomer}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown list */}
                    {showDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 top-full mt-1.5 w-full rounded-xl border overflow-hidden shadow-lg"
                        style={{ background: '#fff', borderColor: 'rgba(108,117,147,0.15)', boxShadow: '0 8px 24px rgba(108,117,147,0.18)' }}>
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => handleSelectCustomer(c)}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[#f7eafa] cursor-pointer"
                            style={{ borderBottom: '1px solid rgba(108,117,147,0.07)' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                              style={{ background: 'linear-gradient(135deg,#f3d0f7,#e9b6f0)', color: '#a145ab' }}>
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold" style={{ color: '#1e293b' }}>{c.name}</div>
                              <div className="text-xs" style={{ color: '#a1acb8' }}>{c.phone}</div>
                            </div>
                            {selectedCustomer?.id === c.id && (
                              <CheckCircle2 className="w-4 h-4 ml-auto" style={{ color: '#a145ab' }} />
                            )}
                          </button>
                        ))}
                        {customers.length === 0 && (
                          <div className="px-4 py-3 text-xs text-slate-400 italic">Không tìm thấy khách hàng.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected customer info card */}
                  {selectedCustomer && (
                    <div className="rounded-xl p-4 space-y-3"
                      style={{ background: 'linear-gradient(135deg,#f7eafa,#f3d0f7)', border: '1px solid rgba(161,69,171,0.15)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base"
                          style={{ background: '#a145ab', color: '#fff' }}>
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm" style={{ color: '#1e293b' }}>{selectedCustomer.name}</div>
                          <div className="text-xs" style={{ color: '#a1acb8' }}>SĐT: {selectedCustomer.phone}</div>
                        </div>
                        <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-lg"
                          style={{ background: '#a145ab', color: '#fff' }}>
                          Đã chọn ✓
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {selectedCustomer.email && (
                          <div className="flex gap-1.5"><span style={{ color: '#a1acb8' }}>Email:</span>
                            <span className="font-semibold truncate" style={{ color: '#1e293b' }}>{selectedCustomer.email}</span></div>
                        )}
                        {selectedCustomer.zalo && (
                          <div className="flex gap-1.5"><span style={{ color: '#a1acb8' }}>Zalo:</span>
                            <span className="font-semibold" style={{ color: '#1e293b' }}>{selectedCustomer.zalo}</span></div>
                        )}
                      </div>
                    </div>
                  )}

                  {!selectedCustomer && !customerSearch && (
                    <p className="text-xs text-center py-2" style={{ color: '#a1acb8' }}>
                      Nhập tên hoặc SĐT để tìm khách hàng có sẵn trong hệ thống.
                    </p>
                  )}
                </div>
              )}

              {/* ─── NEW MODE ─── */}
              {customerMode === 'new' && (
                <div className="space-y-5">
                  <div className="relative">
                    <Input
                      label="Số điện thoại khách hàng *"
                      placeholder="Nhập số điện thoại..."
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      required
                    />
                    {matchingCustomer && (
                      <div className="mt-2 p-3 rounded-xl flex items-center justify-between text-xs animate-fade-in"
                        style={{ background: '#f7eafa', border: '1px solid rgba(161,69,171,0.20)' }}>
                        <div className="flex items-center gap-1.5 font-semibold" style={{ color: '#a145ab' }}>
                          <Sparkles className="w-4 h-4 animate-bounce" />
                          <span>Phát hiện khách cũ: <strong>{matchingCustomer.name}</strong></span>
                        </div>
                        <button type="button" onClick={handleAutofill}
                          className="text-white px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold cursor-pointer"
                          style={{ background: '#a145ab' }}>
                          Dùng thông tin cũ
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input label="Họ tên khách hàng *" placeholder="Ví dụ: Nguyễn Văn A"
                      value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                    <Input label="Link Facebook khách hàng" placeholder="https://facebook.com/user"
                      value={customerFacebook} onChange={e => setCustomerFacebook(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input label="Số điện thoại Zalo" placeholder="Ví dụ: 0977111222"
                      value={customerZalo} onChange={e => setCustomerZalo(e.target.value)} />
                    <Input label="Email khách hàng" type="email" placeholder="customer@gmail.com"
                      value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─ Service Picker Card ─ */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', color: '#16a34a' }}>
                  <DollarSign className="w-4 h-4" />
                </span>
                Chọn Dịch vụ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a1acb8' }} />
                <input
                  type="text"
                  placeholder="Tìm nhanh dịch vụ theo tên..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl focus:outline-none transition-all"
                  style={{
                    background: '#fff',
                    border: '1.5px solid rgba(108,117,147,0.18)',
                    color: '#1e293b',
                  }}
                />
              </div>

              {/* Product cards grid */}
              {products.length === 0 ? (
                <p className="text-sm text-rose-500 italic text-center py-4">Không có dịch vụ nào trong hệ thống.</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#a1acb8' }}>Không tìm thấy dịch vụ khớp với từ khóa.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                  {filteredProducts.map(p => {
                    const isSelected = productId === p.id;
                    // Generate a consistent color from the product name
                    const hue = p.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProductId(p.id)}
                        className="text-left p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-md flex flex-col items-start gap-2"
                        style={isSelected ? {
                          borderColor: '#a145ab',
                          background: 'linear-gradient(135deg,#fdf4ff,#fae8ff)',
                          boxShadow: '0 0 0 3px rgba(161,69,171,0.12)'
                        } : {
                          borderColor: 'rgba(108,117,147,0.15)',
                          background: '#fff'
                        }}
                      >
                        {/* Avatar */}
                        <div className="flex items-center justify-between w-full">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg object-cover shrink-0"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
                              style={{
                                background: isSelected
                                  ? '#a145ab'
                                  : `hsl(${hue},60%,52%)`,
                              }}
                            >
                              {p.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#a145ab' }} />
                          )}
                        </div>
                        {/* Name + count */}
                        <div>
                          <div className="text-xs font-bold leading-tight" style={{ color: isSelected ? '#a145ab' : '#1e293b' }}>
                            {p.name}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: '#a1acb8' }}>
                            {p.variants.filter(v => v.status === 'active').length} gói
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Variant pill selector */}
              {activeProduct && activeProduct.variants.filter(v => v.status === 'active').length > 0 && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'rgba(108,117,147,0.10)' }}>
                  <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#697a8d' }}>
                    Gói đăng ký
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.variants.filter(v => v.status === 'active').map(v => {
                      const mPrice = v.prices.find(p => p.role === 'member')?.price ?? 0;
                      const isVSelected = variantId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVariantId(v.id)}
                          className="px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 cursor-pointer"
                          style={isVSelected ? {
                            borderColor: '#a145ab',
                            background: '#a145ab',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(161,69,171,0.30)'
                          } : {
                            borderColor: 'rgba(108,117,147,0.18)',
                            background: '#fff',
                            color: '#566a7f'
                          }}
                        >
                          <div>{v.name}</div>
                          <div className="font-black mt-0.5" style={{ color: isVSelected ? '#fff' : '#a145ab', fontSize: '11px' }}>
                            {formatVND(mPrice)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* End date preview */}
              {activeVariant && displayEndDate && (
                <div className="p-3 rounded-xl text-xs space-y-1 border flex items-center justify-between"
                  style={{ background: '#f0fdf4', borderColor: 'rgba(22,163,74,0.15)' }}>
                  <div className="flex items-center gap-1.5 font-semibold" style={{ color: '#15803d' }}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Dự kiến hết hạn:</span>
                  </div>
                  <span className="text-rose-500 font-extrabold">{displayEndDate}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─ Notes Card ─ */}
          <Card>
            <CardHeader>
              <CardTitle>Ghi chú đơn hàng &amp; Ghi chú Nội bộ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Textarea label="Ghi chú đơn hàng (Khách có thể xem)"
                placeholder="Nhập nội dung ghi chú đơn hàng..."
                value={note} onChange={e => setNote(e.target.value)} rows={3} />
              <Textarea label="Ghi chú nội bộ (Chỉ quản trị viên xem)"
                placeholder="Nhập ghi chú kỹ thuật, trạng thái thanh toán nội bộ..."
                value={internalNote} onChange={e => setInternalNote(e.target.value)} rows={3} />
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', color: '#16a34a' }}>
                  <DollarSign className="w-4 h-4" />
                </span>
                Cài đặt Thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input label="Ngày bắt đầu dịch vụ *" type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)} required />

               <div className="pt-1">
                <Input label="Điều chỉnh giá thủ công (VND)" type="number" min="0"
                  placeholder="Bỏ trống để dùng giá gốc"
                  value={customPrice} onChange={e => setCustomPrice(e.target.value)}
                  leftIcon={<DollarSign className="w-4 h-4" />} />
                <p className="text-[10px] mt-1 leading-normal" style={{ color: '#a1acb8' }}>
                  Chỉ Admin được phép điều chỉnh giá đơn hàng.
                </p>
              </div>

              <div className="pt-1">
                <Input label="Giá nhập gốc (VND)" type="number" min="0"
                  placeholder="Bỏ trống để tính lợi nhuận sau"
                  value={importPrice} onChange={e => setImportPrice(e.target.value)}
                  leftIcon={<DollarSign className="w-4 h-4" />} />
                <p className="text-[10px] mt-1 leading-normal" style={{ color: '#a1acb8' }}>
                  Chỉ Admin mới thấy và sửa giá nhập gốc này. Dùng để tính lợi nhuận.
                </p>
              </div>

              {/* Supplier info from product (read-only tag) */}
              {activeProduct && (activeProduct.supplierName || activeProduct.supplierLink) && (
                <div className="pt-1">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#697a8d' }}>
                    Nguồn hàng sản phẩm
                  </label>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl border" style={{ background: '#f8f0ff', borderColor: 'rgba(161,69,171,0.2)' }}>
                    <Package className="w-4 h-4 shrink-0" style={{ color: '#a145ab' }} />
                    <div className="min-w-0 flex-1">
                      {activeProduct.supplierName && (
                        <div className="text-xs font-bold" style={{ color: '#1e293b' }}>{activeProduct.supplierName}</div>
                      )}
                      {activeProduct.supplierLink && (
                        <a href={activeProduct.supplierLink} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] flex items-center gap-1 mt-0.5 hover:underline"
                          style={{ color: '#a145ab' }}>
                          <ExternalLink className="w-3 h-3" />
                          Liên hệ nguồn hàng
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeVariant && (
                <div className="p-4 rounded-xl space-y-2"
                  style={{ background: '#f7eafa', border: '1px solid rgba(161,69,171,0.25)' }}>
                  <div className="flex justify-between items-center text-xs font-semibold" style={{ color: '#697a8d' }}>
                    <span>Giá gốc hệ thống:</span>
                    <span>{formatVND(defaultPrice)}</span>
                  </div>
                  {customPrice && (
                    <div className="flex justify-between items-center text-xs font-semibold text-amber-600">
                      <span>Giá sửa đổi:</span>
                      <span>{formatVND(parseFloat(customPrice) || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-extrabold border-t pt-2"
                     style={{ borderColor: 'rgba(161,69,171,0.20)', color: '#a145ab' }}>
                    <span>Tổng thanh toán:</span>
                    <span className="text-lg font-black">
                      {formatVND(customPrice ? parseFloat(customPrice) || 0 : defaultPrice)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t flex flex-col gap-2.5" style={{ borderColor: 'rgba(108,117,147,0.12)' }}>
                <Button type="submit" variant="primary" className="w-full font-bold py-3 rounded-xl"
                  loading={submitting}>
                  Tạo đơn hàng
                </Button>
                <Link href="/admin/orders" className="w-full">
                  <Button type="button" variant="outline" className="w-full py-3 rounded-xl">
                    Hủy bỏ
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}



export default function AdminOrderCreatePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#f3d0f7', borderTopColor: '#a145ab' }} />
        <p className="text-sm font-semibold" style={{ color: '#a1acb8' }}>Đang tải...</p>
      </div>
    }>
      <AdminOrderCreateForm />
    </Suspense>
  );
}
