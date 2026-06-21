import { prisma } from '../src/lib/db';

async function verifyProductPut() {
  try {
    console.log('Fetching a sample product...');
    const product = await prisma.product.findFirst({
      include: {
        variants: {
          include: {
            prices: true
          }
        }
      }
    });

    if (!product) {
      console.log('No products found.');
      return;
    }

    console.log(`Product found: ${product.name} (ID: ${product.id})`);
    
    // Format variants to mock the request body structure
    const formattedVariants = product.variants.map((v) => {
      const memberPrice = v.prices.find((p) => p.role === 'member')?.price || 0;
      const colPrice = v.prices.find((p) => p.role === 'collaborator')?.price || 0;
      const agencyPrice = v.prices.find((p) => p.role === 'agency')?.price || 0;

      return {
        id: v.id,
        name: v.name,
        durationValue: v.durationValue,
        durationUnit: v.durationUnit,
        status: v.status,
        prices: {
          member: String(memberPrice),
          collaborator: String(colPrice),
          agency: String(agencyPrice),
        },
      };
    });

    const mockBody = {
      name: product.name + ' Updated',
      slug: product.slug,
      description: product.description || 'Test update description',
      imageUrl: product.imageUrl || '',
      status: product.status,
      variants: formattedVariants,
      importPrice: product.importPrice !== null ? String(product.importPrice) : '100000',
      supplierName: product.supplierName || 'Test Supplier',
      supplierLink: product.supplierLink || 'https://t.me/test_supplier',
    };

    console.log('\nSimulating PUT update with mock body...');

    // Perform database transaction logic from route.ts
    const id = product.id;
    await prisma.$transaction(async (tx) => {
      // 1. Update product basic details
      await tx.product.update({
        where: { id },
        data: {
          name: mockBody.name,
          slug: mockBody.slug,
          description: mockBody.description,
          imageUrl: mockBody.imageUrl,
          status: mockBody.status,
          importPrice: mockBody.importPrice !== undefined && mockBody.importPrice !== '' ? parseFloat(mockBody.importPrice) : null,
          supplierName: mockBody.supplierName ? mockBody.supplierName.trim() : null,
          supplierLink: mockBody.supplierLink ? mockBody.supplierLink.trim() : null,
        },
      });

      // 2. Sync variants
      if (mockBody.variants && Array.isArray(mockBody.variants)) {
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
        });
        const existingVariantIds = existingVariants.map((v) => v.id);
        const incomingVariantIds = mockBody.variants.map((v) => v.id).filter(Boolean) as string[];

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

        for (const variant of mockBody.variants) {
          if (variant.id) {
            const updatedVariant = await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                name: variant.name,
                durationValue: Number(variant.durationValue) || 1,
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
          }
        }
      }
    });

    console.log('\nPRODUCT UPDATE TRANSACTION SUCCESS!');
  } catch (error) {
    console.error('\nError running product update:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyProductPut();
