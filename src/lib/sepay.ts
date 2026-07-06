/**
 * SePay Helper utilities
 */

/**
 * Build SePay VietQR image URL
 */
export function buildQrUrl({ amount, content }: { amount: number; content: string }): string {
  const accountNumber = process.env.NEXT_PUBLIC_SEPAY_ACCOUNT_NUMBER || "1015165449";
  const bankCode = process.env.NEXT_PUBLIC_SEPAY_BANK_CODE || "Vietcombank";
  
  return `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankCode}&amount=${amount}&des=${encodeURIComponent(content)}`;
}

/**
 * Format order code to transfer description (alphanumeric only, uppercase)
 * Example: NM260706-1234 -> NM2607061234
 */
export function getPaymentContent(orderCode: string): string {
  return orderCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Extract orderCode from webhook transfer content.
 * Standard format generated: NM[yy][MM][dd]-[rand] (e.g. NM260706-1234)
 * When stripped of hyphen: NM2607061234 (NM + 10 digits)
 */
export function extractOrderCodeFromContent(content: string | null | undefined): string | null {
  if (!content) return null;
  
  // Try matching NM followed by 10 digits (without hyphen)
  const matchNoHyphen = content.match(/NM\d{10}/i);
  if (matchNoHyphen) {
    const code = matchNoHyphen[0].toUpperCase();
    return `${code.substring(0, 8)}-${code.substring(8)}`;
  }

  // Try matching standard order code with hyphen
  const matchWithHyphen = content.match(/NM\d{6}-\d{4}/i);
  if (matchWithHyphen) {
    return matchWithHyphen[0].toUpperCase();
  }

  return null;
}
