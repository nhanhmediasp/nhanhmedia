'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Select, Textarea, Card, CardHeader, CardTitle, CardContent, showToast } from '@/components/ui';
import { Plus, Trash2, ArrowLeft, Layers, HelpCircle, ImagePlus, X } from 'lucide-react';

interface VariantForm {
  name: string;
  durationValue: number;
  durationUnit: string;
  status: string;
  prices: {
    member: string;
    collaborator: string;
    agency: string;
  };
}

export default function AdminProductCreatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importPrice, setImportPrice] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierLink, setSupplierLink] = useState('');

  // Dynamic variants state
  const [variants, setVariants] = useState<VariantForm[]>([
    {
      name: 'Gói 1 tháng',
      durationValue: 1,
      durationUnit: 'month',
      status: 'active',
      prices: { member: '', collaborator: '', agency: '' },
    },
  ]);

  // Generate slug automatically from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    
    // Simple Vietnamese slugify
    let slugified = val.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/([^0-9a-z-\s])/g, '')
      .replace(/(\s+)/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
      
    setSlug(slugified);
  };

  const handleAddVariant = () => {
    setVariants([
      ...variants,
      {
        name: '',
        durationValue: 1,
        durationUnit: 'month',
        status: 'active',
        prices: { member: '', collaborator: '', agency: '' },
      },
    ]);
  };

  const handleRemoveVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleVariantChange = (idx: number, field: keyof VariantForm, value: any) => {
    const updated = [...variants];
    updated[idx] = {
      ...updated[idx],
      [field]: value,
    };
    setVariants(updated);
  };

  const handlePriceChange = (idx: number, role: 'member' | 'collaborator' | 'agency', value: string) => {
    const updated = [...variants];
    updated[idx] = {
      ...updated[idx],
      prices: {
        ...updated[idx].prices,
        [role]: value,
      },
    };
    setVariants(updated);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setImageUrl(data.imageUrl);
        showToast('Upload ảnh thành công!', 'success');
      } else {
        showToast(data.error || 'Lỗi upload ảnh.', 'error');
        setImagePreview('');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Lỗi kết nối khi upload.', 'error');
      setImagePreview('');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      showToast('Tên sản phẩm và slug là bắt buộc.', 'error');
      return;
    }

    // Verify variants has at least 1 item
    if (variants.length === 0) {
      showToast('Vui lòng thêm ít nhất một gói dịch vụ (biến thể).', 'error');
      return;
    }

    // Validate variants names & prices
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.name) {
        showToast(`Gói thứ ${i + 1} chưa có tên gọi.`, 'error');
        return;
      }
      if (v.prices.member === '' || v.prices.collaborator === '' || v.prices.agency === '') {
        showToast(`Vui lòng nhập đầy đủ giá bán cho gói "${v.name}".`, 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          imageUrl,
          status,
          variants,
          importPrice,
          supplierName,
          supplierLink,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Tạo sản phẩm mới thành công!', 'success');
        router.push('/admin/products');
        router.refresh();
      } else {
        showToast(data.error || 'Lỗi khi tạo sản phẩm.', 'error');
      }
    } catch (error) {
      console.error('Create product submit error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const durationUnits = [
    { value: 'day', label: 'Ngày' },
    { value: 'month', label: 'Tháng' },
    { value: 'year', label: 'Năm' },
  ];

  const statuses = [
    { value: 'active', label: 'Kinh doanh (Active)' },
    { value: 'inactive', label: 'Ngưng hoạt động (Inactive)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-5 mb-6 md:mb-8">
        <Link href="/admin/products">
          <Button variant="outline" size="sm" className="p-2 h-10 w-10 flex items-center justify-center rounded-xl bg-card border-border hover:bg-[#f5f5f9] text-slate-600">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Thêm Sản phẩm Mới</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Tạo dịch vụ mới kèm các gói thời gian và bảng giá phân quyền.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: General Info (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin sản phẩm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Tên sản phẩm"
                    placeholder="Ví dụ: Dịch vụ Cloud VPS Pro"
                    value={name}
                    onChange={handleNameChange}
                    required
                  />
                  <Input
                    label="Slug (Đường dẫn tĩnh)"
                    placeholder="dich-vu-cloud-vps-pro"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>

                <Textarea
                  label="Mô tả sản phẩm"
                  placeholder="Nhập mô tả chi tiết về sản phẩm, tính năng, thông số kỹ thuật..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />

                {/* Supplier & Import Price - Admin only section */}
                <div className="pt-2 border-t border-border">
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span>🔒</span>
                    <span>Thông tin nội bộ (Chỉ Admin)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Input
                      label="Giá nhập gốc (VND)"
                      type="number"
                      min="0"
                      placeholder="Ví dụ: 200000"
                      value={importPrice}
                      onChange={(e) => setImportPrice(e.target.value)}
                    />
                    <Input
                      label="Tên nguồn hàng"
                      placeholder="Ví dụ: Reseller XYZ"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                    />
                    <Input
                      label="Link liên hệ nguồn hàng"
                      placeholder="https://t.me/supplier..."
                      value={supplierLink}
                      onChange={(e) => setSupplierLink(e.target.value)}
                    />
                  </div>
                </div>


                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Hình ảnh đại diện sản phẩm
                  </label>
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-40 h-40 object-cover rounded-xl border border-border"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 cursor-pointer shadow-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary-light/30 transition-all duration-200">
                      <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground font-medium">
                        {uploading ? 'Đang tải lên...' : 'Nhấp hoặc kéo thả ảnh vào đây'}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-1">JPG, PNG, WebP, GIF (Tối đa 5MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Variants section */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#a145ab]" />
                  <h2 className="text-lg font-bold text-slate-800">Cấu hình các Gói dịch vụ</h2>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddVariant} className="flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  <span>Thêm gói</span>
                </Button>
              </div>

              {variants.map((variant, idx) => (
                <Card key={idx} className="border-l-4 border-l-[#a145ab] relative overflow-visible">
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                      title="Xóa gói này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <CardHeader className="py-3.5">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                      <span>Gói thứ {idx + 1}</span>
                      {variant.name && <span className="text-slate-400 font-normal">({variant.name})</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-4">
                    {/* Basic variant configurations */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <div className="md:col-span-2">
                        <Input
                          label="Tên gói thời gian"
                          placeholder="Ví dụ: Gói 3 tháng, Gói 1 năm..."
                          value={variant.name}
                          onChange={(e) => handleVariantChange(idx, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <Input
                        label="Số lượng thời gian"
                        type="number"
                        min="1"
                        value={variant.durationValue}
                        onChange={(e) => handleVariantChange(idx, 'durationValue', parseInt(e.target.value) || 1)}
                        required
                      />
                      <Select
                        label="Đơn vị"
                        options={durationUnits}
                        value={variant.durationUnit}
                        onChange={(e) => handleVariantChange(idx, 'durationUnit', e.target.value)}
                      />
                    </div>

                    {/* Price settings per role */}
                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <span>Giá bán phân quyền (VND)</span>
                        <span title="Nhập giá tương ứng cho từng cấp bậc tài khoản">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Input
                          label="Giá Thành viên"
                          type="number"
                          min="0"
                          placeholder="Ví dụ: 500000"
                          value={variant.prices.member}
                          onChange={(e) => handlePriceChange(idx, 'member', e.target.value)}
                          required
                        />
                        <Input
                          label="Giá Cộng tác viên (CTV)"
                          type="number"
                          min="0"
                          placeholder="Ví dụ: 450000"
                          value={variant.prices.collaborator}
                          onChange={(e) => handlePriceChange(idx, 'collaborator', e.target.value)}
                          required
                        />
                        <Input
                          label="Giá Đại lý"
                          type="number"
                          min="0"
                          placeholder="Ví dụ: 400000"
                          value={variant.prices.agency}
                          onChange={(e) => handlePriceChange(idx, 'agency', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right: Actions & Status (1 col) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trạng thái & Lưu trữ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <Select
                  label="Trạng thái kinh doanh"
                  options={statuses}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />

                <div className="pt-4 border-t border-border flex flex-col gap-2">
                  <Button type="submit" variant="primary" className="w-full font-bold py-2.5 rounded-xl" loading={submitting} disabled={uploading}>
                    Tạo sản phẩm
                  </Button>
                  <Link href="/admin/products" className="w-full">
                    <Button type="button" variant="outline" className="w-full py-2.5 rounded-xl">
                      Hủy bỏ
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
