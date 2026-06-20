import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { calculateEndDate } from '../../orders/route';
import { formatEmailBody } from '../../orders/[id]/remind-manual/route';

export async function POST(req: Request) {
  return handleCron(req);
}

export async function GET(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tokenParam = searchParams.get('token');
    
    const authHeader = req.headers.get('authorization');
    let clientToken = tokenParam;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      clientToken = authHeader.substring(7);
    }

    const cronSecret = process.env.CRON_SECRET || 'nhanh_media_cron_job_secret_key_2026_v1';

    if (clientToken !== cronSecret) {
      return NextResponse.json({ error: 'Không có quyền truy cập.' }, { status: 401 });
    }

    // 1. Fetch SMTP settings
    const smtpSettings = await prisma.emailSettings.findUnique({
      where: { id: 'default' },
    });

    if (!smtpSettings) {
      return NextResponse.json(
        { message: 'Bỏ qua cron job. Chưa cấu hình SMTP default trong hệ thống.' },
        { status: 200 }
      );
    }

    const smtpPassword = decrypt(smtpSettings.smtpPasswordEncrypted);

    // Setup nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtpHost,
      port: smtpSettings.smtpPort,
      secure: smtpSettings.smtpSecure,
      auth: {
        user: smtpSettings.smtpUser,
        pass: smtpPassword,
      },
      tls: { rejectUnauthorized: false },
    });

    // 2. Fetch enabled reminder settings
    const activeReminders = await prisma.reminderSettings.findMany({
      where: { enabled: true },
    });

    let emailsSent = 0;
    let errorsOccurred = 0;
    let statusesUpdated = 0;
    const processLogs: string[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const reminder of activeReminders) {
      const days = reminder.daysBefore;
      
      // Calculate target date range (endDate must be on this day)
      const targetStart = new Date(today);
      targetStart.setDate(today.getDate() + days);
      
      const targetEnd = new Date(targetStart);
      targetEnd.setHours(23, 59, 59, 999);

      // Map daysBefore to template type
      let templateType = 'reminder_3_days';
      if (days === 7) templateType = 'reminder_7_days';
      else if (days === 3) templateType = 'reminder_3_days';
      else if (days === 1) templateType = 'reminder_1_day';
      else if (days === 0) templateType = 'reminder_expired';

      const template = await prisma.emailTemplate.findFirst({
        where: { type: templateType },
      });

      if (!template) {
        processLogs.push(`Bỏ qua mốc ${days} ngày trước hạn vì thiếu Template tương ứng.`);
        continue;
      }

      // Find orders expiring on target day
      const orders = await prisma.order.findMany({
        where: {
          endDate: { gte: targetStart, lte: targetEnd },
          status: { notIn: ['cancelled', 'expired'] }, // Skip cancelled/already marked expired
        },
        include: {
          customer: true,
          product: true,
          variant: true,
          createdByUser: true,
        },
      });

      processLogs.push(`Tìm thấy ${orders.length} đơn hàng hết hạn vào mốc ${days} ngày tới.`);

      for (const order of orders) {
        // A) Update order status if expired or expiring soon
        if (days === 0 && order.status !== 'expired') {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'expired' },
          });
          statusesUpdated++;
        } else if ((days === 1 || days === 3) && order.status === 'running') {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'expired_soon' },
          });
          statusesUpdated++;
        }

        // Skip sending email if customer does not have email
        if (!order.customer.email) {
          continue;
        }

        // B) Format templates
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

        // C) Check if email was already sent for this order and this specific template subject
        // to prevent double sending
        const alreadySentCount = await prisma.emailLog.count({
          where: {
            orderId: order.id,
            subject: formattedSubject,
            status: 'success',
          },
        });

        if (alreadySentCount > 0) {
          continue; // Already successfully sent, skip
        }

        // D) Send email via SMTP
        let sendStatus = 'success';
        let errMessage = null;

        try {
          await transporter.sendMail({
            from: `"${smtpSettings.fromName}" <${smtpSettings.fromEmail}>`,
            to: order.customer.email,
            subject: formattedSubject,
            text: formattedBody,
            html: formattedBody.replace(/\n/g, '<br>'),
          });
          emailsSent++;
        } catch (sendErr: any) {
          console.error(`Cron fail sending to ${order.customer.email}:`, sendErr);
          sendStatus = 'failed';
          errMessage = sendErr.message || String(sendErr);
          errorsOccurred++;
        }

        // E) Log details
        await prisma.emailLog.create({
          data: {
            orderId: order.id,
            customerId: order.customerId,
            emailTo: order.customer.email,
            subject: formattedSubject,
            body: formattedBody,
            status: sendStatus,
            errorMessage: errMessage,
          },
        });
      }
    }

    return NextResponse.json({
      message: 'Hoàn thành chạy Cron nhắc hạn thành công!',
      stats: {
        emailsSent,
        errorsOccurred,
        statusesUpdated,
      },
      logs: processLogs,
    });
  } catch (error) {
    console.error('Cron reminders handler error:', error);
    return NextResponse.json({ error: 'Lỗi thực thi cron nhắc hạn.' }, { status: 500 });
  }
}
