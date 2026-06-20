'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Textarea, showToast } from '@/components/ui';
import { ArrowLeft, UserPlus, Sparkles, Calendar, Search, Users, X, CheckCircle2 } from 'lucide-react';

interface Variant {
  id: string;
  name: string;
  durationValue: number;
  durationUnit: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  variants: Variant[];
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  facebook: string | null;
  zalo: string | null;
  email: string | null;
}

function OrderCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('product') || '';
  const initialVariantId = searchParams.get('variant') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer mode states
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Form state
  const [productId, setProductId] = useState(initialProductId);
  const [variantId, setVariantId] = useState(initialVariantId);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerFacebook, setCustomerFacebook] = useState('');
  const [customerZalo, setCustomerZalo] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [note, setNote] = useState('');

  // Product search
  const [productSearch, setProductSearch] = useState('');

  // Fetch products and customers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodRes = await fetch('/api/products');
        const custRes = await fetch('/api/customers');

        if (prodRes.ok && custRes.ok) {
          const prodData = await prodRes.json();
          const custData = await custRes.json();
          setProducts(prodData.products || []);
          setCustomers(custData.customers || []);
          
          // Set initial product if not explicitly set but products are loaded
          if (!productId && prodData.products.length > 0) {
            setProductId(prodData.products[0].id);
          }
        }
      } catch (error) {
        console.error('Fetch order form data error:', error);
        showToast('Lỗi tải thông tin biểu mẫu.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update selected variant when product changes
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === productId);
  }, [products, productId]);

  useEffect(() => {
    if (activeProduct && activeProduct.variants.length > 0) {
      // If the current variant is not in the active product's variants, select the first variant
      const exists = activeProduct.variants.some((v) => v.id === variantId);
      if (!exists) {
        setVariantId(activeProduct.variants[0].id);
      }
    } else {
      setVariantId('');
    }
  }, [activeProduct, productId]);

  const activeVariant = useMemo(() => {
    if (!activeProduct) return null;
    return activeProduct.variants.find((v) => v.id === variantId) || null;
  }, [activeProduct, variantId]);

  // Customer helpers
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

  const switchMode = (mode: 'existing' | 'new') => {
    setCustomerMode(mode);
    clearSelectedCustomer();
  };

  // Lookup matching customer as they type phone number in new mode
  const matchingCustomer = useMemo(() => {
    if (customerMode !== 'new' || customerPhone.length < 8) return null;
    return customers.find((c) => c.phone.trim() === customerPhone.trim()) || null;
  }, [customers, customerPhone, customerMode]);

  // Autofill old customer info
  const handleAutofillCustomer = () => {
    if (!matchingCustomer) return;
    setCustomerName(matchingCustomer.name);
    setCustomerFacebook(matchingCustomer.facebook || '');
    setCustomerZalo(matchingCustomer.zalo || '');
    setCustomerEmail(matchingCustomer.email || '');
    showToast(`Đã tự động điền thông tin khách hàng "${matchingCustomer.name}"`, 'info');
  };

  // Automatically calculate end date to display on UI
  const displayEndDate = useMemo(() => {
    if (!activeVariant || !startDate) return '';
    const start = new Date(startDate);
    const end = new Date(start);
    const { durationValue, durationUnit } = activeVariant;

    switch (durationUnit.toLowerCase()) {
      case 'day':
        end.setDate(start.getDate() + durationValue);
        break;
      case 'month':
        end.setMonth(start.getMonth() + durationValue);
        break;
      case 'year':
        end.setFullYear(start.getFullYear() + durationValue);
        break;
      default:
        end.setMonth(start.getMonth() + durationValue);
    }
    return end.toLocaleDateString('vi-VN');
  }, [activeVariant, startDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !variantId || !customerName || !customerPhone) {
      showToast('Vui lòng điền đầy đủ các trường thông tin bắt buộc.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId,
          customerName,
          customerPhone,
          customerFacebook,
          customerZalo,
          customerEmail,
          startDate,
          note,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast('Đơn hàng dịch vụ mới đã được tạo thành công!', 'success');
        router.push('/orders');
        router.refresh();
      } else {
        showToast(data.error || 'Lỗi khi tạo đơn hàng.', 'error');
      }
    } catch (error) {
      console.error('Submit order error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Đang tải biểu mẫu tạo đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-5 mb-6 md:mb-8">
        <Link href="/orders">
          <Button variant="outline" size="sm" className="p-2 h-10 w-10 flex items-center justify-center rounded-xl bg-card border-border hover:bg-[#f5f5f9] text-slate-600">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tạo Đơn hàng Mới</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Nhập thông tin khách hàng và lựa chọn gói dịch vụ kích hoạt.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product & Customer detail forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Customer details */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-5">
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
                        <button type="button" onClick={handleAutofillCustomer}
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

          {/* Section 2: Service Picker */}
          <Card>
            <CardHeader className="py-5">
              <CardTitle className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#dcfce7,#bbf7d0)', color: '#16a34a' }}>
                  <Calendar className="w-4 h-4" />
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
                <p className="text-sm text-rose-500 italic text-center py-4">Hiện tại không có dịch vụ nào hoạt động.</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#a1acb8' }}>Không tìm thấy dịch vụ khớp.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                  {filteredProducts.map(p => {
                    const isSelected = productId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProductId(p.id)}
                        className="text-left p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-md"
                        style={isSelected ? {
                          borderColor: '#a145ab',
                          background: 'linear-gradient(135deg,#fdf4ff,#fae8ff)',
                          boxShadow: '0 0 0 3px rgba(161,69,171,0.12)'
                        } : {
                          borderColor: 'rgba(108,117,147,0.15)',
                          background: '#fff'
                        }}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="text-xs font-bold leading-tight" style={{ color: isSelected ? '#a145ab' : '#1e293b' }}>
                            {p.name}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#a145ab' }} />}
                        </div>
                        <div className="text-[10px]" style={{ color: '#a1acb8' }}>
                          {p.variants.length} gói
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Variant pill selector */}
              {activeProduct && activeProduct.variants.length > 0 && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'rgba(108,117,147,0.10)' }}>
                  <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: '#697a8d' }}>
                    Gói thời hạn đăng ký
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.variants.map(v => {
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
                            {formatVND(v.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* End date preview */}
              {activeVariant && displayEndDate && (
                <div className="p-3 rounded-xl text-xs border flex items-center justify-between"
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

          {/* Section 3: Order notes */}
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Ghi chú đơn hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt về đơn hàng (khách hàng có thể xem)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Date & Billing */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-5">
              <CardTitle>Ngày bắt đầu &amp; Hóa đơn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="relative pt-1">
                <Input
                  label="Ngày bắt đầu dịch vụ *"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              {/* Bill Details */}
              {activeVariant && (
                <div className="p-4 bg-[#f7eafa] border border-[#a145ab]/30 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                    <span>Giá gói dịch vụ:</span>
                    <span>{formatVND(activeVariant.price)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-extrabold border-t border-[#a145ab]/20 pt-2 text-[#a145ab]">
                    <span>Tổng tiền thanh toán:</span>
                    <span className="text-lg font-black">{formatVND(activeVariant.price)}</span>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border flex flex-col gap-2">
                <Button type="submit" variant="primary" className="w-full font-bold py-2.5 rounded-xl" loading={submitting}>
                  Tạo đơn hàng
                </Button>
                <Link href="/orders" className="w-full">
                  <Button type="button" variant="outline" className="w-full py-2.5 rounded-xl">
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

export default function UserOrderCreatePage() {
  return (
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-semibold">Đang tải biểu mẫu tạo đơn hàng...</p>
      </div>
    }>
      <OrderCreateForm />
    </React.Suspense>
  );
}
