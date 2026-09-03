import { prisma } from '@/lib/db';

type ResolveCustomerInput = {
  customerId?: unknown;
  name?: unknown;
  phone?: unknown;
};

/** Resolve an existing customer before creating a new customer record. */
export async function resolveCustomer(input: ResolveCustomerInput) {
  const customerId = typeof input.customerId === 'string' ? input.customerId.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';

  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (customer) return customer;
  }

  if (phone) {
    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (customer) return customer;
  }

  if (name) {
    return prisma.customer.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
  }

  return null;
}
