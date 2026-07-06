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
 * New format: NHANH[yy][MM][dd]-[rand] (e.g. NHANH260706-1234) -> NHANH2607061234
 * Legacy format: NM[yy][MM][dd]-[rand] (e.g. NM260706-1234) -> NM2607061234
 */
export function extractOrderCodeFromContent(content: string | null | undefined): string | null {
  if (!content) return null;
  
  // 1. Try matching NHANH followed by 10 digits (without hyphen)
  const matchNhanhNoHyphen = content.match(/NHANH\d{10}/i);
  if (matchNhanhNoHyphen) {
    const code = matchNhanhNoHyphen[0].toUpperCase();
    return `${code.substring(0, 11)}-${code.substring(11)}`; // NHANH (5) + YYMMDD (6) = 11
  }

  // 2. Try matching NHANH order code with hyphen
  const matchNhanhWithHyphen = content.match(/NHANH\d{6}-\d{4}/i);
  if (matchNhanhWithHyphen) {
    return matchNhanhWithHyphen[0].toUpperCase();
  }

  // 3. Legacy: Try matching NM followed by 10 digits (without hyphen)
  const matchNmNoHyphen = content.match(/NM\d{10}/i);
  if (matchNmNoHyphen) {
    const code = matchNmNoHyphen[0].toUpperCase();
    return `${code.substring(0, 8)}-${code.substring(8)}`; // NM (2) + YYMMDD (6) = 8
  }

  // 4. Legacy: Try matching NM order code with hyphen
  const matchNmWithHyphen = content.match(/NM\d{6}-\d{4}/i);
  if (matchNmWithHyphen) {
    return matchNmWithHyphen[0].toUpperCase();
  }

  return null;
}
