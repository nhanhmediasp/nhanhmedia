'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Loader2, CreditCard, ShieldCheck, QrCode } from 'lucide-react';
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
  const [isPolling, setIsPolling] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [copyingAll, setCopyingAll] = useState(false);

  const [bankNumber, setBankNumber] = useState(process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NUMBER || '1015165449');
  const [bankName, setBankName] = useState(process.env.NEXT_PUBLIC_SEPAY_BANK_CODE || 'Vietcombank');
  const [accountName, setAccountName] = useState(process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NAME || 'NGUYEN THE VU');

  // Compute paymentContent once and keep it stable per mount
  const paymentContent = useMemo(() => getPaymentContent(orderCode), [orderCode]);
  const qrUrl = `https://qr.sepay.vn/img?acc=${bankNumber}&bank=${bankName}&amount=${amount}&des=${encodeURIComponent(paymentContent)}`;

  const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  const handleCopyAllInOne = async () => {
    setCopyingAll(true);
    const textDetails = `Ngân hàng: ${bankName}\nChủ tài khoản: ${accountName}\nSố tài khoản: ${bankNumber}\nSố tiền: ${formatVND(amount)}\nNội dung chuyển khoản: ${paymentContent}`;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `/api/public/qr-proxy?url=${encodeURIComponent(qrUrl)}`;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 700;
          canvas.height = 380;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw background card (white)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 700, 380);

            // Draw border
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.strokeRect(1, 1, 698, 378);

            // Draw header bar
            ctx.fillStyle = '#a145ab'; // Primary color matching project theme
            ctx.fillRect(0, 0, 700, 60);

            // Header text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
            ctx.fillText('QUÉT MÃ VIETQR THANH TOÁN TỰ ĐỘNG', 25, 36);

            // Draw white box for QR Code
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#f1f5f9';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(35, 85, 210, 210, 12);
            } else {
              ctx.rect(35, 85, 210, 210);
            }
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.stroke();

            // Draw QR Image inside the frame
            ctx.drawImage(img, 45, 95, 190, 190);

            // Draw subtitle under QR
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('XÁC NHẬN THANH TOÁN TỰ ĐỘNG', 140, 320);

            // Reset text align for details
            ctx.textAlign = 'left';

            // Draw Bank details (right)
            let ty = 95;
            
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
            ctx.fillText('THÔNG TIN CHUYỂN KHOẢN', 275, ty);
            ty += 24;

            // Bank Name & Account Name
            ctx.fillStyle = '#64748b';
            ctx.font = '500 11px system-ui, -apple-system, sans-serif';
            ctx.fillText('Ngân hàng', 275, ty);
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
            ctx.fillText(bankName, 275, ty + 18);

            ctx.fillStyle = '#64748b';
            ctx.font = '500 11px system-ui, -apple-system, sans-serif';
            ctx.fillText('Chủ tài khoản', 485, ty);
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
            ctx.fillText(accountName, 485, ty + 18);
            ty += 42;

            // Account Number
            ctx.fillStyle = '#64748b';
            ctx.font = '500 11px system-ui, -apple-system, sans-serif';
            ctx.fillText('Số tài khoản (STK)', 275, ty);
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 17px monospace, sans-serif';
            ctx.fillText(bankNumber, 275, ty + 20);
            ty += 42;

            // Amount
            ctx.fillStyle = '#64748b';
            ctx.font = '500 11px system-ui, -apple-system, sans-serif';
            ctx.fillText('Số tiền chuyển khoản', 275, ty);
            ctx.fillStyle = '#e11d48'; // rose-600
            ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
            ctx.fillText(formatVND(amount), 275, ty + 22);
            ty += 45;

            // Content box (blue background box)
            ctx.fillStyle = '#eff6ff';
            ctx.strokeStyle = '#bfdbfe';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(275, ty, 390, 65, 8);
            } else {
              ctx.rect(275, ty, 390, 65);
            }
            ctx.fill();
            ctx.stroke();

            // Content label inside box
            ctx.fillStyle = '#1d4ed8';
            ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
            ctx.fillText('NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC CHÍNH XÁC)', 290, ty + 22);

            // Content text
            ctx.fillStyle = '#1e40af';
            ctx.font = 'bold 16px monospace, sans-serif';
            ctx.fillText(paymentContent, 290, ty + 46);



            // Convert to Blob and copy to clipboard
            canvas.toBlob(async (blob) => {
              if (blob) {
                try {
                  await navigator.clipboard.write([
                    new ClipboardItem({
                      'image/png': blob,
                      'text/plain': new Blob([textDetails], { type: 'text/plain' })
                    })
                  ]);
                  showToast('Đã chụp và sao chép ảnh thẻ thanh toán QR!', 'success');
                } catch (err) {
                  console.error('Clipboard write error:', err);
                  await navigator.clipboard.writeText(textDetails);
                  showToast('Đã sao chép Thông tin chuyển khoản dạng chữ!', 'success');
                }
              } else {
                await navigator.clipboard.writeText(textDetails);
                showToast('Đã sao chép Thông tin chuyển khoản dạng chữ!', 'success');
              }
              setCopyingAll(false);
            }, 'image/png');
          } else {
            setCopyingAll(false);
          }
        } catch (e) {
          console.error(e);
          setCopyingAll(false);
        }
      };

      img.onerror = async () => {
        await navigator.clipboard.writeText(textDetails);
        showToast('Đã sao chép Thông tin chuyển khoản dạng chữ!', 'success');
        setCopyingAll(false);
      };
    } catch (e) {
      console.error(e);
      setCopyingAll(false);
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

  if (isPaid) {
    return (
      <div 
        className="rounded-2xl p-6 border text-center space-y-4 animate-fade-in relative overflow-hidden backdrop-blur-sm shadow-xl"
        style={{
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          borderColor: '#bbf7d0',
        }}
      >
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
      <div className="bg-slate-50 dark:bg-zinc-900/60 px-5 py-4 border-b border-border/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Quét mã VietQR để Thanh toán</h3>
        </div>
        
        <button
          type="button"
          disabled={copyingAll}
          onClick={handleCopyAllInOne}
          className="px-3.5 py-2 bg-primary text-white hover:bg-primary/95 active:scale-95 disabled:opacity-50 font-extrabold text-[11px] rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-primary/10"
        >
          {copyingAll ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang tạo ảnh thẻ...</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Chụp & Sao chép thẻ thanh toán</span>
            </>
          )}
        </button>
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
            <div className="absolute inset-0 border-2 border-primary/20 rounded-xl pointer-events-none animate-pulse" />
          </div>

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
          <div className="p-3.5 rounded-xl bg-muted/40">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Số tài khoản</span>
            <div className="font-black text-foreground text-sm font-mono tracking-wider mt-1">{bankNumber}</div>
          </div>

          {/* Amount Row */}
          <div className="p-3.5 rounded-xl bg-muted/40">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Số tiền</span>
            <div className="font-black text-rose-500 text-base mt-1">{formatVND(amount)}</div>
          </div>

          {/* Content Row */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10">
            <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Nội dung chuyển khoản (Bắt buộc đúng)</span>
            <div className="font-black text-primary text-sm font-mono tracking-widest uppercase mt-1">{paymentContent}</div>
          </div>


        </div>
      </div>
    </div>
  );
}
