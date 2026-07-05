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

    // 1. Fetch SMTP settings (Optional - does not block in-app notifications)
    const smtpSettings = await prisma.emailSettings.findUnique({
      where: { id: 'default' },
    });

    let transporter: nodemailer.Transporter | null = null;
    if (smtpSettings) {
      try {
        const smtpPassword = decrypt(smtpSettings.smtpPasswordEncrypted);
        transporter = nodemailer.createTransport({
          host: smtpSettings.smtpHost,
          port: smtpSettings.smtpPort,
          secure: smtpSettings.smtpSecure,
          auth: {
            user: smtpSettings.smtpUser,
            pass: smtpPassword,
          },
          tls: { rejectUnauthorized: false },
        });
      } catch (err) {
        console.error('SMTP initialization error:', err);
      }
    } else {
      console.log('Cron Job: Bỏ qua gửi email vì chưa cấu hình SMTP default trong hệ thống.');
    }

    // Fetch a user ID for notification creator
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    });
    const createdByUserId = adminUser?.id || (await prisma.user.findFirst({ select: { id: true } }))?.id;

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

      // Map daysBefore to template type (Optional for email, not required for in-app notification)
      let templateType = 'reminder_3_days';
      if (days === 7) templateType = 'reminder_7_days';
      else if (days === 3) templateType = 'reminder_3_days';
      else if (days === 1) templateType = 'reminder_1_day';
      else if (days === 0) templateType = 'reminder_expired';

      const template = await prisma.emailTemplate.findFirst({
        where: { type: templateType },
      });

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

      processLogs.push(`Mốc ${days} ngày: Tìm thấy ${orders.length} đơn hàng.`);

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

        // B) Create in-app notification for order expiring
        if (createdByUserId) {
          const notifTitle = days === 0 
            ? `Đơn hàng ${order.orderCode} đã hết hạn` 
            : `Đơn hàng ${order.orderCode} sắp hết hạn (${days} ngày)`;

          const existingNotification = await prisma.notification.findFirst({
            where: { title: notifTitle }
          });

          if (!existingNotification) {
            await prisma.notification.create({
              data: {
                title: notifTitle,
                content: `Đơn hàng dịch vụ của khách hàng ${order.customer.name} (sản phẩm ${order.product.name}) ${days === 0 ? 'đã hết hạn vào hôm nay' : `sẽ hết hạn vào ngày ${new Date(order.endDate).toLocaleDateString('vi-VN')}`}. Người tạo đơn: ${order.createdByUser.name}.`,
                targetRole: 'all',
                createdByUserId,
              }
            });
            processLogs.push(`Tạo thông báo in-app đơn hàng: "${notifTitle}"`);
          }
        }

        // C) Send email via SMTP if transporter, smtpSettings, template and customer email exist
        if (transporter && smtpSettings && template && order.customer.email) {
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

          // Check if email was already sent
          const alreadySentCount = await prisma.emailLog.count({
            where: {
              orderId: order.id,
              subject: formattedSubject,
              status: 'success',
            },
          });

          if (alreadySentCount === 0) {
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

            // Log details
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
      }
    }

    // 3. Auto-notify for urgent / overdue running projects
    const runningProjects = await prisma.project.findMany({
      where: {
        status: 'running',
        endDate: { not: null },
      },
    });

    let projectNotifsCreated = 0;

    for (const project of runningProjects) {
      const deadline = new Date(project.endDate!);
      deadline.setHours(0, 0, 0, 0);

      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let notifTitle = '';
      let notifContent = '';

      if (diffDays < 0) {
        notifTitle = `Dự án "${project.name}" đã quá hạn!`;
        notifContent = `Dự án "${project.name}" (Tiến độ: ${project.progress}%) đã quá hạn hoàn thành từ ngày ${new Date(project.endDate!).toLocaleDateString('vi-VN')}. Vui lòng kiểm tra lại.`;
      } else if (diffDays <= 3) {
        notifTitle = `Dự án "${project.name}" sắp tới hạn!`;
        notifContent = `Dự án "${project.name}" (Tiến độ: ${project.progress}%) sắp tới hạn hoàn thành vào ngày ${new Date(project.endDate!).toLocaleDateString('vi-VN')} (còn ${diffDays} ngày).`;
      }

      if (notifTitle && createdByUserId) {
        const existing = await prisma.notification.findFirst({
          where: { title: notifTitle }
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              title: notifTitle,
              content: notifContent,
              targetRole: 'all',
              createdByUserId,
            }
          });
          projectNotifsCreated++;
          processLogs.push(`Tạo thông báo in-app dự án: "${notifTitle}"`);
        }
      }
    }

    return NextResponse.json({
      message: 'Hoàn thành chạy Cron nhắc hạn thành công!',
      stats: {
        emailsSent,
        errorsOccurred,
        statusesUpdated,
        projectNotifsCreated,
      },
      logs: processLogs,
    });
  } catch (error) {
    console.error('Cron reminders handler error:', error);
    return NextResponse.json({ error: 'Lỗi thực thi cron nhắc hạn.' }, { status: 500 });
  }
}
