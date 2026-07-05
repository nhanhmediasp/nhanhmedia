import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

(async () => {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!admin) {
    console.error('Admin user not found');
    process.exit(1);
  }
  const { signToken } = await import('./src/lib/auth');
  const token = signToken({
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  });
  console.log('ADMIN_TOKEN=' + token);
  await prisma.$disconnect();
})();
