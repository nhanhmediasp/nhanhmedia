import { Prisma } from '@prisma/client';
import { getBusinessDateParts } from './datetime';

/**
 * Sinh mã đơn dạng NHANH[yy][MM][dd]-[4 số].
 *
 * Ngày lấy theo giờ Việt Nam (trước đây mỗi nơi tự tính: orders dùng giờ local,
 * assistant dùng UTC → lệch ngày với nhau khi server chạy UTC).
 */
export function generateOrderCode(): string {
  const { year, month, day } = getBusinessDateParts();
  const yy = String(year).slice(2);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NHANH${yy}${mm}${dd}-${rand}`;
}

/**
 * Tạo đơn hàng với mã đảm bảo không trùng.
 *
 * `orderCode` là cột @unique nhưng mã chỉ có 4 chữ số ngẫu nhiên mỗi ngày,
 * nên với ~100 đơn/ngày xác suất đụng đã rất cao (nghịch lý sinh nhật) và
 * trước đây sẽ ném thẳng lỗi 500 ra cho người dùng.
 *
 * Hàm này bắt đúng lỗi unique-constraint của Prisma (P2002 trên orderCode)
 * và sinh lại mã mới, thay vì pre-check bằng findUnique (vẫn dính race condition).
 */
export async function createOrderWithUniqueCode<T>(
  create: (orderCode: string) => Promise<T>,
  maxAttempts = 6
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const orderCode = generateOrderCode();
    try {
      return await create(orderCode);
    } catch (error) {
      const isDuplicateOrderCode =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        String((error.meta as { target?: string | string[] } | undefined)?.target ?? '').includes(
          'order_code'
        );

      if (!isDuplicateOrderCode) throw error;

      lastError = error;
      console.warn(`[order-code] Mã đơn ${orderCode} bị trùng, sinh lại (lần ${attempt + 1}).`);
    }
  }

  throw lastError ?? new Error('Không sinh được mã đơn hàng duy nhất.');
}

/**
 * Dùng khi chỉ cần một mã chưa tồn tại (không tạo bản ghi ngay).
 */
export async function createUniqueOrderCode(
  exists: (orderCode: string) => Promise<boolean>,
  maxAttempts = 6
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const orderCode = generateOrderCode();
    if (!(await exists(orderCode))) return orderCode;
  }
  throw new Error('Không sinh được mã đơn hàng duy nhất.');
}
