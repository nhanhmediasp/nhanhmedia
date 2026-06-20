'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Badge, Card, CardContent, showToast, Dialog, PageHeader, EmptyState, LoadingSkeleton } from '@/components/ui';
import { Edit2, Plus, Trash2, Search, Package, Layers } from 'lucide-react';

interface Price {
  role: string;
  price: number;
}

interface Variant {
  id: string;
  name: string;
  durationValue: number;
  durationUnit: string;
  status: string;
  prices: Price[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  status: string;
  variants: Variant[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products');
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Xóa sản phẩm thành công!', 'success');
        setProducts(products.filter((p) => p.id !== deleteId));
      } else {
        showToast(data.error || 'Lỗi khi xóa sản phẩm.', 'error');
      }
    } catch (error) {
      console.error('Delete product error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Quản lý Sản phẩm"
        description="Quản lý các dịch vụ cung cấp, biến thể gói thời gian và bảng giá phân quyền."
      >
        <Link href="/admin/products/create">
          <Button className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            <span>Thêm sản phẩm</span>
          </Button>
        </Link>
      </PageHeader>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="py-5">
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm theo tên hoặc slug..."
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
          description="Chưa có sản phẩm nào được tạo hoặc không tìm thấy kết quả phù hợp."
          actionLabel={searchTerm ? "Xóa tìm kiếm" : "Thêm sản phẩm"}
          onAction={searchTerm ? () => setSearchTerm('') : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:border-primary/20 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left: Product Info */}
                  <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-start gap-4">
                  {/* Product Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-border bg-muted/40 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-foreground truncate">{product.name}</h2>
                      {product.status === 'active' ? (
                        <Badge variant="success">Hoạt động</Badge>
                      ) : (
                        <Badge variant="danger">Tạm ngưng</Badge>
                      )}
                    </div>
                  </div>
                    <div className="text-xs text-muted-foreground font-mono">Slug: {product.slug}</div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{product.description}</p>
                    )}

                    {/* Variants list inside product */}
                    <div className="pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <span>Các gói dịch vụ ({product.variants.length})</span>
                      </div>
                      
                      {product.variants.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Chưa cấu hình gói dịch vụ nào cho sản phẩm này.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {product.variants.map((v) => {
                            const memberPrice = v.prices.find((p) => p.role === 'member')?.price || 0;
                            const colPrice = v.prices.find((p) => p.role === 'collaborator')?.price || 0;
                            const agencyPrice = v.prices.find((p) => p.role === 'agency')?.price || 0;

                            return (
                              <div key={v.id} className="bg-muted/40 border border-border p-3.5 rounded-xl space-y-2">
                                <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                                  <span className="text-xs font-bold text-foreground truncate">{v.name}</span>
                                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                    {getDurationLabel(v.durationValue, v.durationUnit)}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">Thành viên:</span>
                                    <span className="font-bold text-foreground">{formatVND(memberPrice)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">Cộng tác viên:</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400">{formatVND(colPrice)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">Đại lý:</span>
                                    <span className="font-bold text-primary">{formatVND(agencyPrice)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex lg:flex-col items-center justify-end gap-2.5 shrink-0 self-end lg:self-start">
                    <Link href={`/admin/products/${product.id}/edit`} className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2 cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(product.id)}
                      className="w-full sm:w-auto text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm delete dialog */}
      <Dialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa sản phẩm"
        description="Bạn có chắc chắn muốn xóa sản phẩm này? Mọi biến thể và bảng giá liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
        confirmText="Xóa sản phẩm"
        isDanger={true}
        isLoading={deleting}
      />
    </div>
  );
}
