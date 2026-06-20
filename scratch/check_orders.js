const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    include: {
      customer: true,
      createdByUser: true,
      product: true,
      variant: true,
    }
  });
  console.log("Serialized Order Keys and Values:");
  console.log(JSON.stringify(order, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
