import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Querying table columns for "orders" in Postgres...');
    const orderCols = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
      ORDER BY column_name;
    `;
    console.log('Orders Columns:', orderCols);

    console.log('\nQuerying table columns for "products" in Postgres...');
    const productCols = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY column_name;
    `;
    console.log('Products Columns:', productCols);

  } catch (error) {
    console.error('Error querying database schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
