import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

// Retrieve encryption key from env, fallback to a safe default if not provided (for development)
const getEncryptionKey = (): Buffer => {
  const hexKey = process.env.SMTP_ENCRYPTION_KEY;
  if (hexKey && hexKey.length === 64) {
    return Buffer.from(hexKey, 'hex');
  }
  // Fallback safe key (hash of a default string to make it 32 bytes)
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
