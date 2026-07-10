import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const [suppliers, stats] = await Promise.all([
      prisma.supplier.findMany({
        orderBy: { name: 'asc' }
      }),
      prisma.$queryRaw<{ supplierId: string; totalRevenue: number; totalCost: number; orderCount: number; cancelledCount: number; totalRefundAmount: number }[]>`
        SELECT 
          "supplier_id" as "supplierId",
          COUNT(*)::int as "orderCount",
          COALESCE(SUM(COALESCE(custom_price, price)), 0)::float as "totalRevenue",
          COALESCE(SUM(import_price), 0)::float as "totalCost",
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as "cancelledCount",
          COALESCE(SUM(refund_amount), 0)::float as "totalRefundAmount"
        FROM orders
        WHERE "supplier_id" IS NOT NULL
        GROUP BY "supplier_id"
      `
    ]);

    // Build lookup maps for fast O(1) matching
    const statsMap = new Map<string, { orderCount: number; totalRevenue: number; totalCost: number; cancelledCount: number; totalRefundAmount: number }>();
    if (Array.isArray(stats)) {
      stats.forEach((stat) => {
        if (stat.supplierId) {
          statsMap.set(stat.supplierId, {
            orderCount: Number(stat.orderCount) || 0,
            totalRevenue: Number(stat.totalRevenue) || 0,
            totalCost: Number(stat.totalCost) || 0,
            cancelledCount: Number(stat.cancelledCount) || 0,
            totalRefundAmount: Number(stat.totalRefundAmount) || 0,
          });
        }
      });
    }

    const formattedSuppliers = suppliers.map(s => {
      const stat = statsMap.get(s.id) || { orderCount: 0, totalRevenue: 0, totalCost: 0, cancelledCount: 0, totalRefundAmount: 0 };

      // auto rating logic
      let rating = 4;
      if (stat.orderCount > 0) {
        const cancelRate = stat.cancelledCount / stat.orderCount;
        if (cancelRate > 0.3) {
          rating -= 2;
        } else if (cancelRate > 0.1) {
          rating -= 1;
        }
        if (stat.totalRefundAmount > stat.totalRevenue * 0.2) {
          rating -= 1;
        }
      }
      if (stat.orderCount >= 10 && stat.cancelledCount === 0) {
        rating += 1;
      }
      rating = Math.max(1, Math.min(5, rating));

      return {
        id: s.id,
        name: s.name,
        contactUrl: s.contactUrl,
        icon: s.icon,
        manualRating: s.manualRating,
        internalNotes: s.internalNotes,
        createdAt: s.createdAt,
        _count: { orders: stat.orderCount },
        totalRevenue: stat.totalRevenue,
        totalCost: stat.totalCost,
        totalProfit: stat.totalRevenue - stat.totalCost,
        cancelledCount: stat.cancelledCount,
        totalRefundAmount: stat.totalRefundAmount,
        autoRating: rating,
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
    const { name, contactUrl, icon, manualRating, internalNotes } = body;

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
        icon: icon ? icon.trim() : null,
        manualRating: manualRating ? Number(manualRating) : null,
        internalNotes: internalNotes ? internalNotes.trim() : null,
      }
    });

    await createAuditLog({
      action: 'CREATE_SUPPLIER',
      actionLabel: 'Tạo nguồn hàng mới',
      module: 'suppliers',
      entityType: 'Supplier',
      entityId: supplier.id,
      entityName: supplier.name,
      description: `Đã tạo nguồn hàng mới "${supplier.name}"`,
      newValues: supplier,
      request: req,
      status: 'success'
    });

    return NextResponse.json({ message: 'Tạo nguồn hàng thành công!', supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    return NextResponse.json({ error: 'Lỗi tạo nguồn hàng mới.' }, { status: 500 });
  }
}
