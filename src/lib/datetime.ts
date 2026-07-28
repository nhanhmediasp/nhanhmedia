/**
 * Múi giờ nghiệp vụ của hệ thống.
 *
 * Server (aaPanel / Docker / Vercel) thường chạy UTC, trong khi nghiệp vụ tính
 * theo giờ Việt Nam. Nếu dùng thẳng `new Date(y, m, d)` thì mốc "hôm nay" sẽ
 * lệch 7 tiếng: đơn tạo lúc 0h–7h sáng VN bị tính sang ngày hôm trước.
 */
export const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Ho_Chi_Minh';

/** Độ lệch của BUSINESS_TIMEZONE so với UTC tại thời điểm `date`, tính bằng phút. */
function getTimezoneOffsetMinutes(date: Date): number {
  // Định dạng cùng một thời điểm theo 2 múi giờ rồi lấy hiệu.
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const local = new Date(date.toLocaleString('en-US', { timeZone: BUSINESS_TIMEZONE }));
  return Math.round((local.getTime() - utc.getTime()) / 60000);
}

/** Các thành phần y/m/d của một thời điểm, đọc theo giờ Việt Nam. */
export function getBusinessDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** 00:00:00.000 giờ Việt Nam của ngày chứa `date`, trả về dưới dạng Date (UTC instant). */
export function startOfBusinessDay(date: Date = new Date()): Date {
  const { year, month, day } = getBusinessDateParts(date);
  const offsetMinutes = getTimezoneOffsetMinutes(date);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMinutes * 60000);
}

/** 23:59:59.999 giờ Việt Nam của ngày chứa `date`. */
export function endOfBusinessDay(date: Date = new Date()): Date {
  const start = startOfBusinessDay(date);
  return new Date(start.getTime() + 86_400_000 - 1);
}

/** Cộng/trừ `days` ngày vào một mốc đầu ngày. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * Cộng thời hạn dịch vụ nhưng giữ nguyên "ngày trong tháng" khi có thể.
 *
 * Date#setMonth mặc định làm 31/01 + 1 tháng thành 03/03. Với thời hạn dịch vụ,
 * kết quả đúng phải là ngày cuối của tháng đích (28/29/02). Quy tắc tương tự
 * được áp dụng cho 29/02 + 1 năm.
 */
export function calculateEndDate(
  startDate: Date,
  durationValue: number,
  durationUnit: string
): Date {
  if (
    Number.isNaN(startDate.getTime()) ||
    !Number.isInteger(durationValue) ||
    durationValue <= 0
  ) {
    throw new RangeError('Ngày bắt đầu hoặc thời hạn dịch vụ không hợp lệ.');
  }

  const endDate = new Date(startDate);
  const originalDay = endDate.getDate();
  const unit = durationUnit.toLowerCase();

  if (unit === 'day') {
    endDate.setDate(originalDay + durationValue);
    return endDate;
  }

  // Đặt ngày về 1 trước khi đổi tháng/năm để tránh Date tự tràn sang tháng kế.
  endDate.setDate(1);
  if (unit === 'year') {
    endDate.setFullYear(endDate.getFullYear() + durationValue);
  } else if (unit === 'month') {
    endDate.setMonth(endDate.getMonth() + durationValue);
  } else {
    throw new RangeError('Đơn vị thời hạn dịch vụ không hợp lệ.');
  }

  const lastDayOfTargetMonth = new Date(
    endDate.getFullYear(),
    endDate.getMonth() + 1,
    0
  ).getDate();
  endDate.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return endDate;
}

/** 00:00 giờ VN của ngày đầu tháng chứa `date`. */
export function startOfBusinessMonth(date: Date = new Date()): Date {
  const { year, month } = getBusinessDateParts(date);
  const offsetMinutes = getTimezoneOffsetMinutes(date);
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - offsetMinutes * 60000);
}

/** 23:59:59.999 giờ VN của ngày cuối tháng chứa `date`. */
export function endOfBusinessMonth(date: Date = new Date()): Date {
  const { year, month } = getBusinessDateParts(date);
  const offsetMinutes = getTimezoneOffsetMinutes(date);
  // Ngày 0 của tháng kế tiếp = ngày cuối của tháng hiện tại
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - offsetMinutes * 60000 - 1);
}

/** Nhãn ngày "dd/MM" theo giờ Việt Nam — dùng làm key cho biểu đồ. */
export function formatBusinessDayKey(date: Date): string {
  const { month, day } = getBusinessDateParts(date);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}
