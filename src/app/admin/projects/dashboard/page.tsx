'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  showToast,
  PageHeader,
  StatCard,
  EmptyState,
} from '@/components/ui';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Clock,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

interface DashboardData {
  statusCounts: {
    running: number;
    completed: number;
    paused: number;
  };
  totalCosts: {
    total: number;
    website: number;
    tools: number;
  };
  costByProject: {
    id: string;
    name: string;
    websiteCost: number;
    toolCost: number;
    totalCost: number;
  }[];
  avgProgress: number;
  overdueTasks: {
    id: string;
    title: string;
    deadline: string;
    assignee: string | null;
    priority: string;
    project: { id: string; name: string };
    columnName: string;
  }[];
  upcomingTasks: {
    id: string;
    title: string;
    deadline: string;
    assignee: string | null;
    priority: string;
    project: { id: string; name: string };
    columnName: string;
  }[];
  upcomingTools: {
    id: string;
    name: string;
    cost: number;
    billingCycle: string;
    nextRenewal: string;
    project: { id: string; name: string };
  }[];
}

export default function ProjectsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchDashboardData = async (start = '', end = '') => {
    try {
      setLoading(true);
      let url = '/api/admin/projects/dashboard';
      const params = [];
      if (start) params.push(`startDate=${start}`);
      if (end) params.push(`endDate=${end}`);
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        showToast('Lỗi tải báo cáo dự án.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboardData(startDate, endDate);
  };

  const handleResetFilter = () => {
    setStartDate('');
    setEndDate('');
    fetchDashboardData('', '');
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Chưa xác định';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const getDaysRenewalMsg = (renewalStr: string) => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const renewal = new Date(renewalStr);
    renewal.setHours(0,0,0,0);
    const diff = Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `Quá hạn ${Math.abs(diff)} ngày`;
    if (diff === 0) return 'Đến hạn hôm nay';
    return `Gia hạn sau ${diff} ngày`;
  };

  if (loading && !data) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <PageHeader title="Báo cáo Tổng quát Dự Án 📊" description="Đang tải dữ liệu báo cáo..." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card className="h-32 bg-white animate-pulse"><div /></Card>
          <Card className="h-32 bg-white animate-pulse"><div /></Card>
          <Card className="h-32 bg-white animate-pulse"><div /></Card>
        </div>
      </div>
    );
  }

  const stats = data || {
    statusCounts: { running: 0, completed: 0, paused: 0 },
    totalCosts: { total: 0, website: 0, tools: 0 },
    costByProject: [],
    avgProgress: 0,
    overdueTasks: [],
    upcomingTasks: [],
    upcomingTools: [],
  };

  // Find max project cost for graph scale
  const maxProjectCost = Math.max(...stats.costByProject.map((c) => c.totalCost), 1000000);

  const websiteCostPct = stats.totalCosts.total > 0 ? Math.round((stats.totalCosts.website / stats.totalCosts.total) * 100) : 0;
  const toolCostPct = stats.totalCosts.total > 0 ? Math.round((stats.totalCosts.tools / stats.totalCosts.total) * 100) : 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Breadcrumb Back */}
      <div className="flex items-center justify-between">
        <Link href="/admin/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Quản lý Dự án</span>
        </Link>
        <button
          onClick={() => fetchDashboardData(startDate, endDate)}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-655 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Tải lại dữ liệu"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Header */}
      <PageHeader
        title="Báo cáo Tổng quát Dự Án 📊"
        description="Số liệu tổng hợp chi phí, tiến độ, công việc và hạn dùng công cụ hỗ trợ."
      />

      {/* Date Filter Form */}
      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleApplyFilter} className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Từ ngày"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="Đến ngày"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={handleResetFilter}>
                Xóa bộ lọc
              </Button>
              <Button type="submit" variant="primary" size="sm" className="flex items-center gap-1.5">
                <Filter className="w-4 h-4" />
                Lọc dữ liệu
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Đang làm / Hoàn thành / Tạm dừng"
          value={`${stats.statusCounts.running} / ${stats.statusCounts.completed} / ${stats.statusCounts.paused}`}
          description="Trạng thái của các dự án"
          icon={<Briefcase className="w-6 h-6" />}
          iconColor="primary"
        />
        <StatCard
          title="Tổng chi phí"
          value={formatVND(stats.totalCosts.total)}
          description="Gồm Website và Công cụ"
          icon={<DollarSign className="w-6 h-6" />}
          iconColor="danger"
        />
        <StatCard
          title="Tiến độ trung bình"
          value={`${stats.avgProgress}%`}
          description="Tính trên các dự án đang chạy"
          icon={<TrendingUp className="w-6 h-6" />}
          iconColor="success"
        />
        <StatCard
          title="Cần gia hạn gấp"
          value={stats.upcomingTools.length}
          description="Công cụ sắp hết hạn trong 7 ngày"
          icon={<AlertTriangle className="w-6 h-6" />}
          iconColor="warning"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost by Project (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tổng chi phí theo dự án (Website + Công cụ)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {stats.costByProject.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">Chưa có dự án nào có chi phí.</p>
            ) : (
              stats.costByProject.map((p) => {
                const pct = Math.max(5, Math.round((p.totalCost / maxProjectCost) * 100));
                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <Link href={`/admin/projects/${p.id}`} className="text-slate-700 hover:text-primary hover:underline truncate max-w-sm">
                        {p.name}
                      </Link>
                      <span className="text-slate-800 font-extrabold">{formatVND(p.totalCost)}</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-lg overflow-hidden relative group">
                      <div
                        className="h-full rounded-lg transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg,#c060c8 0%,#a145ab 100%)',
                        }}
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-white pointer-events-none drop-shadow">
                        Web: {formatVND(p.websiteCost)} | Tool: {formatVND(p.toolCost)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Cost Type Breakdown (1 col) */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ chi phí hệ thống</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col justify-center h-full min-h-[220px]">
            {stats.totalCosts.total === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-10">Chưa có dữ liệu chi phí.</p>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Chi phí Website</span>
                    <span className="text-slate-800">{formatVND(stats.totalCosts.website)} ({websiteCostPct}%)</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${websiteCostPct}%`,
                        background: 'linear-gradient(90deg,#0ea5e9,#38bdf8)',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500">Chi phí phần mềm / công cụ hỗ trợ</span>
                    <span className="text-slate-800">{formatVND(stats.totalCosts.tools)} ({toolCostPct}%)</span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${toolCostPct}%`,
                        background: 'linear-gradient(90deg,#a145ab,#c060c8)',
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">Tổng cộng:</span>
                  <span className="text-sm font-black text-rose-600">{formatVND(stats.totalCosts.total)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deadlines & Renewals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks list */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-1.5">
              <Clock className="w-4.5 h-4.5 text-rose-500" />
              <span>Công việc quá hạn / Sắp đến deadline</span>
            </CardTitle>
            <Badge variant="danger">{stats.overdueTasks.length + stats.upcomingTasks.length} việc</Badge>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {stats.overdueTasks.length === 0 && stats.upcomingTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">Không có công việc nào cần xử lý gấp.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                {/* Overdue */}
                {stats.overdueTasks.map((t) => (
                  <div key={t.id} className="p-4 flex items-start justify-between gap-3 bg-red-50/30">
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-black text-slate-800 truncate">{t.title}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                        <Link href={`/admin/projects/${t.project.id}`} className="text-primary font-bold hover:underline">
                          {t.project.name}
                        </Link>
                        <span>• Cột: {t.columnName}</span>
                        {t.assignee && <span>• Phụ trách: {t.assignee}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-150 text-red-650 animate-pulse border border-red-200">
                        Quá hạn
                      </span>
                      <span className="text-[10px] font-bold text-red-600">{formatDate(t.deadline)}</span>
                    </div>
                  </div>
                ))}
                {/* Upcoming */}
                {stats.upcomingTasks.map((t) => (
                  <div key={t.id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-black text-slate-800 truncate">{t.title}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                        <Link href={`/admin/projects/${t.project.id}`} className="text-primary font-bold hover:underline">
                          {t.project.name}
                        </Link>
                        <span>• Cột: {t.columnName}</span>
                        {t.assignee && <span>• Phụ trách: {t.assignee}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                        Sắp đến hạn
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">{formatDate(t.deadline)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Software tools renewals */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-1.5">
              <Calendar className="w-4.5 h-4.5 text-amber-500" />
              <span>Phần mềm / Công cụ sắp hết hạn (7 ngày)</span>
            </CardTitle>
            <Badge variant="warning">{stats.upcomingTools.length} công cụ</Badge>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {stats.upcomingTools.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">Không có công cụ nào sắp đến hạn gia hạn.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                {stats.upcomingTools.map((tc) => (
                  <div key={tc.id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs font-black text-slate-800 truncate">{tc.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                        <Link href={`/admin/projects/${tc.project.id}`} className="text-primary font-bold hover:underline">
                          {tc.project.name}
                        </Link>
                        <span>• Chi phí: {formatVND(tc.cost)} / {tc.billingCycle === 'month' ? 'Tháng' : tc.billingCycle === 'year' ? 'Năm' : 'Một lần'}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 animate-pulse border border-amber-200">
                        {getDaysRenewalMsg(tc.nextRenewal)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">{formatDate(tc.nextRenewal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
