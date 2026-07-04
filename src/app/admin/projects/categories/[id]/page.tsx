'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge, showToast, Dialog, PageHeader, EmptyState, LoadingSkeleton, Input, StatusBadge } from '@/components/ui';
import { ArrowLeft, Calendar, DollarSign, Activity, Settings, Edit2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProjectCategoryAvatar } from '@/components/ProjectCategoryAvatar';

interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: string;
  progress: number;
  totalCost: number;
}

interface ProjectCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  createdAt: string;
  projects: Project[];
}

export default function ProjectCategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [category, setCategory] = useState<ProjectCategory | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Folder');
  const [editColor, setEditColor] = useState('purple');
  const [updating, setUpdating] = useState(false);

  const fetchCategoryDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/categories/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCategory(data.category);
        if (data.category) {
          setEditName(data.category.name);
          setEditIcon(data.category.icon || 'Folder');
          setEditColor(data.category.color || 'purple');
        }
      } else {
        showToast('Không thể tải thông tin phân loại dự án.', 'error');
        router.push('/admin/projects/categories');
      }
    } catch (error) {
      console.error('Fetch category details error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCategoryDetails();
    }
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Tên phân loại là bắt buộc.', 'error');
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/projects/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          icon: editIcon,
          color: editColor,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Cập nhật phân loại thành công!', 'success');
        setIsEditOpen(false);
        fetchCategoryDetails();
      } else {
        showToast(data.error || 'Lỗi cập nhật phân loại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingSkeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold">Không tìm thấy phân loại</h3>
        <Link href="/admin/projects/categories">
          <Button variant="primary">Quay lại danh sách</Button>
        </Link>
      </div>
    );
  }

  const totalProjects = category.projects.length;
  const runningProjects = category.projects.filter(p => p.status === 'running').length;
  const totalInvestment = category.projects.reduce((sum, p) => sum + p.totalCost, 0);
  const avgProgress = totalProjects > 0
    ? Math.round(category.projects.reduce((sum, p) => sum + p.progress, 0) / totalProjects)
    : 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link href="/admin/projects/categories" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Phân loại dự án</span>
          </Link>
          <div className="flex items-center gap-3">
            <ProjectCategoryAvatar
              icon={category.icon}
              color={category.color}
              className="w-10 h-10 rounded-xl"
            />
            <PageHeader
              title={category.name}
              description={`Thống kê chi tiết các dự án thuộc phân loại này.`}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Số lượng dự án</span>
              <span className="text-2xl font-black text-slate-700 block">{totalProjects}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Đang triển khai</span>
              <span className="text-2xl font-black text-slate-700 block">{runningProjects}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Tổng tiền đầu tư</span>
              <span className="text-xl font-black text-rose-600 block">{formatVND(totalInvestment)}</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Tiến độ trung bình</span>
              <span className="text-2xl font-black text-slate-700 block">{avgProgress}%</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Projects Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-primary" />
            Dự án liên kết thuộc Phân loại này
          </h3>
          {category.projects.length === 0 ? (
            <EmptyState
              icon={Settings}
              title="Phân loại này chưa có dự án nào"
              description="Bạn có thể chọn phân loại này khi tạo hoặc chỉnh sửa một dự án mới."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-border/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Tên dự án</th>
                    <th className="px-4 py-3">Tiến độ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Chi phí đầu tư</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {category.projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 align-middle">
                        <Link
                          href={`/admin/projects/${proj.id}`}
                          className="font-bold text-sm text-slate-800 hover:text-primary hover:underline"
                        >
                          {proj.name}
                        </Link>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Bắt đầu: {formatDate(proj.startDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 dark:bg-zinc-800 shrink-0">
                            <div
                              className="bg-primary h-1.5 rounded-full"
                              style={{ width: `${proj.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-500">{proj.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <StatusBadge status={proj.status} />
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right font-bold text-sm text-rose-600">
                        {formatVND(proj.totalCost)}
                      </td>
                      <td className="px-4 py-3.5 align-middle text-right">
                        <Link href={`/admin/projects/${proj.id}`}>
                          <Button size="xs" variant="outline">
                            Chi tiết
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
