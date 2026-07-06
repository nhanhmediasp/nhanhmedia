'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  showToast,
  Input,
  Select,
  PageHeader,
  StatCard,
  EmptyState,
  LoadingSkeleton,
} from '@/components/ui';
import { ColumnChart } from '@/components/Charts';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpDown,
  CreditCard,
} from 'lucide-react';

interface PaymentTransaction {
  id: string;
  sepayId: string;
  orderId: string | null;
  amount: number;
  content: string | null;
  code: string | null;
  accountNumber: string | null;
  gateway: string | null;
  transactionAt: string;
  matched: boolean;
  status: string;
  order?: {
    orderCode: string;
    customer: {
      name: string;
    };
  } | null;
}

export default function AdminPaymentsReportPage() {
  // Date initialization: last 30 days
  const todayStr = new Date().toISOString().substring(0, 10);
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);

  const [fromDate, setFromDate] = useState(thirtyDaysAgoStr);
  const [toDate, setToDate] = useState(todayStr);
  const [matchedFilter, setMatchedFilter] = useState('all'); // all, matched, unmatched
  
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [dailyStats, setDailyStats] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState<'transactionAt' | 'amount'>('transactionAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        from: fromDate,
        to: toDate,
        matched: matchedFilter,
      });

      const res = await fetch(`/api/admin/payments?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotalCount(data.totalCount || 0);
        setTotalAmount(data.totalAmount || 0);
        setUnmatchedCount(data.unmatchedCount || 0);
        setDailyStats(data.dailyStats || []);
      } else {
        const err = await res.json();
        showToast(err.error || 'Lỗi tải báo cáo giao dịch.', 'error');
      }
    } catch (error) {
      console.error('Fetch payment reports error:', error);
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [fromDate, toDate, matchedFilter]);

  const handleSort = (field: 'transactionAt' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTransactions = React.useMemo(() => {
    return [...transactions].sort((a, b) => {
      let aVal = sortField === 'transactionAt' ? new Date(a.transactionAt).getTime() : a.amount;
      let bVal = sortField === 'transactionAt' ? new Date(b.transactionAt).getTime() : b.amount;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [transactions, sortField, sortDirection]);

  const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <PageHeader
        title="Báo cáo giao dịch QR (SePay)"
        description="Theo dõi lịch sử giao dịch tự động chuyển khoản qua VietQR SePay, đối soát các đơn hàng đã khớp."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReportData}
          disabled={loading}
          className="flex items-center gap-1.5 cursor-pointer text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Tải lại
        </Button>
      </PageHeader>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Từ ngày"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label="Đến ngày"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <Select
            label="Trạng thái khớp đơn"
            options={[
              { value: 'all', label: 'Tất cả giao dịch' },
              { value: 'matched', label: 'Đã khớp đơn hàng' },
              { value: 'unmatched', label: 'Chưa khớp đơn hàng (Lỗi/Thừa)' },
            ]}
            value={matchedFilter}
            onChange={(e) => setMatchedFilter(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Stats Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <LoadingSkeleton className="h-28 rounded-2xl" />
          <LoadingSkeleton className="h-28 rounded-2xl" />
          <LoadingSkeleton className="h-28 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard
            title="TỔNG TIỀN QR NHẬN"
            value={formatVND(totalAmount)}
            icon={<DollarSign className="w-5 h-5" />}
            iconColor="primary"
            description="Tổng tiền qua cổng SePay VietQR"
          />
          <StatCard
            title="SỐ GIAO DỊCH"
            value={totalCount}
            icon={<TrendingUp className="w-5 h-5" />}
            iconColor="success"
            description="Số lượng giao dịch đã phát sinh"
          />
          <StatCard
            title="GIAO DỊCH CHƯA KHỚP"
            value={unmatchedCount}
            icon={<HelpCircle className="w-5 h-5" />}
            iconColor="warning"
            description="Chuyển khoản sai nội dung / không tìm thấy đơn"
          />
        </div>
      )}

      {/* Charts & Graphs */}
      {!loading && dailyStats.length > 0 && (
        <Card>
          <CardHeader className="py-5 border-b border-border/30">
            <CardTitle>Biểu đồ doanh thu QR hàng ngày</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ColumnChart
              data={dailyStats}
              height={260}
              keys={['value']}
              colors={['#a145ab']}
            />
          </CardContent>
        </Card>
      )}

      {/* Detail Transactions Table */}
      <Card>
        <CardHeader className="py-5 border-b border-border/30 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Danh sách giao dịch chi tiết
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-3">
              <LoadingSkeleton className="h-10 w-full rounded-lg" />
              <LoadingSkeleton className="h-10 w-full rounded-lg" />
              <LoadingSkeleton className="h-10 w-full rounded-lg" />
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="py-12">
              <EmptyState
                title="Không có giao dịch nào"
                description="Không tìm thấy lịch sử giao dịch chuyển khoản VietQR trong khoảng thời gian đã chọn."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 dark:bg-zinc-900/30 text-muted-foreground font-semibold">
                    <th
                      className="py-3 px-4 cursor-pointer select-none hover:text-foreground"
                      onClick={() => handleSort('transactionAt')}
                    >
                      <div className="flex items-center gap-1">
                        Thời gian giao dịch
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 cursor-pointer select-none hover:text-foreground"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center gap-1">
                        Số tiền
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Nội dung chuyển khoản</th>
                    <th className="py-3 px-4">Đơn hàng liên kết</th>
                    <th className="py-3 px-4">Khách hàng</th>
                    <th className="py-3 px-4">Cổng nhận (Bank)</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/10">
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {formatDateTime(tx.transactionAt)}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-primary text-sm">
                        {formatVND(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500 max-w-[200px] truncate" title={tx.content || ''}>
                        {tx.content || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {tx.order ? (
                          <Link
                            href={`/admin/orders/${tx.orderId}`}
                            className="text-primary hover:underline font-bold font-mono bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10"
                          >
                            {tx.order.orderCode}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">Chưa liên kết</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {tx.order?.customer?.name || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {tx.gateway || 'SePay'} ({tx.accountNumber || '-'})
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={tx.status || 'success'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              const res = await fetch('/api/admin/payments', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: tx.id, status: newStatus }),
                              });
                              if (res.ok) {
                                showToast('Cập nhật trạng thái giao dịch thành công!', 'success');
                                fetchReportData();
                              } else {
                                const data = await res.json();
                                showToast(data.error || 'Lỗi khi cập nhật.', 'error');
                              }
                            } catch {
                              showToast('Lỗi kết nối máy chủ.', 'error');
                            }
                          }}
                          className={`text-[10px] font-bold rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer border ${
                            tx.status === 'refunded'
                              ? 'bg-rose-950/20 text-rose-400 border-rose-900/30'
                              : tx.status === 'failed'
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : tx.matched
                              ? 'bg-green-950/20 text-green-400 border-green-900/30'
                              : 'bg-amber-950/20 text-amber-400 border-amber-900/30'
                          }`}
                        >
                          <option value="success" className="bg-slate-900 text-green-400">Đã khớp đơn</option>
                          <option value="refunded" className="bg-slate-900 text-rose-400">Đã hoàn tiền</option>
                          <option value="failed" className="bg-slate-900 text-slate-400">Thất bại</option>
                        </select>
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
