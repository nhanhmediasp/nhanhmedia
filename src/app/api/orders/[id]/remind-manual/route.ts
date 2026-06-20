import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { createAuditLog } from '@/lib/audit';

// Helper to replace email template variables
export function formatEmailBody(
  body: string,
  data: {
    customerName: string;
    productName: string;
    orderCode: string;
    startDate: string;
    endDate: string;
    creatorName: string;
    companyName: string;
  }
): string {
  return body
    .replace(/\{\{customer_name\}\}/g, data.customerName)
    .replace(/\{\{product_name\}\}/g, data.productName)
    .replace(/\{\{order_code\}\}/g, data.orderCode)
    .replace(/\{\{start_date\}\}/g, data.startDate)
    .replace(/\{\{end_date\}\}/g, data.endDate)
    .replace(/\{\{creator_name\}\}/g, data.creatorName)
    .replace(/\{\{company_name\}\}/g, data.companyName);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    // 1. Fetch order details
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        variant: true,
        createdByUser: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Đơn hàng không tồn tại.' }, { status: 404 });
    }

    if (!order.customer.email) {
      return NextResponse.json(
        { error: 'Khách hàng này không cấu hình địa chỉ Email. Không thể gửi email nhắc nhở.' },
        { status: 400 }
      );
    }

    // 2. Fetch SMTP configurations from Database
    const smtpSettings = await prisma.emailSettings.findUnique({
      where: { id: 'default' },
    });

    if (!smtpSettings) {
      return NextResponse.json(
        { error: 'Hệ thống chưa cấu hình SMTP trong Admin. Vui lòng thiết lập trước.' },
        { status: 400 }
      );
    }

    // Decrypt SMTP password safely
    const smtpPassword = decrypt(smtpSettings.smtpPasswordEncrypted);

    // 3. Fetch template corresponding to order status (default to reminder_3_days or custom)
    let templateType = 'reminder_3_days';
    if (order.status === 'expired') {
      templateType = 'reminder_expired';
    } else if (order.status === 'expired_soon') {
      templateType = 'reminder_3_days';
    }

    let template = await prisma.emailTemplate.findFirst({
      where: { type: templateType },
    });

    // Fallback template if not found in DB
    if (!template) {
      template = {
        id: 'fallback',
        name: 'Nhắc nhở mặc định',
        subject: `Nhắc gia hạn dịch vụ ${order.product.name}`,
        body: 'Xin chào {{customer_name}}, dịch vụ {{product_name}} của bạn sẽ hết hạn vào ngày {{end_date}}. Vui lòng liên hệ {{creator_name}} để gia hạn.',
        type: 'fallback',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // 4. Format template values
    const dataForFormatting = {
      customerName: order.customer.name,
      productName: order.product.name,
      orderCode: order.orderCode,
      startDate: new Date(order.startDate).toLocaleDateString('vi-VN'),
      endDate: new Date(order.endDate).toLocaleDateString('vi-VN'),
      creatorName: order.createdByUser.name,
      companyName: smtpSettings.fromName || 'Nhanh Media',
    };

    const formattedSubject = formatEmailBody(template.subject, dataForFormatting);
    const formattedBody = formatEmailBody(template.body, dataForFormatting);

    // 5. Setup nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtpHost,
      port: smtpSettings.smtpPort,
      secure: smtpSettings.smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpSettings.smtpUser,
        pass: smtpPassword,
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false,
      },
    });

    // 6. Send email
    let sendStatus = 'success';
    let errorMessage = null;

    try {
      await transporter.sendMail({
        from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
        to: order.customer.email,
        subject: formattedSubject,
        text: formattedBody, // Simple text body
        html: formattedBody.replace(/\n/g, '<br>'), // Simple HTML conversion
      });
    } catch (sendError: any) {
      console.error('Nodemailer send error:', sendError);
      sendStatus = 'failed';
      errorMessage = sendError.message || String(sendError);
    }

    // 7. Log to database
    await prisma.emailLog.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        emailTo: order.customer.email,
        subject: formattedSubject,
        body: formattedBody,
        status: sendStatus,
        errorMessage: errorMessage,
      },
    });

    await createAuditLog({
      action: 'SEND_REMINDER_EMAIL',
      actionLabel: 'Gửi email nhắc hạn thủ công',
      module: 'orders',
      entityType: 'Order',
      entityId: order.id,
      entityName: order.orderCode,
      description: sendStatus === 'success'
        ? `Đã gửi email nhắc hạn thành công tới ${order.customer.email} cho đơn hàng ${order.orderCode}`
        : `Gửi email nhắc hạn thất bại tới ${order.customer.email} cho đơn hàng ${order.orderCode}`,
      oldValues: {
        email: order.customer.email,
        status: order.status
      },
      newValues: {
        email: order.customer.email,
        status: order.status,
        sendStatus,
        errorMessage
      },
      request: req,
      status: sendStatus === 'success' ? 'success' : 'failed',
      errorMessage: errorMessage || undefined
    });

    if (sendStatus === 'failed') {
      return NextResponse.json(
        {
          error: `Đã kết nối SMTP nhưng gửi thư thất bại: ${errorMessage}. Vui lòng kiểm tra lại cấu hình tài khoản SMTP của bạn.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Đã gửi email nhắc nhở thành công tới địa chỉ ${order.customer.email}!`,
    });
  } catch (error) {
    console.error('Manual remind error:', error);
    return NextResponse.json({ error: 'Lỗi gửi email máy chủ.' }, { status: 500 });
  }
}

