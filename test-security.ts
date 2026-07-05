import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
// Delay secret reading slightly to ensure env load completes
const getSecret = () => process.env.JWT_SECRET as string;

async function runTests() {
  console.log('--- STARTING SECURITY VERIFICATION TESTS ---');
  
  const JWT_SECRET = getSecret();
  if (!JWT_SECRET) {
    console.error('FAIL: JWT_SECRET environment variable is missing.');
    process.exit(1);
  }
  console.log('PASS: JWT_SECRET is configured properly.');

  // Reset login attempts table to ensure clean state
  await prisma.loginAttempt.deleteMany();
  console.log('Database login attempts cleaned.');

  const adminEmail = 'admin@example.com';
  
  // 1. TEST LOGIN RATE LIMITING
  console.log('\n--- 1. Testing Login Rate Limiting ---');
  let loginStatus: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: 'wrong-password' }),
    });
    loginStatus.push(res.status);
    console.log(`Attempt ${i}: Status = ${res.status}`);
  }
  const allFirstFiveFailed = loginStatus.slice(0, 5).every(s => s === 400 || s === 401);
  const sixthIsRateLimited = loginStatus[5] === 429;
  if (allFirstFiveFailed && sixthIsRateLimited) {
    console.log('PASS: Login Rate Limiting (5 attempts then block 429)');
  } else {
    console.log('FAIL: Login Rate Limiting did not behave as expected.');
  }

  // Clean attempts table for forgot-password test
  await prisma.loginAttempt.deleteMany();

  // 2. TEST FORGOT PASSWORD RATE LIMITING
  console.log('\n--- 2. Testing Forgot Password Rate Limiting ---');
  let forgotStatus: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const res = await fetch('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail }),
    });
    forgotStatus.push(res.status);
    console.log(`Attempt ${i}: Status = ${res.status}`);
  }
  const forgotFirstFiveOk = forgotStatus.slice(0, 5).every(s => s === 200 || s === 500); // 500 is ok if SMTP fails, but should not be 429
  const forgotSixthIsRateLimited = forgotStatus[5] === 429;
  if (forgotFirstFiveOk && forgotSixthIsRateLimited) {
    console.log('PASS: Forgot Password Rate Limiting (5 attempts then block 429)');
  } else {
    console.log('FAIL: Forgot Password Rate Limiting did not behave as expected.');
  }

  // Clean attempts table for password reset test
  await prisma.loginAttempt.deleteMany();

  // 3. TEST RESET PASSWORD TOKEN SINGLE-USE
  console.log('\n--- 3. Testing Reset Password Token Single-Use ---');
  
  // Find local admin user
  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminUser) {
    console.error('FAIL: Admin user not found to test password reset.');
    return;
  }

  // Sign a valid reset password token
  const resetToken = jwt.sign(
    { userId: adminUser.id, email: adminUser.email, purpose: 'reset-password' },
    JWT_SECRET + adminUser.passwordHash,
    { expiresIn: '15m' }
  );

  console.log('Testing first reset using token...');
  const resetRes1 = await fetch('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, newPassword: 'newpassword123' }),
  });
  console.log(`First reset response status: ${resetRes1.status}`);

  console.log('Testing second reset using the SAME token...');
  const resetRes2 = await fetch('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: resetToken, newPassword: 'newpassword123' }),
  });
  const reset2Data = await resetRes2.json();
  console.log(`Second reset response status: ${resetRes2.status}`);
  console.log(`Second reset error body: ${JSON.stringify(reset2Data)}`);

  if (resetRes1.status === 200 && resetRes2.status === 400 && reset2Data.error.includes('đã được sử dụng')) {
    console.log('PASS: Password reset token is single-use and invalidates immediately after password changes.');
  } else {
    console.log('FAIL: Password reset token single-use validation failed.');
  }

  // Re-hash and set password back to '123456'
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('123456', salt);
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { passwordHash }
  });
  console.log('Admin password restored to default: 123456');

  // 4. TEST FILE UPLOAD VALIDATIONS
  console.log('\n--- 4. Testing File Upload Security ---');
  
  // Log in to get cookie
  console.log('Logging in as admin to retrieve auth cookie...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: '123456' }),
  });
  const cookieHeader = loginRes.headers.get('set-cookie');
  if (!cookieHeader) {
    console.error('FAIL: Could not retrieve auth cookies.');
    return;
  }
  const cookieValue = cookieHeader.split(';')[0];
  console.log('Auth cookie retrieved.');

  // Test 4a: Upload text file renamed to .png (Magic bytes check)
  console.log('\nTest 4a: Uploading fake image file (text masquerading as png)...');
  const fakeForm = new FormData();
  const fakeFile = new Blob(['console.log("malicious js content");'], { type: 'image/png' });
  fakeForm.append('file', fakeFile, 'malicious.png');

  const uploadRes1 = await fetch('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    headers: {
      'Cookie': cookieValue,
    },
    body: fakeForm,
  });
  const upload1Data = await uploadRes1.json();
  console.log(`Fake image upload status: ${uploadRes1.status}`);
  console.log(`Fake image upload response: ${JSON.stringify(upload1Data)}`);

  if (uploadRes1.status === 400 && upload1Data.error.includes('giả dạng ảnh')) {
    console.log('PASS: Fake image rejected by Magic Bytes check!');
  } else {
    console.log('FAIL: Fake image upload was not correctly rejected.');
  }

  // Test 4b: Upload file > 5MB
  console.log('\nTest 4b: Uploading file > 5MB...');
  const largeForm = new FormData();
  const largeFile = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' });
  largeForm.append('file', largeFile, 'large.png');

  const uploadRes2 = await fetch('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    headers: {
      'Cookie': cookieValue,
    },
    body: largeForm,
  });
  const upload2Data = await uploadRes2.json();
  console.log(`Large file upload status: ${uploadRes2.status}`);
  console.log(`Large file upload response: ${JSON.stringify(upload2Data)}`);

  if (uploadRes2.status === 400 && upload2Data.error.includes('kích thước')) {
    console.log('PASS: File > 5MB rejected correctly!');
  } else {
    console.log('FAIL: Large file was not correctly rejected.');
  }

  // Test 4c: Upload a valid PNG image to make sure upload still works
  console.log('\nTest 4c: Uploading valid PNG image...');
  const pngForm = new FormData();
  // PNG Magic Bytes header: 89 50 4E 47
  const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const validPngFile = new Blob([pngHeader], { type: 'image/png' });
  pngForm.append('file', validPngFile, 'valid.png');

  const uploadRes3 = await fetch('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    headers: {
      'Cookie': cookieValue,
    },
    body: pngForm,
  });
  const upload3Data = await uploadRes3.json();
  console.log(`Valid PNG upload status: ${uploadRes3.status}`);
  console.log(`Valid PNG upload response: ${JSON.stringify(upload3Data)}`);

  if (uploadRes3.status === 200 && upload3Data.success) {
    console.log('PASS: Valid PNG uploaded successfully!');
    
    // Clean up uploaded file
    const fileName = upload3Data.url.split('/').pop();
    const deleteRes = await fetch(`http://localhost:3000/api/admin/upload?name=${fileName}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookieValue,
      }
    });
    console.log(`Uploaded file cleanup delete status: ${deleteRes.status}`);
  } else {
    console.log('FAIL: Valid PNG was rejected.');
  }

  console.log('\n--- VERIFICATION TESTS COMPLETED ---');
}

runTests().catch(err => {
  console.error('Error executing verification tests:', err);
});
