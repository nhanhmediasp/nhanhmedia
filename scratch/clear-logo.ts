import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const updated = await prisma.websiteSettings.update({
      where: { id: 'default' },
      data: {
        logoUrl: null
      }
    });
    console.log('Logo cleared successfully:', updated);
  } catch (err) {
    console.error('Error clearing logo:', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
