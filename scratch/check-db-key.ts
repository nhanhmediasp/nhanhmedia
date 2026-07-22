import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  const settings = await prisma.websiteSettings.findUnique({ where: { id: 'default' } });
  console.log('Current DB geminiApiKey:', settings?.geminiApiKey);
}

main().catch(console.error);
