import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type ResolveCustomerInput = {
  customerId?: unknown;
  name?: unknown;
  phone?: unknown;
  email?: unknown;
};

type FindOrCreateCustomerInput = ResolveCustomerInput & {
  createdByUserId: string;
  facebook?: unknown;
  zalo?: unknown;
  note?: unknown;
  source?: unknown;
};

export function normalizeCustomerName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function normalizeCustomerPhone(value: unknown): string {
  if (typeof value !== 'string') return '';

  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0084')) digits = digits.slice(2);
  if (digits.startsWith('84') && digits.length >= 10) digits = `0${digits.slice(2)}`;
  return digits;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Resolve an existing customer before creating a new customer record. */
export async function resolveCustomer(input: ResolveCustomerInput) {
  const customerId = typeof input.customerId === 'string' ? input.customerId.trim() : '';
  const name = normalizeCustomerName(input.name);
  const rawPhone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const phone = normalizeCustomerPhone(input.phone);
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';

  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (customer) return customer;
  }

  if (phone || rawPhone) {
    const phoneCandidates = [...new Set([phone, rawPhone].filter(Boolean))];
    const customer = await prisma.customer.findFirst({
      where: { phone: { in: phoneCandidates } },
      orderBy: { createdAt: 'asc' },
    });
    if (customer) return customer;
  }

  if (email) {
    const customer = await prisma.customer.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
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

/**
 * Resolve-or-create without the classic "find then create" race.
 *
 * Phone-backed customers rely on the database unique constraint. Customers
 * without a phone are serialized by normalized name because the existing
 * product behavior already treats names case-insensitively as one customer.
 */
export async function findOrCreateCustomer(input: FindOrCreateCustomerInput) {
  const existing = await resolveCustomer(input);
  if (existing) return existing;

  const name = normalizeCustomerName(input.name) || 'Khách hàng';
  const phone = normalizeCustomerPhone(input.phone) || null;
  const createData = {
    name,
    phone,
    email: optionalText(input.email),
    facebook: optionalText(input.facebook),
    zalo: optionalText(input.zalo),
    createdByUserId: input.createdByUserId,
    note: optionalText(input.note),
    source: optionalText(input.source),
  };

  if (phone) {
    try {
      return await prisma.customer.create({ data: createData });
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const winner = await prisma.customer.findUnique({ where: { phone } });
      if (winner) return winner;
      throw error;
    }
  }

  const email = optionalText(input.email)?.toLowerCase() || '';
  const lockKey = email
    ? `customer:email:${email}`
    : `customer:name:${name.toLocaleLowerCase('vi-VN')}`;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

    const winner = await tx.customer.findFirst({
      where: email
        ? { email: { equals: email, mode: 'insensitive' } }
        : { name: { equals: name, mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
    if (winner) return winner;

    return tx.customer.create({ data: createData });
  });
}
