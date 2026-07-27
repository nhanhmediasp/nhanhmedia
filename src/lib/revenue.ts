import { Prisma } from '@prisma/client';

/**
 * Các trạng thái đơn KHÔNG được tính vào doanh thu.
 *
 * Trước đây dashboard/reports/suppliers/users đều SUM toàn bộ bảng orders
 * không lọc status, trong khi trợ lý AI lại lọc 'cancelled' → hai màn hình
 * báo hai con số khác nhau cho cùng một câu hỏi.
 */
export const NON_REVENUE_ORDER_STATUSES = ['cancelled', 'refunded'] as const;

/**
 * Điều kiện Prisma dùng cho where clause.
 */
export const revenueOrderFilter = {
  status: { notIn: [...NON_REVENUE_ORDER_STATUSES] },
} satisfies Prisma.OrderWhereInput;

/**
 * Mảnh SQL dùng cho $queryRaw (đã tham số hoá, an toàn injection).
 *
 * `alias` là bí danh bảng trong câu query, ví dụ revenueSqlCondition('o')
 * sinh ra `o.status NOT IN ($1, $2)`. Chỉ nhận ký tự an toàn.
 */
export function revenueSqlCondition(alias?: string): Prisma.Sql {
  const values = Prisma.join(NON_REVENUE_ORDER_STATUSES.map((s) => Prisma.sql`${s}`));

  if (!alias) {
    return Prisma.sql`status NOT IN (${values})`;
  }

  if (!/^[a-z_][a-z0-9_]*$/i.test(alias)) {
    throw new Error(`Bí danh bảng không hợp lệ: ${alias}`);
  }

  return Prisma.sql`${Prisma.raw(alias)}.status NOT IN (${values})`;
}
