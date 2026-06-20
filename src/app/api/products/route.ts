import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const role = req.headers.get('x-user-role');

    if (!role) {
      return NextResponse.json({ error: 'Không xác định được phân quyền.' }, { status: 400 });
    }

    // If admin, they can see all. But for user-facing lists, we filter active.
    // Let's filter active products & variants
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      include: {
        variants: {
          where: { status: 'active' },
          include: {
            prices: {
              where: { role: role },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Map output to simplify structure for user (e.g. resolve prices directly)
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      imageUrl: product.imageUrl,
      variants: product.variants.map((v) => {
        // Resolve the specific price for this role
        const rolePriceRecord = v.prices[0];
        const price = rolePriceRecord ? rolePriceRecord.price : 0;
        
        return {
          id: v.id,
          name: v.name,
          durationValue: v.durationValue,
          durationUnit: v.durationUnit,
          price: price,
        };
      }),
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error('Get user products error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách sản phẩm.' }, { status: 500 });
  }
}
