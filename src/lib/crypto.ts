import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

// Lấy khoá mã hoá từ env.
// Ở production BẮT BUỘC phải cấu hình SMTP_ENCRYPTION_KEY: khoá dự phòng vốn
// được hash từ một chuỗi cố định nằm trong source, nên bất kỳ ai đọc được repo
// đều giải mã được mật khẩu SMTP đang lưu trong database.
const getEncryptionKey = (): Buffer => {
  const hexKey = process.env.SMTP_ENCRYPTION_KEY;
  if (hexKey && hexKey.length === 64) {
    return Buffer.from(hexKey, 'hex');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SMTP_ENCRYPTION_KEY chưa được cấu hình (cần chuỗi hex 64 ký tự). ' +
        'Sinh khoá bằng: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  console.warn(
    '[crypto] SMTP_ENCRYPTION_KEY chưa cấu hình — đang dùng khoá dev. KHÔNG dùng cấu hình này ở production.'
  );
  return crypto.createHash('sha256').update('nhanh_media_fallback_key_2026').digest();
};

export function encrypt(text: string): string {
  try {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
}

export function decrypt(encryptedText: string): string {
  try {
    if (!encryptedText) return '';
    
    // Support unencrypted or seeded mock values safely
    if (!encryptedText.includes(':')) {
      return encryptedText;
    }
    
    const parts = encryptedText.split(':');
    const ivHex = parts.shift();
    const encryptedHex = parts.join(':');
    
    if (!ivHex || !encryptedHex) {
      return encryptedText;
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedTextBuffer = Buffer.from(encryptedHex, 'hex');
    const key = getEncryptionKey();
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedTextBuffer);
    
    // Buffer concatenation to string handles final blocks
    const decryptedFinal = Buffer.concat([decrypted, decipher.final()]);
    
    return decryptedFinal.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    // In case of error (e.g. key changed), return the original string as fallback 
    // to avoid crashing, but log it.
    return '';
  }
}
