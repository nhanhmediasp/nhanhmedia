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
    budget: number;
    profit: number;
  }[];
  totalBudget: number;
  totalProfit: number;
  topCustomerByBudget: {
    id: string;
    name: string;
    totalBudget: number;
  } | null;
  topCustomers: {
    id: string;
    name: string;
    totalBudget: number;
  }[];
  topTools: {
    id: string;
    name: string;
    count: number;
    totalCost: number;
  }[];
  previousStats: {
    budget: number;
    cost: number;
    profit: number;
  };
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
  const todayStr = new Date().toISOString().substring(0, 10);
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  
  const [preset, setPreset] = useState('30days');
  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [prevStartDate, setPrevStartDate] = useState('');
  const [prevEndDate, setPrevEndDate] = useState('');

  // Pagination for projects
  const [projectPage, setProjectPage] = useState(1);
  const projectsPerPage = 10;

  const fetchDashboardData = async (start = '', end = '', prevStart = '', prevEnd = '') => {
    try {
      setLoading(true);
      let url = '/api/admin/projects/dashboard';
      const params = [];
      if (start) params.push(`startDate=${start}`);
      if (end) params.push(`endDate=${end}`);
      if (prevStart) params.push(`prevStartDate=${prevStart}`);
      if (prevEnd) params.push(`prevEndDate=${prevEnd}`);
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

  // Auto update dates based on preset
  useEffect(() => {
    if (preset === 'custom') return;
    const now = new Date();
    let s = new Date();
    let pStart = new Date();
    let pEnd = new Date();

    if (preset === '7days') {
      s.setDate(now.getDate() - 7);
      pEnd = new Date(s.getTime() - 24 * 60 * 60 * 1000);
      pStart = new Date(pEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === '30days') {
      s.setDate(now.getDate() - 30);
      pEnd = new Date(s.getTime() - 24 * 60 * 60 * 1000);
      pStart = new Date(pEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (preset === 'lastMonth') {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      pStart = new Date(s.getFullYear(), s.getMonth() - 1, 1);
      pEnd = new Date(s.getFullYear(), s.getMonth(), 0);
      
      setStartDate(s.toISOString().substring(0, 10));
      setEndDate(e.toISOString().substring(0, 10));
      setPrevStartDate(pStart.toISOString().substring(0, 10));
      setPrevEndDate(pEnd.toISOString().substring(0, 10));
      fetchDashboardData(s.toISOString().substring(0, 10), e.toISOString().substring(0, 10), pStart.toISOString().substring(0, 10), pEnd.toISOString().substring(0, 10));
      return;
    }

    setStartDate(s.toISOString().substring(0, 10));
    setEndDate(now.toISOString().substring(0, 10));
    setPrevStartDate(pStart.toISOString().substring(0, 10));
    setPrevEndDate(pEnd.toISOString().substring(0, 10));
    fetchDashboardData(s.toISOString().substring(0, 10), now.toISOString().substring(0, 10), pStart.toISOString().substring(0, 10), pEnd.toISOString().substring(0, 10));
  }, [preset]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (preset === 'custom' && startDate && endDate) {
      // Calculate previous period duration
      const s = new Date(startDate);
      const eDate = new Date(endDate);
      const diffTime = Math.abs(eDate.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const pEnd = new Date(s.getTime() - 24 * 60 * 60 * 1000);
      const pStart = new Date(pEnd.getTime() - diffDays * 24 * 60 * 60 * 1000);
      
      setPrevStartDate(pStart.toISOString().substring(0, 10));
      setPrevEndDate(pEnd.toISOString().substring(0, 10));
      fetchDashboardData(startDate, endDate, pStart.toISOString().substring(0, 10), pEnd.toISOString().substring(0, 10));
    }
  };

  const handleResetFilter = () => {
    setPreset('all');
    setStartDate('');
    setEndDate('');
    setPrevStartDate('');
    setPrevEndDate('');
    fetchDashboardData('', '', '', '');
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatCompactVND = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2).replace(/\.00$/, '') + ' tỷ';
    if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + ' tr';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toString();
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
    totalBudget: 0,
    totalProfit: 0,
    topCustomerByBudget: null,
    topCustomers: [],
    topTools: [],
    previousStats: { budget: 0, cost: 0, profit: 0 },
    avgProgress: 0,
    overdueTasks: [],
    upcomingTasks: [],
    upcomingTools: [],
  };

  // Find max project cost for graph scale
  const maxProjectCost = Math.max(...stats.costByProject.map((c) => c.totalCost), 1000000);

  const websiteCostPct = stats.totalCosts.total > 0 ? Math.round((stats.totalCosts.website / stats.totalCosts.total) * 100) : 0;
  const toolCostPct = stats.totalCosts.total > 0 ? Math.round((stats.totalCosts.tools / stats.totalCosts.total) * 100) : 0;

  const renderChangeBadge = (current: number, prev: number) => {
    if (prev === 0) return null;
    const pctChange = ((current - prev) / prev) * 100;
    const isPositive = pctChange > 0;
    const isNegative = pctChange < 0;
    
    return (
      <div className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
        isPositive ? 'bg-emerald-100 text-emerald-700' : 
        isNegative ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
      }`}>
        {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(pctChange).toFixed(1)}% so với kỳ trước
      </div>
    );
  };

  const totalPages = Math.ceil(stats.costByProject.length / projectsPerPage);
  const currentProjects = stats.costByProject.slice((projectPage - 1) * projectsPerPage, projectPage * projectsPerPage);

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
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Mốc thời gian
                </label>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value)}
                  className="w-full flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="7days">7 ngày qua</option>
                  <option value="30days">30 ngày qua</option>
                  <option value="lastMonth">Tháng trước</option>
                  <option value="custom">Tùy chỉnh</option>
                  <option value="all">Toàn thời gian</option>
                </select>
              </div>
              <Input
                label="Từ ngày"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={preset !== 'custom'}
              />
              <Input
                label="Đến ngày"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={preset !== 'custom'}
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={handleResetFilter}>
                Xóa bộ lọc
              </Button>
              <Button type="submit" variant="primary" size="sm" className="flex items-center gap-1.5" disabled={preset !== 'custom'}>
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
          value={<span title={`${stats.statusCounts.running} / ${stats.statusCounts.completed} / ${stats.statusCounts.paused}`}>{`${stats.statusCounts.running} / ${stats.statusCounts.completed} / ${stats.statusCounts.paused}`}</span>}
          description="Trạng thái của các dự án"
          icon={<Briefcase className="w-6 h-6" />}
          iconColor="primary"
        />
        <StatCard
          title="Tổng Ngân sách"
          value={<span title={formatVND(stats.totalBudget)}>{formatCompactVND(stats.totalBudget)}</span>}
          description={
            <div className="flex flex-col">
              <span>Tổng ngân sách các dự án</span>
              {renderChangeBadge(stats.totalBudget, stats.previousStats.budget)}
            </div>
          }
          icon={<TrendingUp className="w-6 h-6" />}
          iconColor="success"
        />
        <StatCard
          title="Tổng Chi phí"
          value={<span title={formatVND(stats.totalCosts.total)}>{formatCompactVND(stats.totalCosts.total)}</span>}
          description={
            <div className="flex flex-col">
              <span>Chi phí vận hành & công cụ</span>
              {renderChangeBadge(stats.totalCosts.total, stats.previousStats.cost)}
            </div>
          }
          icon={<DollarSign className="w-6 h-6" />}
          iconColor="danger"
        />
        <StatCard
          title="Tổng Lợi nhuận"
          value={<span title={formatVND(stats.totalProfit)}>{formatCompactVND(stats.totalProfit)}</span>}
          description={
            <div className="flex flex-col">
              <span>Lợi nhuận gộp tạm tính</span>
              {renderChangeBadge(stats.totalProfit, stats.previousStats.profit)}
            </div>
          }
          icon={<TrendingUp className="w-6 h-6" />}
          iconColor="primary"
        />
      </div>

      {/* Row 2: 3 Columns for Allocations and Tops */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Top 5 Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Top 5 KH sử dụng dịch vụ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topCustomers.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Chưa có dữ liệu khách hàng.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.topCustomers.map((c, idx) => (
                  <div key={c.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                        ${idx === 0 ? 'bg-amber-100 text-amber-600' : 
                          idx === 1 ? 'bg-slate-200 text-slate-600' : 
                          idx === 2 ? 'bg-orange-100 text-orange-700' : 
                          'bg-slate-50 text-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <span className="text-sm font-black text-emerald-600">{formatCompactVND(c.totalBudget)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ chi phí hệ thống</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex flex-col justify-center min-h-[220px]">
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
                    <span className="text-slate-500">Chi phí phần mềm / công cụ</span>
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

        {/* Top 5 Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Top 5 Công cụ sử dụng nhiều
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topTools.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">Chưa có công cụ nào được sử dụng.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.topTools.map((t, idx) => (
                  <div key={t.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                        ${idx === 0 ? 'bg-amber-100 text-amber-600' : 
                          idx === 1 ? 'bg-slate-200 text-slate-600' : 
                          idx === 2 ? 'bg-orange-100 text-orange-700' : 
                          'bg-slate-50 text-slate-400'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{t.name}</span>
                        <span className="text-[10px] font-medium text-slate-400">{t.count} dự án sử dụng</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-purple-600">{formatCompactVND(t.totalCost)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Projects Cost Breakdown - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Tổng chi phí theo dự án (Website + Công cụ)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {stats.costByProject.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-10">Chưa có dự án nào có chi phí.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentProjects.map((p) => {
                  const pct = Math.max(2, Math.round((p.totalCost / maxProjectCost) * 100));
                  const webPct = p.totalCost > 0 ? (p.websiteCost / p.totalCost) * 100 : 0;
                  const toolPct = p.totalCost > 0 ? (p.toolCost / p.totalCost) * 100 : 0;

                  return (
                    <div key={p.id} className="flex flex-col gap-2.5 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors hover:shadow-sm">
                      <div className="flex justify-between items-center">
                        <Link href={`/admin/projects/${p.id}`} className="text-slate-800 font-semibold text-sm hover:text-primary hover:underline truncate max-w-[70%]">
                          {p.name}
                        </Link>
                        <span className="text-slate-800 font-bold text-sm shrink-0">{formatVND(p.totalCost)}</span>
                      </div>
                      
                      {p.totalCost > 0 ? (
                        <div className="space-y-2.5">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                            <div className="h-full flex rounded-full overflow-hidden transition-all duration-500" style={{ width: `${pct}%` }}>
                              <div className="h-full bg-blue-500" style={{ width: `${webPct}%` }} title={`Web: ${formatVND(p.websiteCost)}`} />
                              <div className="h-full bg-purple-500" style={{ width: `${toolPct}%` }} title={`Tool: ${formatVND(p.toolCost)}`} />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-bold">
                            <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-100/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Web: {formatCompactVND(p.websiteCost)}
                            </div>
                            <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50/80 px-2.5 py-1 rounded-md border border-purple-100/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              Tool: {formatCompactVND(p.toolCost)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 font-medium italic mt-2">Chưa phát sinh chi phí</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4 mt-4 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProjectPage(p => Math.max(1, p - 1))}
                    disabled={projectPage === 1}
                  >
                    Trang trước
                  </Button>
                  <span className="text-sm font-bold text-slate-600 px-4">
                    Trang {projectPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProjectPage(p => Math.min(totalPages, p + 1))}
                    disabled={projectPage === totalPages}
                  >
                    Trang sau
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

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
                  <div key={t.id} className="p-5 flex items-start justify-between gap-4 bg-red-50/30">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-800 mb-2 truncate">{t.title}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-white text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200/80 shadow-sm">
                          <span className="text-slate-400">Dự án:</span>
                          <Link href={`/admin/projects/${t.project.id}`} className="font-bold text-slate-700 hover:text-primary transition-colors">
                            {t.project.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-1 bg-white text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200/80 shadow-sm">
                          <span className="text-slate-400">Trạng thái:</span>
                          <span className="font-bold text-slate-700">{t.columnName}</span>
                        </div>
                        {t.assignee && (
                          <div className="flex items-center gap-1 bg-white text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200/80 shadow-sm">
                            <span className="text-slate-400">Phụ trách:</span>
                            <span className="font-bold text-slate-700">{t.assignee}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5 ml-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200">
                        Quá hạn
                      </span>
                      <span className="text-[11px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100/50">
                        {formatDate(t.deadline)}
                      </span>
                    </div>
                  </div>
                ))}
                {/* Upcoming */}
                {stats.upcomingTasks.map((t) => (
                  <div key={t.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-800 mb-2 truncate">{t.title}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200/80">
                          <span className="text-slate-400">Dự án:</span>
                          <Link href={`/admin/projects/${t.project.id}`} className="font-bold text-slate-700 hover:text-primary transition-colors">
                            {t.project.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200/80">
                          <span className="text-slate-400">Trạng thái:</span>
                          <span className="font-bold text-slate-700">{t.columnName}</span>
                        </div>
                        {t.assignee && (
                          <div className="flex items-center gap-1 bg-slate-50 text-slate-600 px-2 py-1 rounded-md text-[10px] font-medium border border-slate-200/80">
                            <span className="text-slate-400">Phụ trách:</span>
                            <span className="font-bold text-slate-700">{t.assignee}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5 ml-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-100">
                        Sắp đến hạn
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                        {formatDate(t.deadline)}
                      </span>
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
