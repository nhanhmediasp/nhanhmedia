import { prisma } from '../src/lib/db';
import { Prisma } from '@prisma/client';

async function testReportsQuery() {
  try {
    const creatorId = 'some-user-uuid';
    const productId = 'some-product-uuid';
    const supplierId = 'some-supplier-uuid';
    const statusFilter = 'running';

    const whereParts: Prisma.Sql[] = [];
    whereParts.push(Prisma.sql`created_by_user_id = ${creatorId}`);
    whereParts.push(Prisma.sql`product_id = ${productId}`);
    whereParts.push(Prisma.sql`status = ${statusFilter}`);
    whereParts.push(Prisma.sql`supplier_id = ${supplierId}`);

    const rawWhere = Prisma.sql`WHERE ${Prisma.join(whereParts, ' AND ')}`;

    console.log('Attempting to execute raw SQL query with ::uuid casts...');
    const result = await prisma.$queryRaw`
      SELECT COALESCE(SUM(COALESCE(custom_price, price)), 0)::float AS total 
      FROM orders 
      ${rawWhere}
    `;
    console.log('Result:', result);
  } catch (error: any) {
    console.error('Database query failed with error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testReportsQuery();
