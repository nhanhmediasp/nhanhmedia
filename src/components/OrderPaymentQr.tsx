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
  const [copyingImage, setCopyingImage] = useState(false);

  const [bankNumber, setBankNumber] = useState(process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NUMBER || '1015165449');
  const [bankName, setBankName] = useState(process.env.NEXT_PUBLIC_SEPAY_BANK_CODE || 'Vietcombank');
  const [accountName, setAccountName] = useState(process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NAME || 'NGUYEN THE VU');

  const paymentContent = getPaymentContent(orderCode);
  const qrUrl = `https://qr.sepay.vn/img?acc=${bankNumber}&bank=${bankName}&amount=${amount}&des=${encodeURIComponent(paymentContent)}`;

  const handleCopyQRImage = async () => {
    setCopyingImage(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `/api/public/qr-proxy?url=${encodeURIComponent(qrUrl)}`;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(async (blob) => {
              if (blob) {
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                  ]);
                  showToast('Đã sao chép ảnh QR vào bộ nhớ tạm!', 'success');
                } catch (err) {
                  console.error('Clipboard write error:', err);
                  showToast('Không thể sao chép ảnh vào clipboard. Hãy lưu thủ công.', 'error');
                }
              } else {
                showToast('Không thể tạo tệp ảnh.', 'error');
              }
              setCopyingImage(false);
            }, 'image/png');
          } else {
            showToast('Không thể tạo Canvas.', 'error');
            setCopyingImage(false);
          }
        } catch (e) {
          console.error(e);
          showToast('Lỗi xử lý sao chép ảnh.', 'error');
          setCopyingImage(false);
        }
      };

      img.onerror = () => {
        showToast('Lỗi tải ảnh từ cổng QR.', 'error');
        setCopyingImage(false);
      };
    } catch (e) {
      console.error(e);
      showToast('Lỗi xử lý.', 'error');
      setCopyingImage(false);
    }
  };

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
        className="rounded-2xl p-6 border text-center space-y-4 animate-fade-in relative overflow-hidden backdrop-blur-sm shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          borderColor: '#bbf7d0',
        }}
      >
        {/* Animated decorative shapes */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-300/20 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-300/10 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none" />

        <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 border-4 border-white/60 animate-bounce">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="space-y-1 relative z-10">
          <h3 className="text-base font-black text-emerald-800 tracking-wide uppercase">ĐÃ THANH TOÁN THÀNH CÔNG</h3>
          <p className="text-xs text-emerald-600 font-medium">Hệ thống đã nhận được đầy đủ tiền chuyển khoản tự động.</p>
        </div>
        <div className="inline-flex text-[10px] bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1 text-emerald-700 font-bold uppercase tracking-wider select-none animate-pulse">
          Đơn hàng đã thanh toán 100%
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
        <div className="flex flex-col items-center gap-2 shrink-0 w-full md:w-auto">
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm relative group overflow-hidden">
            <img 
              src={qrUrl} 
              alt="VietQR SePay" 
              className="w-44 h-44 object-contain"
            />
            {/* Ambient pulse */}
            <div className="absolute inset-0 border-2 border-primary/20 rounded-xl pointer-events-none animate-pulse" />
          </div>
          
          <button
            type="button"
            disabled={copyingImage}
            onClick={handleCopyQRImage}
            className="w-full max-w-[176px] h-8 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-50 text-white font-bold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm border border-slate-700 cursor-pointer"
          >
            {copyingImage ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép ảnh QR</span>
              </>
            )}
          </button>

          <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1 mt-1">
            <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
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
