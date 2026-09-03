import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createOrderWithUniqueCode } from '@/lib/order-code';
import { calculateEndDate } from '@/lib/datetime';
import { resolveCustomer } from '@/lib/customer';

async function getAdminUserId(): Promise<string> {
  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true },
  });
  if (adminUser) return adminUser.id;
  const anyUser = await prisma.user.findFirst({ select: { id: true } });
  return anyUser ? anyUser.id : 'system';
}

function parseToolArguments(rawArguments: unknown): Record<string, any> {
  if (rawArguments && typeof rawArguments === 'object') return rawArguments as Record<string, any>;
  if (typeof rawArguments !== 'string') return {};

  try {
    const parsed = JSON.parse(rawArguments);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    // Models occasionally wrap JSON in a code fence or add a short explanation.
    const jsonCandidate = rawArguments.match(/\{[\s\S]*\}/)?.[0];
    try {
      const parsed = jsonCandidate ? JSON.parse(jsonCandidate) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
}

// 1. Tool execution logic (Manipulating Database)
async function executeTool(name: string, args: any) {
  console.log(`[AI Assistant Agent] Executing tool "${name}" with args:`, args);
  try {
    if (name === 'createOrder') {
      const { productName, variantName, customerName, customerPhone, customerEmail, price, customPrice, importPrice, cost, note } = args;
      if (!productName || !customerName) {
        return { success: false, message: 'Cần có tên sản phẩm và tên khách hàng để tạo đơn.' };
      }

      const product = await prisma.product.findFirst({
        where: { name: { contains: productName, mode: 'insensitive' }, status: 'active' },
        include: {
          variants: {
            where: { status: 'active' },
            include: { prices: { where: { role: 'member' } } },
          },
        },
      });

      if (!product || product.variants.length === 0) {
        return { success: false, message: `Không tìm thấy sản phẩm "${productName}" trong danh mục.` };
      }

      let selectedVariant = product.variants[0];
      if (variantName) {
        const foundV = product.variants.find((v) =>
          v.name.toLowerCase().includes(variantName.toLowerCase())
        );
        if (!foundV) {
          return {
            success: false,
            message: `Sản phẩm "${product.name}" chưa có gói "${variantName}". Các gói hiện có: ${product.variants.map((v) => v.name).join(', ')}.`,
          };
        }
        selectedVariant = foundV;
      }

      const basePrice = selectedVariant.prices[0]?.price || 0;
      const requestedSalePrice = customPrice ?? price;
      const finalCustomPrice = requestedSalePrice !== undefined ? Number(requestedSalePrice) : null;
      const finalImportPrice = importPrice ?? cost;
      const parsedImportPrice = finalImportPrice !== undefined ? Number(finalImportPrice) : null;
      if ((finalCustomPrice !== null && (!Number.isFinite(finalCustomPrice) || finalCustomPrice < 0)) ||
        (parsedImportPrice !== null && (!Number.isFinite(parsedImportPrice) || parsedImportPrice < 0))) {
        return { success: false, message: 'Giá bán hoặc chi phí phải là số không âm.' };
      }
      const adminUserId = await getAdminUserId();

      let customer = await resolveCustomer({ name: customerName, phone: customerPhone });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: customerName ? customerName.trim() : 'Khách Web Assistant',
            phone: customerPhone ? customerPhone.trim() : null,
            email: customerEmail ? customerEmail.trim() : null,
            createdByUserId: adminUserId,
            source: 'web_assistant',
            note: 'Tạo tự động qua Trợ lý AI',
          },
        });
      }

      const startDate = new Date();
      const endDate = calculateEndDate(startDate, selectedVariant.durationValue, selectedVariant.durationUnit);

      const newOrder = await createOrderWithUniqueCode((orderCode) =>
        prisma.order.create({
          data: {
            orderCode,
            customerId: customer!.id,
            createdByUserId: adminUserId,
            productId: product.id,
            variantId: selectedVariant.id,
            price: basePrice,
            customPrice: finalCustomPrice,
            importPrice: parsedImportPrice,
            status: 'new',
            startDate,
            endDate,
            note: note || 'Tạo tự động qua Trợ lý AI Web',
          },
          include: {
            customer: true,
            product: true,
            variant: true,
          },
        })
      );

      return {
        success: true,
        message: `🎉 Đã tạo thành công đơn hàng mới!\n- Mã đơn: **${newOrder.orderCode}**\n- Sản phẩm: **${product.name}** (${selectedVariant.name})\n- Khách hàng: **${customer.name}**\n- Giá bán: **${(finalCustomPrice ?? basePrice).toLocaleString('vi-VN')}đ**\n- Chi phí: **${parsedImportPrice === null ? 'Chưa nhập' : parsedImportPrice.toLocaleString('vi-VN') + 'đ'}**\n- Thời hạn: ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')}`,
      };
    }

    if (name === 'updateOrderFields') {
      const { orderCode, customPrice, importPrice, cost, status, note, internalNote, accountInfo } = args;
      if (!orderCode) return { success: false, message: 'Thiếu mã đơn hàng cần cập nhật.' };
      const data: Record<string, string | number | null> = {};
      if (customPrice !== undefined) data.customPrice = Number(customPrice);
      if (importPrice !== undefined || cost !== undefined) data.importPrice = Number(importPrice ?? cost);
      if (status !== undefined) data.status = status;
      if (note !== undefined) data.note = note || null;
      if (internalNote !== undefined) data.internalNote = internalNote || null;
      if (accountInfo !== undefined) data.accountInfo = accountInfo || null;
      if (Object.keys(data).length === 0) return { success: false, message: 'Chưa có trường nào cần cập nhật.' };
      const allowedStatuses = ['new', 'processing', 'running', 'expired_soon', 'expired', 'cancelled'];
      if (status !== undefined && !allowedStatuses.includes(status)) {
        return { success: false, message: `Trạng thái "${status}" không hợp lệ. Có thể dùng: new, processing, running, expired_soon, expired, cancelled.` };
      }
      if (('customPrice' in data && (typeof data.customPrice !== 'number' || !Number.isFinite(data.customPrice) || data.customPrice < 0)) ||
        ('importPrice' in data && (typeof data.importPrice !== 'number' || !Number.isFinite(data.importPrice) || data.importPrice < 0))) {
        return { success: false, message: 'Giá bán hoặc chi phí phải là số không âm.' };
      }
      const order = await prisma.order.findFirst({ where: { orderCode: { contains: orderCode, mode: 'insensitive' } } });
      if (!order) return { success: false, message: `Không tìm thấy đơn hàng "${orderCode}".` };
      const updated = await prisma.order.update({ where: { id: order.id }, data });
      return {
        success: true,
        message: `Đã cập nhật đơn **${updated.orderCode}** thành công.${updated.customPrice !== null ? ` Giá bán: ${updated.customPrice.toLocaleString('vi-VN')}đ.` : ''}${updated.importPrice !== null ? ` Chi phí: ${updated.importPrice.toLocaleString('vi-VN')}đ.` : ''}`,
      };
    }

    if (name === 'deleteOrder') {
      const { orderCode } = args;
      if (!orderCode) return { success: false, message: 'Thiếu mã đơn hàng cần xóa.' };

      const order = await prisma.order.findFirst({
        where: { orderCode: { contains: orderCode, mode: 'insensitive' } },
      });

      if (!order) return { success: false, message: `Không tìm thấy đơn hàng "${orderCode}".` };

      await prisma.order.delete({ where: { id: order.id } });
      return { success: true, message: `Đã xóa thành công đơn hàng "${order.orderCode}".` };
    }

    if (name === 'createProduct') {
      const { name: prodName, description, variantName, durationValue, durationUnit, price } = args;
      if (!prodName) return { success: false, message: 'Thiếu tên sản phẩm.' };

      const slug = prodName
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9 -]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') + '-' + Math.floor(100 + Math.random() * 900);

      const newProd = await prisma.product.create({
        data: {
          name: prodName.trim(),
          slug,
          description: description ? description.trim() : '',
          status: 'active',
          variants: {
            create: [
              {
                name: variantName ? variantName.trim() : 'Gói chuẩn',
                durationValue: Number(durationValue || 1),
                durationUnit: durationUnit || 'year',
                status: 'active',
                prices: {
                  create: [
                    {
                      role: 'member',
                      price: Number(price || 0),
                    },
                  ],
                },
              },
            ],
          },
        },
        include: { variants: true },
      });

      return {
        success: true,
        message: `🎉 Đã tạo thành công sản phẩm mới "${newProd.name}" với giá ${Number(price || 0).toLocaleString('vi-VN')}đ.`,
      };
    }

    if (name === 'deleteProduct') {
      const { productName } = args;
      if (!productName) return { success: false, message: 'Thiếu tên sản phẩm.' };

      const product = await prisma.product.findFirst({
        where: { name: { contains: productName, mode: 'insensitive' } },
      });

      if (!product) return { success: false, message: `Không tìm thấy sản phẩm "${productName}".` };

      await prisma.product.update({
        where: { id: product.id },
        data: { status: 'inactive' },
      });

      return { success: true, message: `Đã ngừng kinh doanh sản phẩm "${product.name}".` };
    }

    if (name === 'createCustomer') {
      const { name: custName, phone, email, note } = args;
      if (!custName) return { success: false, message: 'Thiếu tên khách hàng.' };

      const adminUserId = await getAdminUserId();
      const customer = await prisma.customer.create({
        data: {
          name: custName.trim(),
          phone: phone ? phone.trim() : null,
          email: email ? email.trim() : null,
          createdByUserId: adminUserId,
          source: 'web_assistant',
          note: note || 'Tạo tự động qua Trợ lý AI',
        },
      });

      return {
        success: true,
        message: `Đã tạo thành công hồ sơ khách hàng "${customer.name}"${customer.phone ? ` (SĐT: ${customer.phone})` : ''}.`,
      };
    }

    if (name === 'deleteCustomer') {
      const { phoneOrName } = args;
      if (!phoneOrName) return { success: false, message: 'Thiếu tên hoặc SĐT khách hàng.' };

      const customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: { contains: phoneOrName, mode: 'insensitive' } },
            { name: { contains: phoneOrName, mode: 'insensitive' } },
          ],
        },
      });

      if (!customer) return { success: false, message: `Không tìm thấy khách hàng "${phoneOrName}".` };

      await prisma.customer.delete({ where: { id: customer.id } });
      return { success: true, message: `Đã xóa khách hàng "${customer.name}".` };
    }

    if (name === 'deleteProject') {
      const { projectName } = args;
      if (!projectName) return { success: false, message: 'Thiếu tên dự án cần xóa.' };

      const project = await prisma.project.findFirst({
        where: { name: { contains: projectName, mode: 'insensitive' } },
      });

      if (!project) return { success: false, message: `Không tìm thấy dự án "${projectName}".` };

      await prisma.project.delete({ where: { id: project.id } });
      return { success: true, message: `Đã xóa thành công dự án "${project.name}".` };
    }

    if (name === 'createProject') {
      const { name: pName, description, startDate, endDate } = args;
      if (!pName || !startDate) {
        return { success: false, message: 'Thiếu tên dự án hoặc ngày bắt đầu.' };
      }

      const project = await prisma.$transaction(async (tx) => {
        const p = await tx.project.create({
          data: {
            name: pName.trim(),
            description: description ? description.trim() : null,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            status: 'running',
            progress: 0,
            budget: 0,
          },
        });

        // Create default Kanban columns for projects
        await tx.taskColumn.createMany({
          data: [
            { projectId: p.id, name: 'Cần làm', position: 0 },
            { projectId: p.id, name: 'Đang làm', position: 1 },
            { projectId: p.id, name: 'Hoàn thành', position: 2 },
          ],
        });
        return p;
      });

      return {
        success: true,
        message: `Đã tạo thành công dự án "${project.name}" với ngày bắt đầu ${new Date(
          startDate
        ).toLocaleDateString('vi-VN')} và 3 cột Kanban mặc định (Cần làm, Đang làm, Hoàn thành).`,
      };
    }

    if (name === 'updateProjectProgress') {
      const { projectName, progress } = args;
      if (!projectName || progress === undefined) {
        return { success: false, message: 'Thiếu tên dự án hoặc phần trăm tiến độ.' };
      }

      const project = await prisma.project.findFirst({
        where: { name: { contains: projectName, mode: 'insensitive' } },
      });

      if (!project) {
        return { success: false, message: `Không tìm thấy dự án nào có tên chứa "${projectName}".` };
      }

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { progress: Number(progress) },
      });

      return {
        success: true,
        message: `Đã cập nhật thành công tiến độ của dự án "${updated.name}" thành ${progress}%.`,
      };
    }

    if (name === 'updateProjectStatus') {
      const { projectName, status } = args;
      if (!projectName || !status) {
        return { success: false, message: 'Thiếu tên dự án hoặc trạng thái mới.' };
      }

      const allowedStatuses = ['running', 'completed', 'paused'];
      if (!allowedStatuses.includes(status)) {
        return { success: false, message: `Trạng thái "${status}" không hợp lệ. Phải là: running, completed, paused.` };
      }

      const project = await prisma.project.findFirst({
        where: { name: { contains: projectName, mode: 'insensitive' } },
      });

      if (!project) {
        return { success: false, message: `Không tìm thấy dự án nào có tên chứa "${projectName}".` };
      }

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: { status },
      });

      const statusLabel = status === 'running' ? 'Đang chạy' : status === 'completed' ? 'Hoàn thành' : 'Tạm dừng';
      return {
        success: true,
        message: `Đã chuyển đổi trạng thái của dự án "${updated.name}" thành "${statusLabel}" thành công.`,
      };
    }

    if (name === 'updateOrderStatus') {
      const { orderCode, status } = args;
      if (!orderCode || !status) {
        return { success: false, message: 'Thiếu mã đơn hàng hoặc trạng thái mới.' };
      }

      const allowedStatuses = ['running', 'expired', 'expired_soon', 'cancelled'];
      if (!allowedStatuses.includes(status)) {
        return { success: false, message: `Trạng thái "${status}" không hợp lệ cho đơn hàng.` };
      }

      const order = await prisma.order.findFirst({
        where: { orderCode: { contains: orderCode, mode: 'insensitive' } },
      });

      if (!order) {
        return { success: false, message: `Không tìm thấy đơn hàng nào có mã chứa "${orderCode}".` };
      }

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { status },
      });

      const statusLabel =
        status === 'running'
          ? 'Đang chạy'
          : status === 'expired'
          ? 'Đã hết hạn'
          : status === 'expired_soon'
          ? 'Sắp hết hạn'
          : 'Đã hủy';
      return {
        success: true,
        message: `Đã cập nhật trạng thái đơn hàng "${updated.orderCode}" thành "${statusLabel}" thành công.`,
      };
    }

    if (name === 'getRevenueReport') {
      const days = Number(args.days || 7);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // Query orders in the last N days
      const orders = await prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { not: 'cancelled' }
        },
        select: {
          price: true,
          customPrice: true,
          createdAt: true,
          product: { select: { name: true } }
        }
      });

      // Query renewals in the last N days
      const renewals = await prisma.orderRenewal.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          price: true,
          createdAt: true
        }
      });

      // Calculate daily breakdown
      const dailyData: Record<string, { date: string; ordersRevenue: number; renewalsRevenue: number; total: number; count: number }> = {};
      
      // Initialize days
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        dailyData[dateStr] = { date: dateStr, ordersRevenue: 0, renewalsRevenue: 0, total: 0, count: 0 };
      }

      // Populate orders
      orders.forEach(o => {
        const dateStr = new Date(o.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (dailyData[dateStr]) {
          const rev = o.customPrice !== null ? o.customPrice : o.price;
          dailyData[dateStr].ordersRevenue += rev;
          dailyData[dateStr].total += rev;
          dailyData[dateStr].count += 1;
        }
      });

      // Populate renewals
      renewals.forEach(r => {
        const dateStr = new Date(r.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (dailyData[dateStr]) {
          dailyData[dateStr].renewalsRevenue += r.price;
          dailyData[dateStr].total += r.price;
          dailyData[dateStr].count += 1;
        }
      });

      // Top selling products in this range
      const productCounts: Record<string, { name: string; revenue: number; count: number }> = {};
      orders.forEach(o => {
        const name = o.product.name;
        const rev = o.customPrice !== null ? o.customPrice : o.price;
        if (!productCounts[name]) {
          productCounts[name] = { name, revenue: 0, count: 0 };
        }
        productCounts[name].revenue += rev;
        productCounts[name].count += 1;
      });

      const topProducts = Object.values(productCounts)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const totalRevenue = Object.values(dailyData).reduce((sum, item) => sum + item.total, 0);
      const totalOrdersRevenue = Object.values(dailyData).reduce((sum, item) => sum + item.ordersRevenue, 0);
      const totalRenewalsRevenue = Object.values(dailyData).reduce((sum, item) => sum + item.renewalsRevenue, 0);

      // Return formatted breakdown list ordered by date ascending
      const breakdown = Object.values(dailyData).reverse();

      return {
        success: true,
        days,
        totalRevenue,
        totalOrdersRevenue,
        totalRenewalsRevenue,
        breakdown,
        topProducts,
        message: `Đã truy xuất báo cáo doanh thu ${days} ngày gần đây thành công.`
      };
    }

    if (name === 'getTopCustomersByRevenue') {
      const limit = Math.min(Math.max(Number(args.limit || 5), 1), 20);
      const days = Math.min(Math.max(Number(args.days || 30), 1), 3650);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const [orders, renewals] = await Promise.all([
        prisma.order.findMany({
          where: { createdAt: { gte: startDate }, status: { not: 'cancelled' } },
          select: {
            price: true,
            customPrice: true,
            customer: { select: { id: true, name: true, phone: true } },
          },
        }),
        prisma.orderRenewal.findMany({
          where: { createdAt: { gte: startDate }, order: { status: { not: 'cancelled' } } },
          select: {
            price: true,
            order: { select: { customer: { select: { id: true, name: true, phone: true } } } },
          },
        }),
      ]);

      const totals = new Map<string, { name: string; phone: string | null; revenue: number; orders: number; renewals: number }>();
      const addRevenue = (customer: { id: string; name: string; phone: string | null }, revenue: number, kind: 'order' | 'renewal') => {
        const current = totals.get(customer.id) || { name: customer.name, phone: customer.phone, revenue: 0, orders: 0, renewals: 0 };
        current.revenue += revenue;
        current[kind === 'order' ? 'orders' : 'renewals'] += 1;
        totals.set(customer.id, current);
      };

      orders.forEach((order) => addRevenue(order.customer, order.customPrice ?? order.price, 'order'));
      renewals.forEach((renewal) => addRevenue(renewal.order.customer, renewal.price, 'renewal'));

      const topCustomers = Array.from(totals.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)
        .map((customer, index) => ({ rank: index + 1, ...customer }));

      const lines = topCustomers.length
        ? topCustomers.map((customer) => `${customer.rank}. **${customer.name}**${customer.phone ? ` (${customer.phone})` : ''} — **${customer.revenue.toLocaleString('vi-VN')}đ** (${customer.orders} đơn, ${customer.renewals} lần gia hạn)`).join('\n')
        : 'Chưa có doanh thu trong khoảng thời gian này.';
      return {
        success: true,
        days,
        limit,
        topCustomers,
        message: `🏆 **Top ${limit} khách hàng theo doanh số trong ${days} ngày gần đây:**\n${lines}`,
      };
    }
  } catch (err: any) {
    console.error(`Error executing tool ${name}:`, err);
    return { success: false, message: `Lỗi hệ thống khi thực hiện thao tác: ${err.message || String(err)}` };
  }
  return { success: false, message: `Công cụ "${name}" chưa được định nghĩa.` };
}

// 2. Tool Definitions for Gemini (standard OpenAI tool schema)
const geminiTools = [
  {
    type: 'function',
    function: {
      name: 'createOrder',
      description: 'Tạo đơn hàng mới trực tiếp trên hệ thống cho khách hàng (tự động tạo hồ sơ khách hàng nếu chưa có).',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string', description: 'Tên sản phẩm dịch vụ (ví dụ: Canva Pro, Netflix...)' },
          variantName: { type: 'string', description: 'Tên gói variant (ví dụ: 1 năm, 6 tháng...)' },
          customerName: { type: 'string', description: 'Tên khách hàng' },
          customerPhone: { type: 'string', description: 'Số điện thoại khách hàng' },
          customerEmail: { type: 'string', description: 'Email khách hàng (tùy chọn)' },
          price: { type: 'number', description: 'Giá bán tùy chỉnh (VND), đồng nghĩa customPrice' },
          customPrice: { type: 'number', description: 'Giá bán thực tế cho khách hàng (VND)' },
          importPrice: { type: 'number', description: 'Chi phí/giá nhập của đơn hàng (VND)' },
          cost: { type: 'number', description: 'Cách gọi khác của chi phí/giá nhập (VND)' },
          note: { type: 'string', description: 'Ghi chú cho đơn hàng (tùy chọn)' },
        },
        required: ['productName', 'customerName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteOrder',
      description: 'Xóa hoàn toàn một đơn hàng theo mã đơn hàng.',
      parameters: {
        type: 'object',
        properties: {
          orderCode: { type: 'string', description: 'Mã đơn hàng cần xóa (ví dụ: NHANH260722-1234)' },
        },
        required: ['orderCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateOrderFields',
      description: 'Cập nhật một hoặc nhiều trường của đơn hàng theo mã đơn: giá bán, chi phí, trạng thái, ghi chú, ghi chú nội bộ hoặc thông tin tài khoản.',
      parameters: {
        type: 'object',
        properties: {
          orderCode: { type: 'string', description: 'Mã đơn hàng cần cập nhật' },
          customPrice: { type: 'number', description: 'Giá bán thực tế mới (VND)' },
          importPrice: { type: 'number', description: 'Chi phí/giá nhập mới (VND)' },
          cost: { type: 'number', description: 'Cách gọi khác của chi phí/giá nhập (VND)' },
          status: { type: 'string', description: 'Trạng thái mới: new, processing, running, expired_soon, expired, cancelled' },
          note: { type: 'string', description: 'Ghi chú cho khách hàng/đơn hàng' },
          internalNote: { type: 'string', description: 'Ghi chú nội bộ' },
          accountInfo: { type: 'string', description: 'Thông tin tài khoản dịch vụ' },
        },
        required: ['orderCode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createProduct',
      description: 'Thêm sản phẩm dịch vụ mới vào danh mục hệ thống kèm gói và giá tiền.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Tên sản phẩm mới' },
          description: { type: 'string', description: 'Mô tả sản phẩm (tùy chọn)' },
          variantName: { type: 'string', description: 'Tên gói đầu tiên (ví dụ: 1 năm, 6 tháng)' },
          durationValue: { type: 'number', description: 'Giá trị thời hạn (ví dụ: 1, 6, 12)' },
          durationUnit: { type: 'string', description: 'Đơn vị thời hạn: year, month, day' },
          price: { type: 'number', description: 'Giá bán cho gói này (VND)' },
        },
        required: ['name', 'price'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteProduct',
      description: 'Ngừng kinh doanh hoặc xóa một sản phẩm dịch vụ theo tên.',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string', description: 'Tên sản phẩm cần xóa' },
        },
        required: ['productName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createCustomer',
      description: 'Tạo hồ sơ khách hàng mới.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Tên khách hàng' },
          phone: { type: 'string', description: 'Số điện thoại' },
          email: { type: 'string', description: 'Email' },
          note: { type: 'string', description: 'Ghi chú thêm' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteCustomer',
      description: 'Xóa hồ sơ khách hàng theo tên hoặc số điện thoại.',
      parameters: {
        type: 'object',
        properties: {
          phoneOrName: { type: 'string', description: 'Tên hoặc số điện thoại khách hàng' },
        },
        required: ['phoneOrName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createProject',
      description: 'Tạo một dự án mới trên hệ thống với 3 cột Kanban mặc định (Cần làm, Đang làm, Hoàn thành).',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Tên dự án mới cần tạo' },
          description: { type: 'string', description: 'Mô tả chi tiết hoặc ghi chú về dự án (tùy chọn)' },
          startDate: { type: 'string', description: 'Ngày bắt đầu định dạng YYYY-MM-DD (bắt buộc)' },
          endDate: { type: 'string', description: 'Ngày kết thúc dự kiến định dạng YYYY-MM-DD (tùy chọn)' },
        },
        required: ['name', 'startDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteProject',
      description: 'Xóa một dự án khỏi hệ thống theo tên.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Tên dự án cần xóa' },
        },
        required: ['projectName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateProjectProgress',
      description: 'Cập nhật tiến độ hoàn thành của một dự án bằng cách tìm theo tên dự án.',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Tên hoặc một phần tên dự án cần cập nhật' },
          progress: { type: 'number', description: 'Phần trăm tiến độ mới cần thiết lập (từ 0 đến 100)' },
        },
        required: ['projectName', 'progress'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateProjectStatus',
      description: 'Cập nhật trạng thái của dự án (running, completed, paused).',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Tên hoặc một phần tên dự án cần cập nhật' },
          status: {
            type: 'string',
            description: 'Trạng thái mới: running (Đang chạy), completed (Hoàn thành), paused (Tạm dừng)',
          },
        },
        required: ['projectName', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateOrderStatus',
      description: 'Cập nhật trạng thái của một đơn hàng dịch vụ.',
      parameters: {
        type: 'object',
        properties: {
          orderCode: { type: 'string', description: 'Mã đơn hàng (ví dụ: ORD12345)' },
          status: {
            type: 'string',
            description: 'Trạng thái mới: running (Đang chạy), expired (Đã hết hạn), expired_soon (Sắp hết hạn), cancelled (Đã hủy)',
          },
        },
        required: ['orderCode', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTopCustomersByRevenue',
      description: 'Xếp hạng khách hàng có doanh số cao nhất trong một khoảng thời gian. Hiểu các cách hỏi như top 5 khách hàng, khách mua nhiều tiền nhất, khách doanh thu cao nhất.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Số lượng khách hàng cần lấy, mặc định 5, tối đa 20' },
          days: { type: 'number', description: 'Số ngày gần đây cần thống kê, mặc định 30 ngày' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRevenueReport',
      description: 'Lấy báo cáo doanh thu chi tiết (bao gồm doanh thu đơn hàng mới và gia hạn) và phân tích theo số ngày gần đây (ví dụ: 7 ngày hoặc 30 ngày gần đây).',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Số ngày gần đây cần lấy báo cáo doanh thu (mặc định là 7)' }
        },
        required: []
      }
    }
  }
];

// Helper to call Official Native Gemini REST API (:generateContent?key=) with fallback to OpenAI endpoint
async function callGeminiWithRetry(geminiKey: string, payload: any) {
  const models = [
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
  ];
  let lastError: any = null;

  // 1. Primary: Official Native Gemini REST API
  for (const model of models) {
    try {
      const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
      
      const nativePayload: any = {
        generationConfig: { temperature: payload.temperature || 0.2 },
      };

      if (payload.messages) {
        const sysMsg = payload.messages.find((m: any) => m.role === 'system');
        if (sysMsg) {
          nativePayload.systemInstruction = { parts: [{ text: sysMsg.content }] };
        }

        const chatMsgs = payload.messages.filter((m: any) => m.role !== 'system');
        nativePayload.contents = chatMsgs.map((m: any) => {
          if (m.role === 'tool') {
            let parsedRes = {};
            try { parsedRes = JSON.parse(m.content); } catch { parsedRes = { result: m.content }; }
            return {
              // Gemini Native REST accepts functionResponse in a user turn.
              // Sending role=function causes the second request to fail.
              role: 'user',
              parts: [{ functionResponse: { name: m.name || 'tool', response: parsedRes } }],
            };
          }
          if (m.tool_calls && m.tool_calls.length > 0) {
            const tc = m.tool_calls[0];
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(tc.function.arguments); } catch { parsedArgs = {}; }
            return {
              role: 'model',
              parts: [{ functionCall: { name: tc.function.name, args: parsedArgs } }],
            };
          }
          return {
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content || '' }],
          };
        });
      }

      if (payload.tools) {
        nativePayload.tools = [
          {
            functionDeclarations: payload.tools.map((t: any) => ({
              name: t.function.name,
              description: t.function.description,
              parameters: t.function.parameters,
            })),
          },
        ];
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(nativeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nativePayload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const nativeData = await res.json();
        const candidate = nativeData.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const funcCallPart = parts.find((p: any) => p.functionCall);

        if (funcCallPart && funcCallPart.functionCall) {
          const fc = funcCallPart.functionCall;
          return {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: null,
                  tool_calls: [
                    {
                      id: `call_${Date.now()}`,
                      type: 'function',
                      function: {
                        name: fc.name,
                        arguments: JSON.stringify(fc.args || {}),
                      },
                    },
                  ],
                },
              },
            ],
          };
        }

        const textPart = parts.find((p: any) => p.text);
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: textPart?.text || '',
              },
            },
          ],
        };
      }

      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${res.status}`;
      console.warn(`[Gemini Native REST API] Model ${model} returned ${res.status}: ${errMsg}. Trying fallback...`);
      lastError = new Error(errMsg);

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 2. Secondary Fallback: OpenAI Compatibility Endpoint
  for (const model of models) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${geminiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...payload, model }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Tất cả các endpoint và mô hình Gemini AI đều không thể kết nối.');
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    // 1. Fetch current projects context
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['running', 'paused'] },
      },
      include: {
        category: { select: { name: true } },
        customer: { select: { name: true, email: true, phone: true } },
        websiteCosts: { select: { name: true, amount: true } },
        toolCosts: { select: { name: true, cost: true } },
      },
    });

    // 2. Fetch active orders context
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['running', 'expired_soon', 'new'] },
      },
      include: {
        customer: { select: { name: true, email: true } },
        product: { select: { name: true } },
      },
    });

    // 3. Simplify contexts for LLM
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const projectsContext = projects.map((p) => {
      const isOverdue = p.endDate && new Date(p.endDate) < today && p.status === 'running';
      return {
        id: p.id,
        name: p.name,
        status: p.status === 'running' ? (isOverdue ? 'Quá hạn' : 'Đang làm') : 'Tạm dừng',
        progress: `${p.progress}%`,
        budget: p.budget,
        startDate: p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : 'Không rõ',
        endDate: p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : 'Chưa xác định',
        category: p.category?.name || 'Không phân loại',
        customer: p.customer?.name || 'Không rõ',
        websiteCostsTotal: p.websiteCosts.reduce((sum, c) => sum + c.amount, 0),
        toolCostsTotal: p.toolCosts.reduce((sum, c) => sum + c.cost, 0),
        description: p.description || '',
      };
    });

    const ordersContext = orders.map((o) => ({
      orderCode: o.orderCode,
      product: o.product.name,
      customer: o.customer.name,
      price: o.price,
      startDate: o.startDate ? new Date(o.startDate).toLocaleDateString('vi-VN') : 'Không rõ',
      endDate: o.endDate ? new Date(o.endDate).toLocaleDateString('vi-VN') : 'Chưa xác định',
      status: o.status === 'running' ? 'Đang chạy' : o.status === 'expired_soon' ? 'Sắp hết hạn' : 'Đơn mới',
    }));

    // 4. Check for API key (Gemini)
    const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
    const geminiKey = process.env.GEMINI_API_KEY || settings?.geminiApiKey;

    const body = await req.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const history = Array.isArray(body?.history) ? body.history.slice(-12) : [];

    if (!prompt) {
      return NextResponse.json({ error: 'Nội dung tin nhắn không được để trống.' }, { status: 400 });
    }

    const systemInstruction = `Bạn là Trợ lý AI của Nhanh Media 🤖, đang hỗ trợ trực tiếp cho quản trị viên.

PHONG CÁCH GIAO TIẾP:
- Hiểu tiếng Việt tự nhiên, tiếng lóng, viết tắt và câu thiếu dấu. Ví dụ “tạo hộ đơn cho anh A”, “check doanh thu tháng này”, “đổi dự án X sang xong” đều phải được hiểu theo ngữ cảnh.
- Trả lời thân thiện, rõ ràng, có cấu trúc; nếu người dùng nói mơ hồ thì hỏi lại đúng phần còn thiếu, không bắt họ phải viết lại cả câu.
- Khi người dùng hỏi thông tin, hãy trả lời bằng số liệu cụ thể từ dữ liệu bên dưới. Nếu không có dữ liệu thì nói thẳng là chưa tìm thấy.

QUY TẮC THỰC THI:
- Với yêu cầu tạo/cập nhật/xóa, luôn dùng tool tương ứng. Không được nói đã làm xong nếu tool chưa chạy thành công.
- Trước thao tác xóa hoặc thao tác có thể gây mất dữ liệu, phải xác nhận lại nếu người dùng chưa nói rõ ý định xóa.
- Nếu thiếu tham số bắt buộc, hỏi ngắn gọn tham số đó. Không tự bịa tên, giá, ngày tháng, mã đơn hoặc tiến độ.
- Có thể tự suy ra cách nói tương đương (ví dụ “hoàn tất”, “xong rồi” = completed; “đang làm” = processing/running), nhưng phải giữ nguyên dữ liệu người dùng cung cấp.
- Sau khi tool chạy, tóm tắt kết quả, nêu rõ bản ghi nào đã được tác động và báo lỗi bằng ngôn ngữ dễ hiểu nếu thất bại.
- Với câu hỏi xếp hạng/doanh số, dùng tool báo cáo phù hợp; “top 5 người/khách” mặc định là top 5 khách hàng theo tổng tiền đã bán, gồm cả đơn mới và gia hạn. “Tuần này”, “tháng này” hãy chuyển thành khoảng ngày tương ứng; nếu không nói thời gian thì dùng 30 ngày gần nhất.

Dưới đây là dữ liệu thực tế trong hệ thống của chúng tôi hiện tại (dạng JSON):
--- DỰ ÁN ĐANG CHẠY HOẶC TẠM DỪNG ---
${JSON.stringify(projectsContext, null, 2)}

--- ĐƠN HÀNG ĐANG HOẠT ĐỘNG ---
${JSON.stringify(ordersContext, null, 2)}
---
Hãy ưu tiên thông tin chính xác và hữu ích hơn việc trả lời thật ngắn.`;

    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      try {
        const geminiMessages = [
          { role: 'system', content: systemInstruction },
          ...history
            .filter((msg: any) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
            .map((msg: any) => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content,
              })),
          { role: 'user', content: prompt },
        ];

        const data = await callGeminiWithRetry(geminiKey, {
          messages: geminiMessages,
          tools: geminiTools,
          tool_choice: 'auto',
          temperature: 0.2,
        });

        const message = data.choices[0].message;

        // Check if LLM requested a tool call
        if (message.tool_calls && message.tool_calls.length > 0) {
          const toolCall = message.tool_calls[0];
          const functionName = toolCall.function.name;
          const functionArgs = parseToolArguments(toolCall.function.arguments);

          // Execute backend DB update
          const toolResult = await executeTool(functionName, functionArgs);

          // Feed result back to model for final summary
          const secondData = await callGeminiWithRetry(geminiKey, {
            messages: [
              ...geminiMessages,
              message,
              {
                role: 'tool',
                tool_call_id: toolCall.id,
                name: functionName,
                content: JSON.stringify(toolResult),
              },
            ],
            temperature: 0.2,
          });

          return NextResponse.json({ reply: secondData.choices?.[0]?.message?.content || toolResult.message });
        }

        return NextResponse.json({ reply: message.content });
      } catch (err: any) {
        console.error('Gemini Assistant Agent Error:', err);
        const isRateLimit = String(err.message).includes('429') || String(err.message).toLowerCase().includes('quota');
        const userReply = isRateLimit
          ? `⚠️ **API Key Gemini hiện đã vượt quá giới hạn lượt dùng (HTTP 429 - Rate Limit / Quota Exceeded).**\n\n` +
            `👉 **Cách khắc phục nhanh:**\n` +
            `1. Bạn vui lòng đợi khoảng 1 phút rồi gửi lại tin nhắn.\n` +
            `2. Hoặc tạo 1 API Key mới tại **[Google AI Studio](https://aistudio.google.com/)** và cập nhật vào mục **[Cài đặt Website](/admin/settings/website)** nhé!`
          : `Đã xảy ra lỗi khi thực thi lệnh qua máy chủ Gemini AI: ${err.message || String(err)}.`;

        return NextResponse.json({ reply: userReply });
      }
    } else {
      return NextResponse.json({
        reply: `Xin chào! Tôi là **Trợ lý của Nhanh Media** 🤖.

Hiện tại bạn chưa thiết lập khóa API Gemini để tôi hoạt động.

### Vui lòng cấu hình Gemini API (Hoàn toàn Miễn phí & Cực nhanh)
1. Truy cập **[Google AI Studio](https://aistudio.google.com/)** và đăng nhập bằng Google.
2. Bấm vào nút **Get API Key** -> **Create API Key**.
3. Copy khóa đó và dán vào file \`.env\`:
\`\`\`env
GEMINI_API_KEY="AIzaSy..."
\`\`\`

Sau khi điền khóa trên và lưu file \`.env\`, hãy tải lại trang này để bắt đầu sử dụng nhé!`,
      });
    }
  } catch (error: any) {
    console.error('API Assistant Agent Outer Error:', error);
    return NextResponse.json({
      reply: `Đã xảy ra lỗi hệ thống: ${error.message || String(error)}. Vui lòng thử lại sau!`,
    });
  }
}
