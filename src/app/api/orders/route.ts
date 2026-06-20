import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// Helper to calculate end date based on start date, value and unit
export function calculateEndDate(startDate: Date, durationValue: number, durationUnit: string): Date {
  const endDate = new Date(startDate);
  switch (durationUnit.toLowerCase()) {
    case 'day':
      endDate.setDate(startDate.getDate() + durationValue);
      break;
    case 'month':
      endDate.setMonth(startDate.getMonth() + durationValue);
      break;
    case 'year':
      endDate.setFullYear(startDate.getFullYear() + durationValue);
      break;
    default:
      // Default to month
      endDate.setMonth(startDate.getMonth() + durationValue);
  }
  return endDate;
}

// Generate professional order code
function generateOrderCode(): string {
  const now = new Date();
  const year = String(now.getFullYear()).substring(2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000); // 4-digit random
  return `NM${year}${month}${day}-${rand}`;
}

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Không xác định được người dùng.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const createdByUserId = searchParams.get('createdByUserId');
    const status = searchParams.get('status');
    const productId = searchParams.get('productId');
    const searchTerm = searchParams.get('searchTerm');

    const isAdmin = role === 'admin';

    // Build Prisma query clauses
    const whereClause: any = {};

    // 1. Authorization filter
    if (!isAdmin) {
      whereClause.createdByUserId = userId;
    } else if (createdByUserId) {
      whereClause.createdByUserId = createdByUserId;
    }

    // 2. Direct filters
    if (customerId) {
      whereClause.customerId = customerId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (productId) {
      whereClause.productId = productId;
    }

    // 3. Search term (orderCode, customer name/phone)
    if (searchTerm) {
      whereClause.OR = [
        { orderCode: { contains: searchTerm } },
        {
          customer: {
            OR: [
              { name: { contains: searchTerm } },
              { phone: { contains: searchTerm } },
            ],
          },
        },
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: true,
        createdByUser: {
          select: { id: true, name: true, role: true },
        },
        product: true,
        variant: true,
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!isAdmin) {
      orders.forEach((o) => {
        // @ts-ignore
        delete o.importPrice;
      });
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách đơn hàng.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');

    if (!userId || !role) {
      return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      productId,
      variantId,
      customerName,
      customerPhone,
      customerFacebook,
      customerZalo,
      customerEmail,
      startDate,
      note,
      internalNote,
      customPrice, // Only admin can customize this
      importPrice,
      supplierId,
    } = body;

    if (!productId || !variantId || !customerName || !customerPhone || !startDate) {
      return NextResponse.json({ error: 'Thiếu các thông tin bắt buộc.' }, { status: 400 });
    }

    // 1. Fetch variant and its role price
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        prices: {
          where: { role: role === 'admin' ? 'member' : role }, // Default to member price if admin creates without customPrice
        },
      },
    });

    if (!variant) {
      return NextResponse.json({ error: 'Gói dịch vụ không tồn tại.' }, { status: 400 });
    }

    const rolePriceRecord = variant.prices[0];
    const originalPrice = rolePriceRecord ? rolePriceRecord.price : 0;

    // Resolve final price (customPrice only allowed for admin)
    const isAdmin = role === 'admin';
    const finalPrice = originalPrice;
    const finalCustomPrice = isAdmin && customPrice !== undefined && customPrice !== '' ? parseFloat(customPrice) : null;
    
    // Default importPrice is now 0 since it is no longer defined on the Product.
    const defaultImportPrice = 0;
    const finalImportPrice = isAdmin && importPrice !== undefined && importPrice !== ''
      ? parseFloat(importPrice)
      : defaultImportPrice;

    // 2. Resolve Customer (create new if phone does not exist, otherwise associate)
    let customer = await prisma.customer.findUnique({
      where: { phone: customerPhone.trim() },
    });

    if (!customer) {
      // Auto-create new customer
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          facebook: customerFacebook ? customerFacebook.trim() : null,
          zalo: customerZalo ? customerZalo.trim() : null,
          email: customerEmail ? customerEmail.trim() : null,
          createdByUserId: userId,
          note: `Khách hàng tự động tạo từ đơn hàng đầu tiên.`,
        },
      });
    }

    // 3. Calculate End Date
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = calculateEndDate(parsedStartDate, variant.durationValue, variant.durationUnit);

    // 4. Create Order
    const newOrder = await prisma.order.create({
      data: {
        orderCode: generateOrderCode(),
        customerId: customer.id,
        createdByUserId: userId,
        productId,
        variantId,
        price: finalPrice,
        customPrice: finalCustomPrice,
        importPrice: finalImportPrice,
        supplierId: isAdmin && supplierId ? supplierId : null,
        status: 'new', // Default status: new (mới tạo)
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        note: note ? note.trim() : null,
        internalNote: internalNote ? internalNote.trim() : null,
      },
      include: {
        customer: true,
        product: true,
        variant: true,
        supplier: true,
      },
    });

    await createAuditLog({
      action: 'CREATE_ORDER',
      actionLabel: 'Tạo đơn hàng',
      module: 'orders',
      entityType: 'Order',
      entityId: newOrder.id,
      entityName: newOrder.orderCode,
      description: `Đã tạo đơn hàng mới: ${newOrder.orderCode} cho khách hàng ${customer.name}`,
      newValues: {
        id: newOrder.id,
        orderCode: newOrder.orderCode,
        customerId: newOrder.customerId,
        productId: newOrder.productId,
        variantId: newOrder.variantId,
        price: newOrder.price,
        customPrice: newOrder.customPrice,
        importPrice: newOrder.importPrice,
        supplierId: newOrder.supplierId,
        status: newOrder.status,
        startDate: newOrder.startDate,
        endDate: newOrder.endDate,
        note: newOrder.note,
        internalNote: newOrder.internalNote
      },
      request: req,
      status: 'success'
    });

    return NextResponse.json({
      message: 'Tạo đơn hàng thành công!',
      order: newOrder,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Lỗi tạo đơn hàng mới.' }, { status: 500 });
  }
}

