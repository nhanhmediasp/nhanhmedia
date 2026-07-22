import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractOrderCodeFromContent } from '@/lib/sepay';
import { createAuditLog } from '@/lib/audit';
import { sendTelegramMessage } from '@/lib/telegram';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * Timing-safe string comparison to protect against timing attacks
 */
function safeCompare(a: string, b: string) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(req: Request) {
  try {
    const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
    const webhookSecret = settings?.sepayWebhookSecret;
    const sepayApiKey = settings?.sepayApiKey || process.env.SEPAY_API_KEY;

    let payload;

    // 1. Verify Request: either via HMAC-SHA256 signature or Authorization API Key
    if (webhookSecret) {
      const signatureHeader = req.headers.get('x-sepay-signature') || '';
      const timestampHeader = req.headers.get('x-sepay-timestamp') || '';

      if (!signatureHeader || !timestampHeader) {
        return NextResponse.json({ error: 'Không tìm thấy chữ ký bảo mật.' }, { status: 400 });
      }

      // Check Replay attack (must be within 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(timestampHeader, 10);
      if (isNaN(requestTime) || Math.abs(now - requestTime) > 300) {
        return NextResponse.json({ error: 'Yêu cầu hết hạn bảo mật (Replay Attack check).' }, { status: 400 });
      }

      // Read raw body as text for signature calculation
      const rawBodyText = await req.text();
      
      const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${timestampHeader}.${rawBodyText}`)
        .digest('hex');

      const cleanSignature = signatureHeader.startsWith('sha256=')
        ? signatureHeader.substring(7)
        : signatureHeader;

      if (!safeCompare(cleanSignature, computedSignature)) {
        return NextResponse.json({ error: 'Chữ ký bảo mật không khớp.' }, { status: 401 });
      }

      payload = JSON.parse(rawBodyText);
    } else {
      // Standard API Key Verification
      const authHeader = req.headers.get('authorization') || '';
      if (!sepayApiKey) {
        console.error('SEPAY_API_KEY is not configured in database or environment variables.');
        return NextResponse.json({ error: 'Cấu hình cổng thanh toán chưa hoàn tất.' }, { status: 500 });
      }

      const expectedAuth = `Apikey ${sepayApiKey}`;
      if (!safeCompare(authHeader, expectedAuth)) {
        return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 401 });
      }

      payload = await req.json();
    }

    const {
      id: sepayId,
      transferType,
      transferAmount,
      content,
      code,
      accountNumber,
      gateway,
      transactionDate,
    } = payload;

    // We only process incoming money ("in")
    if (transferType !== 'in') {
      return NextResponse.json({ success: true, message: 'Bỏ qua giao dịch không phải tiền vào.' });
    }

    // Parse amount
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Số tiền không hợp lệ.' }, { status: 400 });
    }

    // 3. Idempotency Check: prevent duplicate webhook processing
    const existingTx = await prisma.paymentTransaction.findUnique({
      where: { sepayId: String(sepayId) },
    });

    if (existingTx) {
      return NextResponse.json({ success: true, message: 'Giao dịch đã được xử lý trước đó.' });
    }

    // Parse transaction date
    let transactionAt = new Date();
    if (transactionDate) {
      const parsedDate = new Date(transactionDate);
      if (!isNaN(parsedDate.getTime())) {
        transactionAt = parsedDate;
      }
    }

    // 4. Try matching to an order
    // OrderCode can be present either in extracted 'code' field or inside 'content' description
    const matchedOrderCode = code ? String(code) : extractOrderCodeFromContent(content);
    
    let order = null;
    if (matchedOrderCode) {
      order = await prisma.order.findUnique({
        where: { orderCode: matchedOrderCode },
        include: { customer: true },
      });
    }

    // 5. Save transaction and update order (if matched) in a Prisma transaction
    if (order) {
      const currentPrice = order.customPrice !== null ? order.customPrice : order.price;
      const oldAmountPaid = order.amountPaid;
      const newAmountPaid = oldAmountPaid + amount;

      // Business rule: if paid in full (amountPaid >= price) and order is 'new' or 'processing',
      // set its status to 'processing' (DO NOT automatically transition to 'running' - admin must decide this).
      const shouldUpdateStatus = newAmountPaid >= currentPrice && (order.status === 'new' || order.status === 'processing');
      const newStatus = shouldUpdateStatus ? 'processing' : order.status;

      // Run database updates in transaction to ensure integrity
      const [updatedOrder, createdTx] = await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            amountPaid: newAmountPaid,
            status: newStatus,
          },
        }),
        prisma.paymentTransaction.create({
          data: {
            sepayId: String(sepayId),
            orderId: order.id,
            amount,
            content,
            code: matchedOrderCode,
            accountNumber: accountNumber ? String(accountNumber) : null,
            gateway: gateway ? String(gateway) : null,
            transactionAt,
            matched: true,
            raw: payload,
          },
        }),
      ]);

      // Ghi nhận Audit Log
      await createAuditLog({
        actor: {
          id: 'sepay-webhook',
          name: 'SePay Webhook',
          email: 'webhook@sepay.vn',
          role: 'system',
        },
        action: 'PAYMENT_RECEIVED_AUTO',
        actionLabel: 'Thanh toán tự động qua VietQR',
        module: 'orders',
        entityType: 'Order',
        entityId: order.id,
        entityName: order.orderCode,
        description: `Đã nhận thanh toán tự động qua SePay: +${amount.toLocaleString('vi-VN')}đ cho đơn ${order.orderCode}. Tổng đã nhận: ${newAmountPaid.toLocaleString('vi-VN')}đ / ${currentPrice.toLocaleString('vi-VN')}đ. Trạng thái: ${newStatus === 'processing' && order.status !== 'processing' ? 'Chuyển sang Đang xử lý' : 'Giữ nguyên'}.`,
        oldValues: {
          amountPaid: oldAmountPaid,
          status: order.status,
        },
        newValues: {
          amountPaid: newAmountPaid,
          status: newStatus,
        },
        request: req,
        status: 'success',
      });

      // Gửi thông báo Telegram nếu có TELEGRAM_ADMIN_CHAT_ID
      const teleAdminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (teleAdminChatId) {
        const teleMsg = `<b>🎉 NHẬN THANH TOÁN TỰ ĐỘNG (SEPAY)</b>\n\n` +
          `📌 <b>Mã đơn:</b> <code>${order.orderCode}</code>\n` +
          `👤 <b>Khách hàng:</b> ${order.customer?.name || 'Khách hàng'}\n` +
          `💵 <b>Số tiền vừa nhận:</b> <code>+${amount.toLocaleString('vi-VN')}đ</code>\n` +
          `📊 <b>Tổng đã nhận:</b> ${newAmountPaid.toLocaleString('vi-VN')}đ / ${currentPrice.toLocaleString('vi-VN')}đ\n` +
          `⚙️ <b>Trạng thái đơn:</b> ${newStatus === 'processing' ? '🟢 Đang xử lý' : newStatus === 'running' ? '✅ Đang chạy' : newStatus}\n` +
          `💬 <b>Nội dung CK:</b> <code>${content || ''}</code>`;
        await sendTelegramMessage({
          chatId: teleAdminChatId,
          text: teleMsg,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Đã khớp đơn hàng ${order.orderCode} và cập nhật tiền nhận.`,
        transactionId: createdTx.id,
        orderId: updatedOrder.id,
      });
    } else {
      // Create unmatched transaction
      const createdTx = await prisma.paymentTransaction.create({
        data: {
          sepayId: String(sepayId),
          orderId: null,
          amount,
          content,
          code: matchedOrderCode || null,
          accountNumber: accountNumber ? String(accountNumber) : null,
          gateway: gateway ? String(gateway) : null,
          transactionAt,
          matched: false,
          raw: payload,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Giao dịch không khớp với đơn hàng nào, đã lưu để đối soát.',
        transactionId: createdTx.id,
      });
    }
  } catch (error: any) {
    console.error('SePay Webhook error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống khi xử lý webhook.' }, { status: 500 });
  }
}
