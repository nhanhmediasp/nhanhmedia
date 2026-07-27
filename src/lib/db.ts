import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

/**
 * Bổ sung tham số connection pool vào DATABASE_URL nếu chưa có.
 *
 * Mặc định Prisma đặt connection_limit = (số CPU * 2 + 1). Trên aaPanel, PM2
 * thường chạy nhiều instance Next.js cùng lúc, mỗi instance lại mở ngần đó
 * connection → rất dễ đụng trần `max_connections` (mặc định 100) của PostgreSQL
 * và toàn site đứng với lỗi "too many clients already".
 */
function buildDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);

    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', process.env.DB_CONNECTION_LIMIT || '10');
    }
    // Thời gian chờ lấy connection từ pool (giây) — mặc định 10s là quá ngắn
    // khi dashboard bắn hơn 20 query song song.
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.DB_POOL_TIMEOUT || '20');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '10');
    }

    return url.toString();
  } catch {
    // DATABASE_URL không parse được (vd thiếu scheme) — giữ nguyên, để Prisma tự báo lỗi
    return raw;
  }
}

function createPrismaClient(): PrismaClient {
  const datasourceUrl = buildDatabaseUrl();

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Giữ singleton ở cả production: Next.js có thể nạp module này nhiều lần
// (route handlers + server components), mỗi lần `new PrismaClient()` là thêm
// một pool connection tới PostgreSQL.
globalForPrisma.prisma = prisma;
