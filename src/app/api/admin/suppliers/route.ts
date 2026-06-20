import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        orders: {
          select: {
            price: true,
            customPrice: true,
            importPrice: true
          }
        },
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formattedSuppliers = suppliers.map(s => {
      let revenue = 0;
      let cost = 0;
      s.orders.forEach(o => {
        const price = o.customPrice !== null ? o.customPrice : o.price;
        revenue += price;
        cost += o.importPrice || 0;
      });

      return {
        id: s.id,
        name: s.name,
        contactUrl: s.contactUrl,
        icon: s.icon,
        createdAt: s.createdAt,
        _count: s._count,
        totalRevenue: revenue,
        totalCost: cost,
        totalProfit: revenue - cost
      };
    });

    return NextResponse.json({ suppliers: formattedSuppliers });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách nguồn hàng.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, contactUrl, icon } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên nguồn hàng là bắt buộc.' }, { status: 400 });
    }

    const existing = await prisma.supplier.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json({ error: 'Nguồn hàng này đã tồn tại.' }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactUrl: contactUrl ? contactUrl.trim() : null,
        icon: icon ? icon.trim() : null
      }
    });

    return NextResponse.json({ message: 'Tạo nguồn hàng thành công!', supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json({ error: 'Lỗi tạo nguồn hàng mới.' }, { status: 500 });
  }
}
