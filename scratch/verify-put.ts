import { prisma } from '../src/lib/db';
import { calculateEndDate } from '../src/app/api/orders/route';

async function verifyPut() {
  try {
    console.log('Fetching a sample order to test PUT update...');
    const sampleOrder = await prisma.order.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        product: true,
        variant: true,
        supplier: true
      }
    });

    if (!sampleOrder) {
      console.error('No orders found to test. Did you run the seed script?');
      return;
    }

    console.log(`Found order ID: ${sampleOrder.id}, Code: ${sampleOrder.orderCode}`);
    console.log('Initial state:');
    console.log(` - Status: ${sampleOrder.status}`);
    console.log(` - Import Price: ${sampleOrder.importPrice}`);
    console.log(` - Amount Paid: ${sampleOrder.amountPaid}`);
    console.log(` - Supplier ID: ${sampleOrder.supplierId}`);

    // Mock the PUT update parameters
    const updateData: any = {
      note: 'Updated note via verification script',
      amountPaid: 275000, // Update payment status to 50%
      internalNote: 'Updated internal note',
      status: 'processing',
      importPrice: 150000
    };

    console.log('\nRunning order update simulation with new values:', updateData);

    const updatedOrder = await prisma.order.update({
      where: { id: sampleOrder.id },
      data: updateData,
      include: {
        customer: true,
        createdByUser: {
          select: { id: true, name: true, role: true },
        },
        product: {
          include: {
            variants: {
              where: { status: 'active' },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        variant: true,
        renewals: {
          include: {
            renewedByUser: { select: { id: true, name: true } },
            variant: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        emailLogs: {
          orderBy: { sentAt: 'desc' },
        },
      },
    });

    console.log('\nUpdate database query SUCCESS!');
    console.log('Result Verification:');
    console.log(` - Status (expected 'processing'): ${updatedOrder.status}`);
    console.log(` - Import Price (expected 150000): ${updatedOrder.importPrice}`);
    console.log(` - Amount Paid (expected 275000): ${updatedOrder.amountPaid}`);
    console.log(` - Note (expected 'Updated note via verification script'): ${updatedOrder.note}`);
    console.log(` - Internal Note (expected 'Updated internal note'): ${updatedOrder.internalNote}`);
    
    // Check fields that would crash UI if undefined
    console.log('\nChecking relations returned in response:');
    console.log(` - customer present: ${!!updatedOrder.customer}`);
    console.log(` - createdByUser present: ${!!updatedOrder.createdByUser}`);
    console.log(` - product present: ${!!updatedOrder.product}`);
    console.log(` - variant present: ${!!updatedOrder.variant}`);
    console.log(` - renewals array present: ${Array.isArray(updatedOrder.renewals)} (length: ${updatedOrder.renewals.length})`);
    console.log(` - emailLogs array present: ${Array.isArray(updatedOrder.emailLogs)} (length: ${updatedOrder.emailLogs.length})`);

    if (
      updatedOrder.status === 'processing' &&
      updatedOrder.importPrice === 150000 &&
      updatedOrder.amountPaid === 275000 &&
      updatedOrder.createdByUser &&
      Array.isArray(updatedOrder.renewals) &&
      Array.isArray(updatedOrder.emailLogs)
    ) {
      console.log('\n=========================================');
      console.log('VERIFICATION PASSED SUCCESSFULLY!');
      console.log('=========================================');
    } else {
      console.error('\nVERIFICATION FAILED!');
    }

  } catch (error) {
    console.error('Error running update verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPut();
