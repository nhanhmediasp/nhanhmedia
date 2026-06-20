import { hashPassword, comparePassword, signToken, verifyToken } from './auth';
import { calculateEndDate } from '../app/api/orders/route';
import { formatEmailBody } from '../app/api/orders/[id]/remind-manual/route';
import { encrypt, decrypt } from './crypto';

function testCrypto() {
  console.log('Testing AES Cryptography...');
  const secretText = 'my_super_secret_smtp_password_123';
  
  const encrypted = encrypt(secretText);
  console.log(' - Encrypted:', encrypted);
  
  const decrypted = decrypt(encrypted);
  console.log(' - Decrypted:', decrypted);
  
  if (decrypted !== secretText) {
    throw new Error('FAILED: Crypto decryption does not match original secret text!');
  }
  console.log(' - Crypto testing PASSED');
}

function testAuth() {
  console.log('Testing Hashing & JWT Authentication...');
  
  // Test password hashing
  const rawPassword = 'mysecretpassword123';
  const hashed = hashPassword(rawPassword);
  
  console.log(' - Hashed Password:', hashed);
  const match = comparePassword(rawPassword, hashed);
  const failMatch = comparePassword('wrongpassword', hashed);
  
  console.log(' - Compare match:', match);
  console.log(' - Compare wrong password:', !failMatch);
  
  if (!match || failMatch) {
    throw new Error('FAILED: Hashing comparison failed!');
  }

  // Test JWT token
  const payload = {
    id: 'user-uuid-123456',
    name: 'Nguyễn Văn Test',
    email: 'test@example.com',
    role: 'collaborator',
  };

  const token = signToken(payload);
  console.log(' - Signed JWT:', token.substring(0, 30) + '...');
  
  const verified = verifyToken(token);
  console.log(' - Decoded JWT Role:', verified?.role);

  if (!verified || verified.id !== payload.id || verified.role !== payload.role) {
    throw new Error('FAILED: JWT verification does not match payload!');
  }
  
  console.log(' - Authentication testing PASSED');
}

function testPricingAndDates() {
  console.log('Testing Date Arithmetic for Expiry Dates...');
  
  const startDate = new Date('2026-06-19T12:00:00.000Z');
  
  // Test 1 day
  const end1Day = calculateEndDate(startDate, 1, 'day');
  console.log(' - 1 Day Expiry:', end1Day.toISOString());
  if (end1Day.getDate() !== 20) throw new Error('FAILED: Date calculation for 1 day!');

  // Test 3 months
  const end3Months = calculateEndDate(startDate, 3, 'month');
  console.log(' - 3 Months Expiry:', end3Months.toISOString());
  if (end3Months.getMonth() !== 8) throw new Error('FAILED: Date calculation for 3 months!'); // June (5) + 3 = September (8)

  // Test 1 year
  const end1Year = calculateEndDate(startDate, 1, 'year');
  console.log(' - 1 Year Expiry:', end1Year.toISOString());
  if (end1Year.getFullYear() !== 2027) throw new Error('FAILED: Date calculation for 1 year!');

  console.log(' - Date Arithmetic testing PASSED');
}

function testEmailTemplates() {
  console.log('Testing Email Template replacements...');
  
  const templateBody = 'Xin chào {{customer_name}}, dịch vụ {{product_name}} của bạn mã {{order_code}} hết hạn ngày {{end_date}}. Người bán: {{creator_name}} - {{company_name}}';
  
  const formatted = formatEmailBody(templateBody, {
    customerName: 'Nguyễn Khách',
    productName: 'Cloud Hosting VPS',
    orderCode: 'NM260619-9482',
    startDate: '19/06/2026',
    endDate: '19/09/2026',
    creatorName: 'Lê CTV',
    companyName: 'Nhanh Media Co',
  });
  
  console.log(' - Formatted Email:', formatted);
  
  if (
    !formatted.includes('Nguyễn Khách') ||
    !formatted.includes('Cloud Hosting VPS') ||
    !formatted.includes('NM260619-9482') ||
    !formatted.includes('19/09/2026') ||
    !formatted.includes('Lê CTV') ||
    !formatted.includes('Nhanh Media Co')
  ) {
    throw new Error('FAILED: Email template string replacements are incorrect!');
  }
  
  console.log(' - Email Template testing PASSED');
}

function runAll() {
  console.log('==================================================');
  console.log('RUNNING AUTOMATED UNIT TESTS FOR NHANH MEDIA APP');
  console.log('==================================================');
  
  try {
    testCrypto();
    console.log('');
    testAuth();
    console.log('');
    testPricingAndDates();
    console.log('');
    testEmailTemplates();
    console.log('');
    console.log('==================================================');
    console.log('SUCCESS: ALL AUTOMATED TESTS COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (error: any) {
    console.error('\nTESTING SUITE FAILURE DETECTED!');
    console.error(error.message);
    process.exit(1);
  }
}

runAll();
