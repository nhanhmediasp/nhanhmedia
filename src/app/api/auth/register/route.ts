import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import nodemailer from 'nodemailer';
import { decrypt } from '@/lib/crypto';
import { createAuditLog } from '@/lib/audit';

export async function POST(req: Request) {
  return NextResponse.json(
    { error: 'Đăng ký tài khoản đã bị vô hiệu hóa trên hệ thống này.' },
    { status: 403 }
  );
}
