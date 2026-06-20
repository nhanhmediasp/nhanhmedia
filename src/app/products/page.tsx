'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, showToast, Badge, Button, PageHeader, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/components/AuthContext';
import { Package, Search, ShoppingCart, HelpCircle, Layers } from 'lucide-react';

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
  description: string;
  imageUrl: string;
  variants: Variant[];
}

export default function UserProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        } else {
          showToast('Không thể tải danh sách sản phẩm.', 'error');
        }
      } catch (error) {
        console.error('Fetch products error:', error);
        showToast('Lỗi kết nối máy chủ.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getDurationLabel = (val: number, unit: string) => {
    const unitsMap: { [key: string]: string } = {
      day: 'ngày',
      month: 'tháng',
      year: 'năm',
    };
    return `${val} ${unitsMap[unit] || unit}`;
  };

  const handleOrderCreate = (productId: string, variantId: string) => {
    router.push(`/orders/create?product=${productId}&variant=${variantId}`);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Danh sách Dịch vụ & Bảng giá"
        description="Bảng giá dịch vụ đã được tối ưu hóa cho tài khoản của bạn. Hãy chọn gói phù hợp để tạo nhanh đơn hàng."
      />

      {/* Filter and search */}
      <Card>
        <CardContent className="py-5">
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm dịch vụ theo tên hoặc mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-foreground placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-ring transition-all duration-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading ? (
        <LoadingSkeleton variant="card" />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title="Không tìm thấy sản phẩm nào"
          description="Hiện tại không có dịch vụ nào đang được cung cấp hoặc từ khóa tìm kiếm không khớp."
          actionLabel={searchTerm ? "Xóa tìm kiếm" : undefined}
          onAction={searchTerm ? () => setSearchTerm('') : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:border-primary/20 transition-all duration-200 flex flex-col h-full">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border bg-muted/40 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-bold text-foreground truncate">{product.name}</CardTitle>
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Mã: {product.slug}</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-5">
                {product.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{product.description}</p>
                )}

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>Các gói thời hạn đăng ký</span>
                  </div>

                  {product.variants.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Không có gói thời gian nào đang được mở bán.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {product.variants.map((v) => (
                        <div
                          key={v.id}
                          className="bg-muted/40 border border-border p-3.5 rounded-xl flex flex-col justify-between gap-3 hover:bg-muted/65 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-foreground truncate">{v.name}</div>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                {getDurationLabel(v.durationValue, v.durationUnit)}
                              </span>
                            </div>
                            <span className="text-xs font-extrabold text-primary shrink-0">
                              {formatVND(v.price)}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            className="w-full flex items-center justify-center gap-1 text-[11px] font-bold rounded-lg cursor-pointer"
                            onClick={() => handleOrderCreate(product.id, v.id)}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Tạo đơn ngay</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
