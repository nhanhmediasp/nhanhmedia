import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET all products (including variants and prices) for Admin
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: {
          include: {
            prices: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get products admin error:', error);
    return NextResponse.json({ error: 'Lỗi tải danh sách sản phẩm.' }, { status: 500 });
  }
}

// POST: Create a new product with variants and prices
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, description, imageUrl, status, variants, importPrice, supplierName, supplierLink } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Tên sản phẩm và slug là bắt buộc.' }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json({ error: 'Slug sản phẩm đã tồn tại.' }, { status: 400 });
    }

    // Run transaction
    const newProduct = await prisma.$transaction(async (tx) => {
      // 1. Create product
      const product = await tx.product.create({
        data: {
          name,
          slug,
          description,
          imageUrl,
          status: status || 'active',
          importPrice: importPrice !== undefined && importPrice !== '' ? parseFloat(importPrice) : null,
          supplierName: supplierName ? supplierName.trim() : null,
          supplierLink: supplierLink ? supplierLink.trim() : null,
        },
      });

      // 2. Create variants & prices if provided
      if (variants && Array.isArray(variants)) {
        for (const variant of variants) {
          const newVariant = await tx.productVariant.create({
            data: {
              productId: product.id,
              name: variant.name,
              durationValue: parseInt(variant.durationValue) || 1,
              durationUnit: variant.durationUnit || 'month',
              status: variant.status || 'active',
            },
          });

          if (variant.prices) {
            const priceData = [];
            if (variant.prices.member !== undefined) {
              priceData.push({ variantId: newVariant.id, role: 'member', price: parseFloat(variant.prices.member) || 0 });
            }
            if (variant.prices.collaborator !== undefined) {
              priceData.push({ variantId: newVariant.id, role: 'collaborator', price: parseFloat(variant.prices.collaborator) || 0 });
            }
            if (variant.prices.agency !== undefined) {
              priceData.push({ variantId: newVariant.id, role: 'agency', price: parseFloat(variant.prices.agency) || 0 });
            }

            if (priceData.length > 0) {
              await tx.productVariantPrice.createMany({
                data: priceData,
              });
            }
          }
        }
      }

      return product;
    });

    return NextResponse.json({ message: 'Tạo sản phẩm thành công!', product: newProduct });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Lỗi tạo sản phẩm.' }, { status: 500 });
  }
}
