import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to encrypt mock SMTP passwords or key values if needed
// For seeding we can use plain or mock values since it's just a seed
function mockEncrypt(text: string) {
  // Simple mock encryption for seed that our crypto library can match, 
  // or just write a basic placeholder. We'll use a standard format:
  // "iv:encryptedText"
  return "d9a46a5b6c2d1e3f:mock_encrypted_smtp_password";
}

async function main() {
  console.log('Start seeding...');

  // 1. Clean database
  await prisma.emailLog.deleteMany();
  await prisma.orderRenewal.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.productVariantPrice.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.emailSettings.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.reminderSettings.deleteMany();

  // 2. Create users
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('123456', salt);

  const admin = await prisma.user.create({
    data: {
      name: 'Nguyễn Văn Admin',
      email: 'admin@example.com',
      passwordHash,
      phone: '0987654321',
      role: 'admin',
      status: 'active',
      note: 'Tài khoản admin hệ thống',
    },
  });

  const member = await prisma.user.create({
    data: {
      name: 'Trần Thị Thành Viên',
      email: 'member@example.com',
      passwordHash,
      phone: '0912345678',
      role: 'member',
      status: 'active',
      note: 'Tài khoản thành viên chính thức',
    },
  });

  const collaborator = await prisma.user.create({
    data: {
      name: 'Lê Văn CTV',
      email: 'ctv@example.com',
      passwordHash,
      phone: '0901234567',
      role: 'collaborator',
      status: 'active',
      note: 'Cộng tác viên khu vực miền Nam',
    },
  });

  const agency = await prisma.user.create({
    data: {
      name: 'Phạm Đại Lý',
      email: 'agency@example.com',
      passwordHash,
      phone: '0933333333',
      role: 'agency',
      status: 'active',
      note: 'Đại lý phân phối cấp 1',
    },
  });

  console.log('Seeded users...');

  // 3. Create products, variants and prices
  // Product A: Dịch vụ Cloud VPS
  const productA = await prisma.product.create({
    data: {
      name: 'Dịch vụ Cloud VPS Pro',
      slug: 'dich-vu-cloud-vps-pro',
      description: 'Hệ thống máy chủ ảo đám mây tốc độ cao, ổ cứng NVMe SSD siêu tốc, băng thông không giới hạn.',
      status: 'active',
    },
  });

  // Product A Variants
  // 1 month
  const variantA1 = await prisma.productVariant.create({
    data: {
      productId: productA.id,
      name: 'Gói 1 tháng',
      durationValue: 1,
      durationUnit: 'month',
      status: 'active',
    },
  });
  await prisma.productVariantPrice.createMany({
    data: [
      { variantId: variantA1.id, role: 'member', price: 200000 },
      { variantId: variantA1.id, role: 'collaborator', price: 180000 },
      { variantId: variantA1.id, role: 'agency', price: 150000 },
    ],
  });

  // 3 months
  const variantA3 = await prisma.productVariant.create({
    data: {
      productId: productA.id,
      name: 'Gói 3 tháng',
      durationValue: 3,
      durationUnit: 'month',
      status: 'active',
    },
  });
  await prisma.productVariantPrice.createMany({
    data: [
      { variantId: variantA3.id, role: 'member', price: 550000 },
      { variantId: variantA3.id, role: 'collaborator', price: 500000 },
      { variantId: variantA3.id, role: 'agency', price: 420000 },
    ],
  });

  // 12 months (1 year)
  const variantA12 = await prisma.productVariant.create({
    data: {
      productId: productA.id,
      name: 'Gói 1 năm',
      durationValue: 1,
      durationUnit: 'year',
      status: 'active',
    },
  });
  await prisma.productVariantPrice.createMany({
    data: [
      { variantId: variantA12.id, role: 'member', price: 2000000 },
      { variantId: variantA12.id, role: 'collaborator', price: 1800000 },
      { variantId: variantA12.id, role: 'agency', price: 1500000 },
    ],
  });

  // Product B: Quản trị Fanpage & Content
  const productB = await prisma.product.create({
    data: {
      name: 'Chăm sóc Fanpage Toàn Diện',
      slug: 'cham-soc-fanpage-toan-dien',
      description: 'Lập kế hoạch nội dung thiết kế hình ảnh, biên tập bài viết, chạy quảng cáo cơ bản định kỳ hàng tháng.',
      status: 'active',
    },
  });

  // Product B Variants
  // 1 month
  const variantB1 = await prisma.productVariant.create({
    data: {
      productId: productB.id,
      name: 'Gói 1 tháng',
      durationValue: 1,
      durationUnit: 'month',
      status: 'active',
    },
  });
  await prisma.productVariantPrice.createMany({
    data: [
      { variantId: variantB1.id, role: 'member', price: 5000000 },
      { variantId: variantB1.id, role: 'collaborator', price: 4500000 },
      { variantId: variantB1.id, role: 'agency', price: 4000000 },
    ],
  });

  // 3 months
  const variantB3 = await prisma.productVariant.create({
    data: {
      productId: productB.id,
      name: 'Gói 3 tháng',
      durationValue: 3,
      durationUnit: 'month',
      status: 'active',
    },
  });
  await prisma.productVariantPrice.createMany({
    data: [
      { variantId: variantB3.id, role: 'member', price: 14000000 },
      { variantId: variantB3.id, role: 'collaborator', price: 12500000 },
      { variantId: variantB3.id, role: 'agency', price: 11000000 },
    ],
  });

  console.log('Seeded products, variants and prices...');

  // 4. Create sample customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Nguyễn Văn Khách A',
      phone: '0977111222',
      facebook: 'https://facebook.com/khach.a',
      zalo: '0977111222',
      email: 'khacha@gmail.com',
      createdByUserId: admin.id,
      note: 'Khách hàng VIP mua VPS nhiều lần',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Lê Hoàng Khách B',
      phone: '0988333444',
      facebook: 'https://facebook.com/khach.b',
      zalo: '0988333444',
      email: 'khachb@gmail.com',
      createdByUserId: collaborator.id,
      note: 'Do CTV Lê Văn giới thiệu',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Trần Minh Khách C',
      phone: '0955666777',
      facebook: 'https://facebook.com/khach.c',
      zalo: '0955666777',
      email: 'khachc@gmail.com',
      createdByUserId: agency.id,
      note: 'Khách đại lý đăng ký gói Fanpage',
    },
  });

  console.log('Seeded customers...');

  // 5. Create orders
  // Order 1: Đang chạy - Admin tạo
  const now = new Date();
  const order1Start = new Date(now);
  order1Start.setDate(now.getDate() - 10);
  const order1End = new Date(order1Start);
  order1End.setMonth(order1Start.getMonth() + 3); // 3 months

  await prisma.order.create({
    data: {
      orderCode: 'ORD' + Math.floor(100000 + Math.random() * 900000),
      customerId: customer1.id,
      createdByUserId: admin.id,
      productId: productA.id,
      variantId: variantA3.id,
      price: 550000,
      status: 'running',
      startDate: order1Start,
      endDate: order1End,
      note: 'Dịch vụ đang chạy ổn định',
      internalNote: 'Đã thanh toán đủ chuyển khoản VCB',
    },
  });

  // Order 2: Sắp hết hạn (hết hạn sau 5 ngày) - CTV tạo
  const order2Start = new Date();
  order2Start.setDate(now.getDate() - 25);
  const order2End = new Date();
  order2End.setDate(now.getDate() + 5); // Expires in 5 days

  await prisma.order.create({
    data: {
      orderCode: 'ORD' + Math.floor(100000 + Math.random() * 900000),
      customerId: customer2.id,
      createdByUserId: collaborator.id,
      productId: productA.id,
      variantId: variantA1.id,
      price: 180000, // CTV price
      status: 'expired_soon',
      startDate: order2Start,
      endDate: order2End,
      note: 'Khách sắp hết hạn VPS cần gia hạn gấp',
      internalNote: 'Nhắc CTV gọi điện trực tiếp hỗ trợ',
    },
  });

  // Order 3: Đã hết hạn (hết hạn cách đây 2 ngày) - Đại lý tạo
  const order3Start = new Date();
  order3Start.setDate(now.getDate() - 32);
  const order3End = new Date();
  order3End.setDate(now.getDate() - 2); // Expired 2 days ago

  await prisma.order.create({
    data: {
      orderCode: 'ORD' + Math.floor(100000 + Math.random() * 900000),
      customerId: customer3.id,
      createdByUserId: agency.id,
      productId: productB.id,
      variantId: variantB1.id,
      price: 4000000, // Agency price
      status: 'expired',
      startDate: order3Start,
      endDate: order3End,
      note: 'Dịch vụ đã tạm dừng, khách chưa phản hồi gia hạn',
      internalNote: 'Đại lý đang đàm phán lại',
    },
  });

  // Order 4: Mới tạo - Member tạo
  await prisma.order.create({
    data: {
      orderCode: 'ORD' + Math.floor(100000 + Math.random() * 900000),
      customerId: customer1.id,
      createdByUserId: member.id,
      productId: productB.id,
      variantId: variantB3.id,
      price: 14000000, // Member price
      status: 'new',
      startDate: now,
      endDate: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()),
      note: 'Đơn mới tạo gói chăm sóc Fanpage 3 tháng',
      internalNote: 'Chờ duyệt thanh toán',
    },
  });

  console.log('Seeded orders...');

  // 6. Create Email Settings
  await prisma.emailSettings.create({
    data: {
      id: 'default',
      smtpHost: 'smtp.mailtrap.io',
      smtpPort: 2525,
      smtpUser: 'smtp_user_test',
      smtpPasswordEncrypted: mockEncrypt('smtp_password_test'),
      smtpSecure: false,
      fromName: 'Nhanh Media Support',
      fromEmail: 'noreply@nhanhmedia.vn',
    },
  });

  // 7. Create Email Templates
  await prisma.emailTemplate.createMany({
    data: [
      {
        name: 'Nhắc nhở trước 7 ngày',
        subject: 'Cảnh báo: Dịch vụ {{product_name}} sắp hết hạn sau 7 ngày!',
        body: 'Xin chào {{customer_name}},\n\nDịch vụ {{product_name}} của bạn (Mã đơn hàng: {{order_code}}) sẽ hết hạn vào ngày {{end_date}}.\n\nVui lòng liên hệ với người phụ trách {{creator_name}} hoặc công ty {{company_name}} để gia hạn dịch vụ và tránh gián đoạn.\n\nTrân trọng,\n{{company_name}}',
        type: 'reminder_7_days',
      },
      {
        name: 'Nhắc nhở trước 3 ngày',
        subject: 'Nhắc nhở: Chỉ còn 3 ngày để gia hạn dịch vụ {{product_name}}',
        body: 'Xin chào {{customer_name}},\n\nChúng tôi xin nhắc nhở dịch vụ {{product_name}} của bạn sẽ hết hạn vào ngày {{end_date}} (chỉ còn 3 ngày nữa).\n\nVui lòng tiến hành gia hạn sớm để tránh gián đoạn dịch vụ.\n\nXin cảm ơn!\n{{company_name}}',
        type: 'reminder_3_days',
      },
      {
        name: 'Nhắc nhở trước 1 ngày',
        subject: 'Thông báo khẩn cấp: Dịch vụ {{product_name}} sẽ hết hạn VÀO NGÀY MAI!',
        body: 'Xin chào {{customer_name}},\n\nDịch vụ {{product_name}} của bạn sẽ hết hạn vào ngày mai ({{end_date}}).\n\nNếu không gia hạn, hệ thống sẽ tự động tạm dừng dịch vụ sau thời gian này.\n\nTrân trọng,\n{{company_name}}',
        type: 'reminder_1_day',
      },
      {
        name: 'Nhắc nhở khi hết hạn',
        subject: 'Thông báo: Dịch vụ {{product_name}} của bạn đã HẾT HẠN!',
        body: 'Xin chào {{customer_name}},\n\nDịch vụ {{product_name}} (Mã đơn hàng: {{order_code}}) đăng ký từ ngày {{start_date}} đã hết hạn vào ngày {{end_date}}.\n\nHiện tại hệ thống đã tạm ngưng cung cấp dịch vụ. Vui lòng liên hệ để mở lại và gia hạn sớm nhất.\n\nTrân trọng,\n{{company_name}}',
        type: 'reminder_expired',
      },
    ],
  });

  // 8. Create Reminder Settings
  await prisma.reminderSettings.createMany({
    data: [
      { daysBefore: 7, enabled: true },
      { daysBefore: 3, enabled: true },
      { daysBefore: 1, enabled: true },
      { daysBefore: 0, enabled: true }, // Ngày hết hạn
    ],
  });

  console.log('Seeded templates and settings...');
  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
