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
 * Example: NHANH260706-1234 -> DONG QUY AN COM 5H2G8 NHANH2607061234
 */
export function getPaymentContent(orderCode: string): string {
  const funds = [
    'lop 12', 'an com', 'tra sua', 'lien hoan', 'gia dinh', 'nhom ban',
    'sinh nhat', 'du lich', 'bong da', 'tu thien', 'clb', 'game',
    'di choi', 'hoc tap', 'phuot', 'offline', 'mua sam', 'nuoc ngot'
  ];
  const randFund = funds[Math.floor(Math.random() * funds.length)];
  
  const cleanCode = orderCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  let prefixChar = 'N';
  let digitsStr = '';
  
  if (cleanCode.startsWith('NHANH')) {
    prefixChar = 'N';
    digitsStr = cleanCode.substring(5);
  } else if (cleanCode.startsWith('NM')) {
    prefixChar = 'M';
    digitsStr = cleanCode.substring(2);
  } else {
    return `DONG QUY ${randFund.toUpperCase()} ${cleanCode}`;
  }

  const digitsNum = parseInt(digitsStr, 10);
  if (isNaN(digitsNum)) {
    return `DONG QUY ${randFund.toUpperCase()} ${cleanCode}`;
  }

  const encodedToken = prefixChar + digitsNum.toString(36).toUpperCase();
  return `DONG QUY ${randFund.toUpperCase()} ${encodedToken}`;
}

/**
 * Extract orderCode from webhook transfer content.
 * New format: NHANH[yy][MM][dd]-[rand] (e.g. NHANH260706-1234) -> NHANH2607061234
 * Legacy format: NM[yy][MM][dd]-[rand] (e.g. NM260706-1234) -> NM2607061234
 */
export function extractOrderCodeFromContent(content: string | null | undefined): string | null {
  if (!content) return null;
  
  // 1. Check for cleartext patterns first (backward compatibility)
  const matchNhanhNoHyphen = content.match(/NHANH\d{10}/i);
  if (matchNhanhNoHyphen) {
    const code = matchNhanhNoHyphen[0].toUpperCase();
    return `${code.substring(0, 11)}-${code.substring(11)}`;
  }

  const matchNhanhWithHyphen = content.match(/NHANH\d{6}-\d{4}/i);
  if (matchNhanhWithHyphen) {
    return matchNhanhWithHyphen[0].toUpperCase();
  }

  const matchNmNoHyphen = content.match(/NM\d{10}/i);
  if (matchNmNoHyphen) {
    const code = matchNmNoHyphen[0].toUpperCase();
    return `${code.substring(0, 8)}-${code.substring(8)}`;
  }

  const matchNmWithHyphen = content.match(/NM\d{6}-\d{4}/i);
  if (matchNmWithHyphen) {
    return matchNmWithHyphen[0].toUpperCase();
  }

  // 2. Scan and decode Base36 tokens
  const words = content.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    if (word.length >= 7 && word.length <= 9) {
      const prefix = word[0];
      if (prefix === 'N' || prefix === 'M') {
        const base36Part = word.substring(1);
        const num = parseInt(base36Part, 36);
        if (!isNaN(num) && num >= 2000000000 && num <= 3999999999) {
          const digitsStr = num.toString().padStart(10, '0');
          if (prefix === 'N') {
            return `NHANH${digitsStr.substring(0, 6)}-${digitsStr.substring(6)}`;
          } else {
            return `NM${digitsStr.substring(0, 6)}-${digitsStr.substring(6)}`;
          }
        }
      }
    }
  }

  return null;
}
