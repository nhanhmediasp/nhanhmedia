import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.websiteSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', loginLockEnabled: false, loginMaxAttempts: 5, loginLockDurationMins: 15 },
    update: {},
  });
  console.log('Website settings record:', result);
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
