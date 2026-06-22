import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, slug, description, imageUrl, status, variants, importPrice, supplierName, supplierLink } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Tên và slug là bắt buộc.' }, { status: 400 });
    }

    const oldProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            prices: true
          }
        }
      }
    });

    if (!oldProduct) {
      return NextResponse.json({ error: 'Sản phẩm không tồn tại.' }, { status: 404 });
    }

    // Check slug uniqueness (exclude current product)
    const existing = await prisma.product.findFirst({
      where: { slug, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Slug sản phẩm đã bị trùng.' }, { status: 400 });
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update product basic details
      await tx.product.update({
        where: { id },
        data: {
          name,
          slug,
          description,
          imageUrl,
          status,
          importPrice: importPrice !== undefined && importPrice !== '' ? parseFloat(importPrice) : null,
          supplierName: supplierName ? supplierName.trim() : null,
          supplierLink: supplierLink ? supplierLink.trim() : null,
        },
      });

      // 2. Sync variants if provided
      if (variants && Array.isArray(variants)) {
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
        });
        const existingVariantIds = existingVariants.map((v) => v.id);
        const incomingVariantIds = variants.map((v) => v.id).filter(Boolean) as string[];

        const idsToDelete = existingVariantIds.filter((x) => !incomingVariantIds.includes(x));
        for (const deleteId of idsToDelete) {
          const count = await tx.order.count({ where: { variantId: deleteId } });
          if (count > 0) {
            await tx.productVariant.update({
              where: { id: deleteId },
              data: { status: 'inactive' },
            });
          } else {
            await tx.productVariant.delete({ where: { id: deleteId } });
          }
        }

        for (const variant of variants) {
          if (variant.id) {
            const updatedVariant = await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                name: variant.name,
                durationValue: parseInt(variant.durationValue) || 1,
                durationUnit: variant.durationUnit,
                status: variant.status || 'active',
              },
            });

            if (variant.prices) {
              await tx.productVariantPrice.deleteMany({
                where: { variantId: variant.id },
              });

              const priceData = [];
              if (variant.prices.member !== undefined) {
                priceData.push({ variantId: updatedVariant.id, role: 'member', price: parseFloat(variant.prices.member) || 0 });
              }
              if (variant.prices.collaborator !== undefined) {
                priceData.push({ variantId: updatedVariant.id, role: 'collaborator', price: parseFloat(variant.prices.collaborator) || 0 });
              }
              if (variant.prices.agency !== undefined) {
                priceData.push({ variantId: updatedVariant.id, role: 'agency', price: parseFloat(variant.prices.agency) || 0 });
              }

              if (priceData.length > 0) {
                await tx.productVariantPrice.createMany({ data: priceData });
              }
            }
          } else {
            const newVariant = await tx.productVariant.create({
              data: {
                productId: id,
                name: variant.name,
                durationValue: parseInt(variant.durationValue) || 1,
                durationUnit: variant.durationUnit,
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
                await tx.productVariantPrice.createMany({ data: priceData });
              }
            }
          }
        }
      }
    });

    const newProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            prices: true
          }
        }
      }
    });

    await createAuditLog({
      action: 'UPDATE_PRODUCT',
      actionLabel: 'Cập nhật sản phẩm',
      module: 'products',
      entityType: 'Product',
      entityId: id,
      entityName: name,
      description: `Đã cập nhật thông tin sản phẩm "${name}"`,
      oldValues: oldProduct,
      newValues: newProduct,
      request: req,
      status: 'success'
    });

    return NextResponse.json({ message: 'Cập nhật sản phẩm thành công!' });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật sản phẩm.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const productToDelete = await prisma.product.findUnique({
      where: { id }
    });

    if (!productToDelete) {
      return NextResponse.json({ error: 'Sản phẩm không tồn tại.' }, { status: 404 });
    }

    const orderCount = await prisma.order.count({
      where: { productId: id },
    });

    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'Không thể xóa sản phẩm này vì đã có đơn hàng sử dụng dịch vụ. Bạn nên đổi trạng thái sản phẩm thành ngưng hoạt động (inactive) thay vì xóa.' },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id },
    });

    await createAuditLog({
      action: 'DELETE_PRODUCT',
      actionLabel: 'Xóa sản phẩm',
      module: 'products',
      entityType: 'Product',
      entityId: id,
      entityName: productToDelete.name,
      description: `Đã xóa sản phẩm "${productToDelete.name}" (Slug: ${productToDelete.slug})`,
      oldValues: productToDelete,
      request: req,
      status: 'success'
    });

    return NextResponse.json({ message: 'Xóa sản phẩm thành công!' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Lỗi xóa sản phẩm.' }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: {
            prices: true,
          },
        },
        orders: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true }
            },
            createdByUser: {
              select: { id: true, name: true, role: true }
            },
            variant: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Sản phẩm không tồn tại.' }, { status: 404 });
    }

    // Compute stats
    let totalRevenue = 0;
    let totalCost = 0;
    
    // Non-cancelled orders contribute to stats
    const activeOrders = product.orders.filter(o => o.status !== 'cancelled');
    activeOrders.forEach(o => {
      const price = o.customPrice !== null ? o.customPrice : o.price;
      const cost = o.importPrice !== null ? o.importPrice : 0;
      totalRevenue += price;
      totalCost += cost;
    });

    const totalProfit = totalRevenue - totalCost;

    return NextResponse.json({
      product: {
        ...product,
        totalRevenue,
        totalCost,
        totalProfit,
        orderCount: activeOrders.length
      }
    });
  } catch (error) {
    console.error('Get product detail stats error:', error);
    return NextResponse.json({ error: 'Lỗi tải thống kê sản phẩm.' }, { status: 500 });
  }
}
