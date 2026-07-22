import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendTelegramMessage, sendTelegramPhoto, answerCallbackQuery } from '@/lib/telegram';
import { getPaymentContent, extractOrderCodeFromContent } from '@/lib/sepay';
import { calculateEndDate } from '@/app/api/orders/route';

export const runtime = 'nodejs';

// Generate professional order code
function generateOrderCode(): string {
  const now = new Date();
  const year = String(now.getFullYear()).substring(2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NHANH${year}${month}${day}-${rand}`;
}

// Get fallback admin user ID for created orders
async function getAdminUserId(): Promise<string> {
  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true },
  });
  if (adminUser) return adminUser.id;

  const anyUser = await prisma.user.findFirst({ select: { id: true } });
  return anyUser ? anyUser.id : 'system-telegram-bot';
}

// Extract order creation intent using Gemini AI or keyword fallback
async function extractOrderDetails(text: string): Promise<{
  productId?: string;
  variantId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  note?: string;
  error?: string;
} | null> {
  // Fetch active products & variants from DB
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    include: {
      variants: {
        where: { status: 'active' },
        include: {
          prices: true,
        },
      },
    },
  });

  if (products.length === 0) {
    return { error: 'Hệ thống hiện chưa có sản phẩm nào hoạt động.' };
  }

  // Format catalog for Gemini AI context
  const catalog = products.flatMap((p) =>
    p.variants.map((v) => {
      const priceRecord = v.prices.find((pr) => pr.role === 'member') || v.prices[0];
      const price = priceRecord ? priceRecord.price : 0;
      return {
        productName: p.name,
        productId: p.id,
        variantName: v.name,
        variantId: v.id,
        duration: `${v.durationValue} ${v.durationUnit}`,
        price,
      };
    })
  );

  const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
  const geminiKey = process.env.GEMINI_API_KEY || settings?.geminiApiKey;

  if (geminiKey) {
    const models = [
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
    ];
    const systemInstruction = `Bạn là Trợ lý phân tích đơn hàng Telegram của Nhanh Media.
Nhiệm vụ: Trích xuất các trường thông tin đơn hàng từ câu chat của người dùng dựa trên danh sách dịch vụ sẵn có sau đây:

DANH SÁCH SẢN PHẨM & GÓI DỊCH VỤ TRONG HỆ THỐNG:
${JSON.stringify(catalog, null, 2)}

YÊU CẦU ĐẦU RA:
Trả về CHÍNH XÁC một chuỗi JSON (không chứa Markdown tag, không thêm bất kỳ văn bản nào khác ngoài JSON):
{
  "productId": "string - ID sản phẩm phù hợp nhất trong danh sách",
  "variantId": "string - ID gói (variant) phù hợp nhất trong danh sách",
  "customerName": "string - Tên khách hàng (nếu không đề cập, mặc định là 'Khách Telegram')",
  "customerPhone": "string - Số điện thoại khách hàng (nếu có, ví dụ 0912345678, hoặc null)",
  "customerEmail": "string - Email khách hàng (nếu có, hoặc null)",
  "note": "string - Ghi chú thêm (nếu có, hoặc null)"
}

LƯU Ý:
- Nếu người dùng nhập tên sản phẩm/gói không rõ ràng, cố gắng khớp với gói phù hợp nhất trong danh sách catalog.
- Nếu hoàn toàn không thể xác định được sản phẩm nào, trả về: { "error": "Tên sản phẩm không khớp với bất kỳ dịch vụ nào trong hệ thống." }`;

    for (const model of models) {
      try {
        // 1. Try Native REST API first
        const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const res = await fetch(nativeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: { temperature: 0.1 },
          }),
        });

        if (res.ok) {
          const nativeData = await res.json();
          const rawContent = nativeData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (rawContent) {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0]);
            }
          }
        }

        // 2. Fallback: Try OpenAI endpoint
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${geminiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: text },
            ],
            temperature: 0.1,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const rawContent = data.choices[0].message.content.trim();
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        }
      } catch (err) {
        console.error(`[Telegram Bot] Gemini model ${model} error:`, err);
      }
    }
  }

  // Fallback: Simple keyword matching if AI is unavailable
  const lowerText = text.toLowerCase();
  for (const item of catalog) {
    if (lowerText.includes(item.productName.toLowerCase()) || lowerText.includes(item.variantName.toLowerCase())) {
      // Try extract phone number
      const phoneMatch = text.match(/(0[3|5|7|8|9][0-9]{8})/);
      const phone = phoneMatch ? phoneMatch[0] : undefined;

      return {
        productId: item.productId,
        variantId: item.variantId,
        customerName: 'Khách Telegram',
        customerPhone: phone,
      };
    }
  }

  return null;
}

// Process order creation logic
async function processOrderCreation(chatId: string | number, text: string) {
  const extracted = await extractOrderDetails(text);

  if (!extracted || extracted.error) {
    const errorMsg = extracted?.error ||
      '⚠️ <b>Chưa xác định được dịch vụ cần tạo!</b>\n\n' +
      'Vui lòng cú pháp theo mẫu:\n' +
      '👉 <code>Tạo đơn [Tên gói dịch vụ] cho [Tên khách] [SĐT]</code>\n\n' +
      '<i>Ví dụ: Tạo đơn Canva 1 năm cho anh Tuấn 0912345678</i>\n\n' +
      'Gõ /goi để xem danh sách dịch vụ hiện có.';

    await sendTelegramMessage({
      chatId,
      text: errorMsg,
    });
    return;
  }

  const { productId, variantId, customerName, customerPhone, customerEmail, note } = extracted;

  if (!productId || !variantId) {
    await sendTelegramMessage({
      chatId,
      text: '⚠️ Không tìm thấy gói dịch vụ khớp với yêu cầu. Gõ /goi để xem danh sách gói khả dụng.',
    });
    return;
  }

  try {
    // 1. Fetch Variant & Price
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
        prices: { where: { role: 'member' } },
      },
    });

    if (!variant || !variant.product) {
      await sendTelegramMessage({
        chatId,
        text: '❌ Gói dịch vụ đã bị xoá hoặc tạm ngưng.',
      });
      return;
    }

    const priceRecord = variant.prices[0];
    const orderPrice = priceRecord ? priceRecord.price : 0;
    const finalCustomerName = (customerName && customerName.trim()) ? customerName.trim() : 'Khách Telegram';

    // 2. Resolve Admin User ID & Customer
    const adminUserId = await getAdminUserId();
    let customer = null;

    if (customerPhone && customerPhone.trim()) {
      customer = await prisma.customer.findUnique({
        where: { phone: customerPhone.trim() },
      });
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: finalCustomerName,
          phone: customerPhone && customerPhone.trim() ? customerPhone.trim() : null,
          email: customerEmail && customerEmail.trim() ? customerEmail.trim() : null,
          createdByUserId: adminUserId,
          source: 'telegram',
          note: 'Khách hàng tự động tạo từ Telegram Bot.',
        },
      });
    }

    // 3. Calculate End Date
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, variant.durationValue, variant.durationUnit);

    // 4. Create Order in DB
    const orderCode = generateOrderCode();
    const newOrder = await prisma.order.create({
      data: {
        orderCode,
        customerId: customer.id,
        createdByUserId: adminUserId,
        productId: variant.productId,
        variantId: variant.id,
        price: orderPrice,
        status: 'new',
        startDate,
        endDate,
        note: note || 'Tạo tự động qua Telegram Bot',
      },
      include: {
        customer: true,
        product: true,
        variant: true,
      },
    });

    // 5. Get SePay Banking details
    const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
    const accountNumber = settings?.sepayAccountNumber || process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NUMBER || '1015165449';
    const bankCode = settings?.sepayBankCode || process.env.NEXT_PUBLIC_SEPAY_BANK_CODE || 'Vietcombank';
    const accountName = settings?.sepayAccountName || process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NAME || 'NGUYEN THE VU';

    const paymentContent = getPaymentContent(orderCode);
    const qrUrl = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankCode}&amount=${orderPrice}&des=${encodeURIComponent(paymentContent)}`;

    // 6. Build Rich Caption & Send QR Photo to Telegram
    const caption =
      `🎉 <b>TẠO ĐƠN HÀNG THÀNH CÔNG!</b>\n\n` +
      `📌 <b>Mã đơn:</b> <code>${newOrder.orderCode}</code>\n` +
      `📦 <b>Sản phẩm:</b> ${newOrder.product.name} (${newOrder.variant.name})\n` +
      `👤 <b>Khách hàng:</b> ${newOrder.customer.name}\n` +
      `${newOrder.customer.phone ? `📞 <b>SĐT:</b> ${newOrder.customer.phone}\n` : ''}` +
      `💵 <b>Giá tiền:</b> <b>${orderPrice.toLocaleString('vi-VN')}đ</b>\n` +
      `📅 <b>Thời hạn:</b> ${startDate.toLocaleDateString('vi-VN')} ➔ ${endDate.toLocaleDateString('vi-VN')}\n\n` +
      `💳 <b>THÔNG TIN THANH TOÁN (SEPAY VIETQR):</b>\n` +
      `• <b>Ngân hàng:</b> ${bankCode}\n` +
      `• <b>Số tài khoản:</b> <code>${accountNumber}</code>\n` +
      `• <b>Chủ tài khoản:</b> ${accountName}\n` +
      `• <b>Số tiền:</b> <code>${orderPrice.toLocaleString('vi-VN')}</code>đ\n` +
      `• <b>Nội dung CK:</b> <code>${paymentContent}</code>\n\n` +
      `📲 <i>Quét mã QR trên để chuyển khoản tự động. Hệ thống sẽ báo Telegram ngay khi nhận tiền!</i>`;

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '🔄 Kiểm tra thanh toán ngay', callback_data: `cb_check_pay_${newOrder.orderCode}` },
        ],
        [
          { text: '📋 Danh sách đơn hàng', callback_data: 'cb_orders' },
          { text: '📦 Xem gói dịch vụ', callback_data: 'cb_products' },
        ],
      ],
    };

    await sendTelegramPhoto({
      chatId,
      photoUrl: qrUrl,
      caption,
      replyMarkup,
    });
  } catch (error: any) {
    console.error('[Telegram Bot] Error creating order:', error);
    await sendTelegramMessage({
      chatId,
      text: `❌ Lỗi hệ thống khi tạo đơn hàng: ${error.message || String(error)}`,
    });
  }
}

// Handler to check real-time payment status from Telegram callback query
async function checkOrderPaymentFromTelegram(
  chatId: string | number,
  callbackQueryId: string,
  orderCode: string
) {
  try {
    let order = await prisma.order.findFirst({
      where: { orderCode: { contains: orderCode, mode: 'insensitive' } },
      include: {
        customer: true,
        product: true,
        variant: true,
      },
    });

    if (!order) {
      await answerCallbackQuery(callbackQueryId, `❌ Không tìm thấy đơn hàng ${orderCode}`);
      return;
    }

    const currentPrice = order.customPrice !== null ? order.customPrice : order.price;

    // 1. Check if already marked paid / processing / running in DB
    if (order.amountPaid >= currentPrice || order.status === 'processing' || order.status === 'running') {
      await answerCallbackQuery(callbackQueryId, `✅ Đơn hàng ${order.orderCode} đã thanh toán thành công!`);

      const statusLabel = order.status === 'running' ? '✅ Đang chạy' : '🟢 Đang xử lý';
      const msg =
        `<b>🎉 ĐÃ XÁC NHẬN THANH TOÁN THÀNH CÔNG!</b>\n\n` +
        `📌 <b>Mã đơn:</b> <code>${order.orderCode}</code>\n` +
        `👤 <b>Khách hàng:</b> ${order.customer.name}\n` +
        `📦 <b>Sản phẩm:</b> ${order.product.name} (${order.variant.name})\n` +
        `💵 <b>Đã nhận:</b> <code>${order.amountPaid.toLocaleString('vi-VN')}đ</code> / ${currentPrice.toLocaleString('vi-VN')}đ\n` +
        `⚙️ <b>Trạng thái:</b> ${statusLabel}`;

      await sendTelegramMessage({ chatId, text: msg });
      return;
    }

    // 2. Query SePay REST API directly to fetch real-time transactions if API key exists
    const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
    const sepayApiKey = settings?.sepayApiKey || process.env.SEPAY_API_KEY;
    const accountNumber = settings?.sepayAccountNumber || process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NUMBER || '1015165449';

    if (sepayApiKey && sepayApiKey !== 'thay_bang_api_key_webhook_sepay') {
      try {
        const sepayRes = await fetch(`https://my.sepay.vn/userapi/transactions/list?account_number=${accountNumber}&limit=20`, {
          headers: {
            Authorization: `Bearer ${sepayApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (sepayRes.ok) {
          const sepayData = await sepayRes.json();
          const transactions = sepayData.transactions || [];

          for (const tx of transactions) {
            const content = tx.transaction_content || tx.content || '';
            const matchedCode = extractOrderCodeFromContent(content);

            if (matchedCode && matchedCode.toUpperCase() === order.orderCode.toUpperCase()) {
              const amount = Number(tx.amount_in || tx.amount || 0);
              const newAmountPaid = order.amountPaid + amount;
              const newStatus = newAmountPaid >= currentPrice ? 'processing' : order.status;

              const updatedOrder = await prisma.order.update({
                where: { id: order.id },
                data: {
                  amountPaid: newAmountPaid,
                  status: newStatus,
                },
                include: { customer: true, product: true, variant: true },
              });

              await prisma.paymentTransaction.create({
                data: {
                  sepayId: String(tx.id),
                  orderId: order.id,
                  amount,
                  content,
                  code: order.orderCode,
                  accountNumber,
                  gateway: tx.bank_brand_name || 'SePay',
                  transactionAt: new Date(tx.transaction_date || Date.now()),
                  matched: true,
                  raw: tx,
                },
              });

              await answerCallbackQuery(callbackQueryId, `🎉 Đã tìm thấy giao dịch +${amount.toLocaleString('vi-VN')}đ!`);

              const successMsg =
                `<b>🎉 ĐÃ KHỚP THANH TOÁN MỚI TỪ SEPAY!</b>\n\n` +
                `📌 <b>Mã đơn:</b> <code>${updatedOrder.orderCode}</code>\n` +
                `👤 <b>Khách hàng:</b> ${updatedOrder.customer.name}\n` +
                `📦 <b>Sản phẩm:</b> ${updatedOrder.product.name} (${updatedOrder.variant.name})\n` +
                `💵 <b>Số tiền vừa nhận:</b> <code>+${amount.toLocaleString('vi-VN')}đ</code>\n` +
                `📊 <b>Tổng đã thanh toán:</b> ${newAmountPaid.toLocaleString('vi-VN')}đ / ${currentPrice.toLocaleString('vi-VN')}đ\n` +
                `⚙️ <b>Trạng thái đơn:</b> 🟢 Đang xử lý`;

              await sendTelegramMessage({ chatId, text: successMsg });
              return;
            }
          }
        }
      } catch (sepayErr) {
        console.error('[Telegram Bot] SePay API check error:', sepayErr);
      }
    }

    // 3. Payment not detected yet
    await answerCallbackQuery(
      callbackQueryId,
      `⏳ Chưa thấy giao dịch cho đơn ${order.orderCode}. Vui lòng thử lại sau 10-30s.`
    );

    const pendingMsg =
      `⏳ <b>CHƯA NHẬN ĐƯỢC THANH TOÁN CHO ĐƠN ${order.orderCode}</b>\n\n` +
      `📌 <b>Mã đơn:</b> <code>${order.orderCode}</code>\n` +
      `💵 <b>Cần thanh toán:</b> <code>${currentPrice.toLocaleString('vi-VN')}đ</code>\n` +
      `📊 <b>Đã nhận:</b> ${order.amountPaid.toLocaleString('vi-VN')}đ\n\n` +
      `💡 <i>Nếu bạn vừa chuyển khoản thành công, ngân hàng có thể mất 10-30 giây để xử lý. Bạn hãy bấm nút <b>🔄 Kiểm tra thanh toán ngay</b> bên dưới để kiểm tra lại!</i>`;

    const retryMarkup = {
      inline_keyboard: [
        [
          { text: '🔄 Kiểm tra thanh toán ngay', callback_data: `cb_check_pay_${order.orderCode}` },
        ],
      ],
    };

    await sendTelegramMessage({ chatId, text: pendingMsg, replyMarkup: retryMarkup });
  } catch (err: any) {
    console.error('[Telegram Bot] checkOrderPaymentFromTelegram error:', err);
    await answerCallbackQuery(callbackQueryId, '❌ Lỗi khi kiểm tra thanh toán.');
  }
}

// Render product catalog list
async function sendProductCatalog(chatId: string | number) {
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    include: {
      variants: {
        where: { status: 'active' },
        include: { prices: { where: { role: 'member' } } },
      },
    },
  });

  if (products.length === 0) {
    await sendTelegramMessage({
      chatId,
      text: '📦 <b>Danh sách dịch vụ:</b> Hiện chưa có sản phẩm nào trong hệ thống.',
    });
    return;
  }

  let text = '📦 <b>DANH SÁCH GÓI DỊCH VỤ HIỆN CÓ:</b>\n\n';

  products.forEach((p, idx) => {
    text += `<b>${idx + 1}. ${p.name}</b>\n`;
    p.variants.forEach((v) => {
      const priceRecord = v.prices[0];
      const price = priceRecord ? priceRecord.price : 0;
      text += `   • ${v.name}: <code>${price.toLocaleString('vi-VN')}đ</code> / ${v.durationValue} ${v.durationUnit === 'month' ? 'tháng' : v.durationUnit === 'year' ? 'năm' : 'ngày'}\n`;
    });
    text += '\n';
  });

  text += '👉 <b>Để tạo đơn, bạn nhắn tin theo mẫu:</b>\n';
  text += '<code>Tạo đơn [Tên gói dịch vụ] cho [Tên khách] [SĐT]</code>\n\n';
  text += '<i>Ví dụ: Tạo đơn Canva 1 năm cho Anh Nam 0912345678</i>';

  await sendTelegramMessage({ chatId, text });
}

// Render recent orders list
async function sendRecentOrders(chatId: string | number) {
  const orders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      product: true,
      variant: true,
    },
  });

  if (orders.length === 0) {
    await sendTelegramMessage({
      chatId,
      text: '📋 <b>Danh sách đơn hàng:</b> Chưa có đơn hàng nào.',
    });
    return;
  }

  let text = '📋 <b>5 ĐƠN HÀNG GẦN ĐÂY NHẤT:</b>\n\n';

  orders.forEach((o, idx) => {
    const statusLabel =
      o.status === 'new' ? '🟡 Đơn mới' :
      o.status === 'processing' ? '🟢 Đang xử lý' :
      o.status === 'running' ? '✅ Đang chạy' :
      o.status === 'expired_soon' ? '⚠️ Sắp hết hạn' :
      o.status === 'expired' ? '🔴 Đã hết hạn' : o.status;

    text += `<b>${idx + 1}. ${o.orderCode}</b> - ${statusLabel}\n`;
    text += `   • Gói: ${o.product.name} (${o.variant.name})\n`;
    text += `   • Khách: ${o.customer.name} ${o.customer.phone ? `(${o.customer.phone})` : ''}\n`;
    text += `   • Giá: ${o.price.toLocaleString('vi-VN')}đ (Đã nhận: ${o.amountPaid.toLocaleString('vi-VN')}đ)\n\n`;
  });

  await sendTelegramMessage({ chatId, text });
}

// Send main menu & greeting
async function sendMainMenu(chatId: string | number) {
  const text =
    '🤖 <b>CHÀO MỪNG ĐẾN VỚI BOT NHANH MEDIA!</b>\n\n' +
    'Tôi là Bot tự động tạo đơn hàng & xuất mã VietQR SePay.\n\n' +
    '💡 <b>HƯỚNG DẪN TẠO ĐƠN HÀNG NHANH:</b>\n' +
    'Bạn chỉ cần gõ nội dung như trò chuyện bình thường, ví dụ:\n' +
    '• <code>Tạo đơn Canva Pro 1 năm cho Anh Tuấn 0912345678</code>\n' +
    '• <code>Tạo đơn Netflix 6 tháng chị Mai</code>\n\n' +
    '⚙️ <b>CÁC LỆNH HỖ TRỢ:</b>\n' +
    '• /goi - Xem danh sách gói dịch vụ & bảng giá\n' +
    '• /donhang - Xem danh sách đơn hàng gần đây\n' +
    '• /help - Hướng dẫn chi tiết';

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '📦 Danh sách gói dịch vụ', callback_data: 'cb_products' },
        { text: '📋 Đơn hàng gần đây', callback_data: 'cb_orders' },
      ],
    ],
  };

  await sendTelegramMessage({ chatId, text, replyMarkup });
}

// Telegram Webhook GET (Diagnostics & Helper)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
  const token = process.env.TELEGRAM_BOT_TOKEN || settings?.telegramBotToken;

  if (!token) {
    return NextResponse.json({
      status: 'error',
      message: 'TELEGRAM_BOT_TOKEN is not configured in .env or website settings UI.',
    });
  }

  if (action === 'set_webhook') {
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const webhookUrl = `${protocol}://${host}/api/webhooks/telegram`;
    const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET || settings?.telegramWebhookSecret || 'nhanh_media_tele_webhook_secret_2026';

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secretToken,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ webhookUrl, result: data });
  }

  // Get Webhook Info
  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await res.json();

  return NextResponse.json({
    botTokenConfigured: true,
    webhookInfo: data,
    setupGuide: 'To set webhook automatically, visit: /api/webhooks/telegram?action=set_webhook',
  });
}

// Telegram Webhook POST Handler
export async function POST(req: Request) {
  try {
    const secretHeader = req.headers.get('x-telegram-bot-api-secret-token');
    const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
    const secretConfigured = process.env.TELEGRAM_WEBHOOK_SECRET || settings?.telegramWebhookSecret;

    if (secretConfigured && secretHeader && secretHeader !== secretConfigured) {
      return NextResponse.json({ error: 'Unauthorized secret token.' }, { status: 401 });
    }

    const update = await req.json();

    // 1. Handle Callback Queries (Inline Button Clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat?.id;
      const data = cb.data;

      await answerCallbackQuery(cb.id);

      if (chatId) {
        if (data === 'cb_products') {
          await answerCallbackQuery(cb.id);
          await sendProductCatalog(chatId);
        } else if (data === 'cb_orders') {
          await answerCallbackQuery(cb.id);
          await sendRecentOrders(chatId);
        } else if (data && data.startsWith('cb_check_pay_')) {
          const orderCode = data.replace('cb_check_pay_', '').trim();
          await checkOrderPaymentFromTelegram(chatId, cb.id, orderCode);
        } else {
          await answerCallbackQuery(cb.id);
        }
      }

      return NextResponse.json({ ok: true });
    }

    // 2. Handle Messages
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // Command handling
    if (text === '/start' || text === '/help') {
      await sendMainMenu(chatId);
    } else if (text === '/goi' || text === '/sanpham' || text === '/danhsach') {
      await sendProductCatalog(chatId);
    } else if (text === '/donhang') {
      await sendRecentOrders(chatId);
    } else {
      // Natural language / order creation intent
      await processOrderCreation(chatId, text);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Telegram Webhook Error]:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
