'use client';

import React, { useState, useEffect } from 'react';
import { Check, Copy, Loader2, CreditCard, ShieldCheck, QrCode } from 'lucide-react';
import { buildQrUrl, getPaymentContent } from '@/lib/sepay';
import { showToast } from '@/components/ui';

interface OrderPaymentQrProps {
  orderId: string;
  orderCode: string;
  amount: number; // Remaining amount to be paid
  onPaymentSuccess?: () => void;
}

export default function OrderPaymentQr({
  orderId,
  orderCode,
  amount,
  onPaymentSuccess,
}: OrderPaymentQrProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [isPaid, setIsPaid] = useState(false);

  const [bankNumber, setBankNumber] = useState(process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NUMBER || '1015165449');
  const [bankName, setBankName] = useState(process.env.NEXT_PUBLIC_SEPAY_BANK_CODE || 'Vietcombank');
  const [accountName, setAccountName] = useState(process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NAME || 'NGUYEN THE VU');

  const paymentContent = getPaymentContent(orderCode);
  const qrUrl = `https://qr.sepay.vn/img?acc=${bankNumber}&bank=${bankName}&amount=${amount}&des=${encodeURIComponent(paymentContent)}`;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/public/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            if (data.settings.sepayAccountNumber) setBankNumber(data.settings.sepayAccountNumber);
            if (data.settings.sepayBankCode) setBankName(data.settings.sepayBankCode);
            if (data.settings.sepayAccountName) setAccountName(data.settings.sepayAccountName);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải cấu hình thanh toán QR:', err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          const order = data.order;
          const currentPrice = order.customPrice !== null ? order.customPrice : order.price;
          
          if (order.amountPaid >= currentPrice) {
            setIsPaid(true);
            setIsPolling(false);
            showToast('Thanh toán thành công qua chuyển khoản QR!', 'success');
            if (onPaymentSuccess) {
              onPaymentSuccess();
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra thanh toán:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, isPolling, onPaymentSuccess]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(`Đã sao chép ${field}!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  if (isPaid) {
    return (
      <div 
        className="rounded-2xl p-6 border text-center space-y-4 animate-fade-in"
        style={{
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          borderColor: '#bbf7d0',
        }}
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-emerald-800">ĐÃ THANH TOÁN THÀNH CÔNG</h3>
          <p className="text-xs text-emerald-600 mt-1 font-medium">Hệ thống đã nhận được tiền chuyển khoản tự động.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden border-border/80">
      <div className="bg-slate-50 dark:bg-zinc-900/60 px-5 py-4 border-b border-border/60 flex items-center gap-2">
        <QrCode className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Quét mã VietQR để Thanh toán</h3>
      </div>
      
      <div className="p-5 flex flex-col md:flex-row gap-6 items-center">
        {/* QR Code Column */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm relative group overflow-hidden">
            <img 
              src={qrUrl} 
              alt="VietQR SePay" 
              className="w-44 h-44 object-contain"
            />
            {/* Ambient pulse */}
            <div className="absolute inset-0 border-2 border-primary/20 rounded-xl pointer-events-none animate-pulse" />
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            Tự động xác nhận sau khi chuyển
          </span>
        </div>

        {/* Transfer details Column */}
        <div className="flex-1 w-full space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ngân hàng</span>
              <div className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-slate-400" />
                {bankName}
              </div>
            </div>
            
            <div className="p-3 rounded-xl bg-muted/40 space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Chủ tài khoản</span>
              <div className="font-extrabold text-foreground text-sm truncate uppercase">{accountName}</div>
            </div>
          </div>

          {/* Account Number Row */}
          <div className="p-3.5 rounded-xl bg-muted/40 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Số tài khoản</span>
              <div className="font-black text-foreground text-sm font-mono tracking-wider">{bankNumber}</div>
            </div>
            <button 
              type="button" 
              onClick={() => handleCopy(bankNumber, 'Số tài khoản')}
              className="p-2 h-9 w-9 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm border-border/80"
              title="Sao chép số tài khoản"
            >
              {copiedField === 'Số tài khoản' ? (
                <Check className="w-4 h-4 text-emerald-500 animate-scale-in" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Amount Row */}
          <div className="p-3.5 rounded-xl bg-muted/40 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Số tiền</span>
              <div className="font-black text-rose-500 text-base">{formatVND(amount)}</div>
            </div>
            <button 
              type="button" 
              onClick={() => handleCopy(String(amount), 'Số tiền')}
              className="p-2 h-9 w-9 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm border-border/80"
              title="Sao chép số tiền"
            >
              {copiedField === 'Số tiền' ? (
                <Check className="w-4 h-4 text-emerald-500 animate-scale-in" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Content Row */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Nội dung chuyển khoản (Bắt buộc đúng)</span>
              <div className="font-black text-primary text-sm font-mono tracking-widest uppercase">{paymentContent}</div>
            </div>
            <button 
              type="button" 
              onClick={() => handleCopy(paymentContent, 'Nội dung chuyển khoản')}
              className="p-2 h-9 w-9 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-800 border border-primary/20 hover:bg-primary/5 text-primary transition-all cursor-pointer shadow-sm"
              title="Sao chép nội dung"
            >
              {copiedField === 'Nội dung chuyển khoản' ? (
                <Check className="w-4 h-4 text-emerald-500 animate-scale-in" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
