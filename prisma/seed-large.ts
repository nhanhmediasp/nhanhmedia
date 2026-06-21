import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to encrypt mock SMTP passwords
function mockEncrypt(text: string) {
  return "d9a46a5b6c2d1e3f:mock_encrypted_smtp_password";
}

// Random pick helper
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Random range helper
const randomRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generates a random phone number
const generatePhone = (): string => {
  const prefixes = ['090', '091', '092', '093', '094', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039', '070', '076', '077', '078', '079', '081', '082', '083', '084', '085', '088', '089'];
  const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
  return pick(prefixes) + suffix;
};

// Generate Vietnamese name
const generateName = (): string => {
  const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
  const middleNames = ['Văn', 'Thị', 'Minh', 'Hữu', 'Đức', 'Thành', 'Hoàng', 'Quốc', 'Tuấn', 'Xuân', 'Thu', 'Hải', 'Kim', 'Ngọc', 'Khánh', 'Nhật', 'Anh'];
  const givenNames = ['Anh', 'Bình', 'Chi', 'Dũng', 'Đông', 'Hùng', 'Hương', 'Khánh', 'Linh', 'Minh', 'Nam', 'Phong', 'Quang', 'Sơn', 'Thành', 'Thảo', 'Trang', 'Tuấn', 'Vân', 'Việt', 'Vy', 'Yến', 'Hải', 'Dương', 'Phúc', 'Lộc', 'Thọ'];
  return `${pick(familyNames)} ${pick(middleNames)} ${pick(givenNames)}`;
};

// Generate IP address
const generateIP = (): string => {
  return `${randomRange(1, 254)}.${randomRange(1, 254)}.${randomRange(1, 254)}.${randomRange(1, 254)}`;
};

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
];

async function main() {
  console.log('Bắt đầu dọn dẹp cơ sở dữ liệu trước khi sinh seed lớn...');
  
  await prisma.auditLog.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.orderRenewal.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.productVariantPrice.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.emailSettings.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.reminderSettings.deleteMany();

  console.log('Đã dọn dẹp xong.');

  // 1. Tạo Users cơ bản
  console.log('Tạo người dùng cơ bản...');
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('123456', salt);

  const usersData = [
    { name: 'Nguyễn Văn Admin', email: 'admin@example.com', role: 'admin', phone: '0987654321', note: 'Tài khoản admin hệ thống' },
    { name: 'Trần Thị Thành Viên', email: 'member@example.com', role: 'member', phone: '0912345678', note: 'Tài khoản thành viên chính thức' },
    { name: 'Lê Văn CTV', email: 'ctv@example.com', role: 'collaborator', phone: '0901234567', note: 'Cộng tác viên khu vực miền Nam' },
    { name: 'Phạm Đại Lý', email: 'agency@example.com', role: 'agency', phone: '0933333333', note: 'Đại lý phân phối cấp 1' }
  ];

  const users: any[] = [];
  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        ...u,
        passwordHash,
        status: 'active'
      }
    });
    users.push(user);
  }
  console.log(`Đã tạo ${users.length} người dùng.`);

  // 2. Tạo Suppliers (Nhà cung cấp)
  console.log('Tạo nhà cung cấp...');
  const suppliersData = [
    { name: 'Vietnix Cloud', contactUrl: 'https://vietnix.vn', icon: 'server' },
    { name: 'Mắt Bão', contactUrl: 'https://matbao.net', icon: 'globe' },
    { name: 'Zalo Cloud API', contactUrl: 'https://zalo.me', icon: 'message-circle' },
    { name: 'VNG Cloud', contactUrl: 'https://vngcloud.vn', icon: 'cloud' },
    { name: 'Hostinger Global', contactUrl: 'https://hostinger.com', icon: 'database' }
  ];
  const suppliers: any[] = [];
  for (const s of suppliersData) {
    const supplier = await prisma.supplier.create({ data: s });
    suppliers.push(supplier);
  }
  console.log(`Đã tạo ${suppliers.length} nhà cung cấp.`);

  // 3. Tạo Products, Variants và Prices
  console.log('Tạo dịch vụ/sản phẩm mẫu...');
  
  // Product 1: Cloud VPS Pro
  const p1 = await prisma.product.create({
    data: {
      name: 'Dịch vụ Cloud VPS Pro',
      slug: 'dich-vu-cloud-vps-pro',
      description: 'Hệ thống máy chủ ảo đám mây tốc độ cao, ổ cứng NVMe SSD siêu tốc.',
      status: 'active',
      importPrice: 80000,
      supplierName: 'Vietnix Cloud',
      supplierLink: 'https://vietnix.vn'
    }
  });

  const p1Variants = [
    { name: 'Gói VPS 1 tháng', durationValue: 1, durationUnit: 'month', prices: { member: 200000, collaborator: 180000, agency: 150000 }, importPrice: 80000 },
    { name: 'Gói VPS 3 tháng', durationValue: 3, durationUnit: 'month', prices: { member: 550000, collaborator: 500000, agency: 420000 }, importPrice: 240000 },
    { name: 'Gói VPS 1 năm', durationValue: 12, durationUnit: 'month', prices: { member: 2000000, collaborator: 1800000, agency: 1500000 }, importPrice: 900000 }
  ];

  const variants: any[] = [];
  const variantPricesMap: Record<string, Record<string, number>> = {};
  const variantImportPricesMap: Record<string, number> = {};

  for (const vData of p1Variants) {
    const variant = await prisma.productVariant.create({
      data: {
        productId: p1.id,
        name: vData.name,
        durationValue: vData.durationValue,
        durationUnit: vData.durationUnit,
        status: 'active'
      }
    });
    variants.push(variant);
    variantImportPricesMap[variant.id] = vData.importPrice;
    variantPricesMap[variant.id] = vData.prices;

    await prisma.productVariantPrice.createMany({
      data: [
        { variantId: variant.id, role: 'member', price: vData.prices.member },
        { variantId: variant.id, role: 'collaborator', price: vData.prices.collaborator },
        { variantId: variant.id, role: 'agency', price: vData.prices.agency }
      ]
    });
  }

  // Product 2: Quản trị Fanpage & Content
  const p2 = await prisma.product.create({
    data: {
      name: 'Chăm sóc Fanpage Toàn Diện',
      slug: 'cham-soc-fanpage-toan-dien',
      description: 'Lập kế hoạch nội dung thiết kế hình ảnh, biên tập bài viết, chạy quảng cáo.',
      status: 'active',
      importPrice: 1500000,
      supplierName: 'Nhanh Media Team',
      supplierLink: 'https://nhanhmedia.vn'
    }
  });

  const p2Variants = [
    { name: 'Gói Fanpage 1 tháng', durationValue: 1, durationUnit: 'month', prices: { member: 5000000, collaborator: 4500000, agency: 4000000 }, importPrice: 1500000 },
    { name: 'Gói Fanpage 3 tháng', durationValue: 3, durationUnit: 'month', prices: { member: 14000000, collaborator: 12500000, agency: 11000000 }, importPrice: 4500000 }
  ];

  for (const vData of p2Variants) {
    const variant = await prisma.productVariant.create({
      data: {
        productId: p2.id,
        name: vData.name,
        durationValue: vData.durationValue,
        durationUnit: vData.durationUnit,
        status: 'active'
      }
    });
    variants.push(variant);
    variantImportPricesMap[variant.id] = vData.importPrice;
    variantPricesMap[variant.id] = vData.prices;

    await prisma.productVariantPrice.createMany({
      data: [
        { variantId: variant.id, role: 'member', price: vData.prices.member },
        { variantId: variant.id, role: 'collaborator', price: vData.prices.collaborator },
        { variantId: variant.id, role: 'agency', price: vData.prices.agency }
      ]
    });
  }

  console.log(`Đã tạo ${variants.length} phiên bản dịch vụ và giá tương ứng.`);

  // 4. Tạo 100 Khách hàng (Customers)
  console.log('Sinh ngẫu nhiên 100 khách hàng...');
  const customers: any[] = [];
  const phonesSet = new Set<string>();

  for (let i = 0; i < 100; i++) {
    let phone = generatePhone();
    while (phonesSet.has(phone)) {
      phone = generatePhone();
    }
    phonesSet.add(phone);

    const name = generateName();
    const createdByUser = pick(users);
    
    // Format email or name to english standard to mock facebook/zalo URLs
    const nameEng = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, ".");
    const email = `${nameEng}.${randomRange(10, 99)}@gmail.com`;
    const facebook = `https://facebook.com/${nameEng}.${randomRange(100, 999)}`;
    const zalo = phone;

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        facebook,
        zalo,
        createdByUserId: createdByUser.id,
        note: randomRange(0, 10) > 7 ? `Khách hàng tiềm năng do ${createdByUser.name} quản lý` : null
      }
    });
    customers.push(customer);
  }
  console.log(`Đã tạo ${customers.length} khách hàng thành công.`);

  // 5. Sinh 1000 Đơn hàng (Orders)
  console.log('Sinh ngẫu nhiên 1000 đơn hàng...');
  const ordersDataToInsert: any[] = [];
  const now = new Date();

  // We want to generate orders with dates spread across the last 6 months (180 days) to next 3 months (90 days)
  const statuses = ['new', 'processing', 'running', 'expired_soon', 'expired', 'cancelled'];

  for (let i = 0; i < 1000; i++) {
    const customer = pick(customers);
    // Find customer's creator user so roles match correctly
    const creatorUser = users.find(u => u.id === customer.createdByUserId) || pick(users);
    const variant = pick(variants);
    const product = variant.productId === p1.id ? p1 : p2;
    const supplier = randomRange(0, 10) > 4 ? pick(suppliers) : null;

    // Price matching the creator's role
    const role = creatorUser.role; // admin, member, collaborator, agency
    // Map role to variant price roles
    let priceRole = 'member';
    if (role === 'collaborator' || role === 'agency' || role === 'member') {
      priceRole = role;
    }
    const standardPrice = variantPricesMap[variant.id][priceRole] || variantPricesMap[variant.id]['member'];
    
    // Allow custom price occasionally
    const isCustom = randomRange(0, 10) > 8;
    const customPrice = isCustom ? standardPrice * (pick([0.9, 0.95, 1.05, 1.1])) : null;
    const finalPrice = customPrice || standardPrice;
    
    // Import price
    const importPrice = variantImportPricesMap[variant.id] || 0;

    // Amount paid
    const isFullyPaid = randomRange(0, 10) > 1; // 80% fully paid
    const amountPaid = isFullyPaid ? finalPrice : finalPrice * pick([0, 0.3, 0.5]);

    // Order code
    const orderCode = `ORD${(100000 + i).toString()}`;

    // Dates
    // Let's pick a startDate in range [-180 days, +30 days]
    const daysOffset = randomRange(-180, 30);
    const startDate = new Date(now);
    startDate.setDate(now.getDate() + daysOffset);

    // End date based on variant duration
    const endDate = new Date(startDate);
    if (variant.durationUnit === 'month') {
      endDate.setMonth(startDate.getMonth() + variant.durationValue);
    } else if (variant.durationUnit === 'year') {
      endDate.setFullYear(startDate.getFullYear() + variant.durationValue);
    } else {
      endDate.setDate(startDate.getDate() + variant.durationValue);
    }

    // Determine status logic based on date
    let status = 'running';
    if (endDate < now) {
      // Expired or Cancelled
      status = randomRange(0, 10) > 8 ? 'cancelled' : 'expired';
    } else if (startDate > now) {
      // New or Processing
      status = randomRange(0, 10) > 7 ? 'processing' : 'new';
    } else {
      // Current active orders: running or expired_soon
      const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      if (daysUntilEnd <= 7) {
        status = 'expired_soon';
      } else {
        // Can be running or cancelled
        status = randomRange(0, 10) > 9 ? 'cancelled' : 'running';
      }
    }

    // Refund details for cancelled orders
    let refundAmount = null;
    let refundedAt = null;
    if (status === 'cancelled' && amountPaid > 0 && randomRange(0, 10) > 4) {
      refundAmount = amountPaid * pick([0.5, 1.0]);
      refundedAt = new Date(endDate);
      refundedAt.setDate(endDate.getDate() - randomRange(1, 10));
    }

    ordersDataToInsert.push({
      id: `order-mock-uuid-${i}`,
      orderCode,
      customerId: customer.id,
      createdByUserId: creatorUser.id,
      productId: product.id,
      variantId: variant.id,
      supplierId: supplier ? supplier.id : null,
      price: standardPrice,
      customPrice,
      importPrice,
      amountPaid,
      status,
      startDate,
      endDate,
      note: randomRange(0, 10) > 7 ? `Ghi chú đơn hàng: Khách chạy thử nghiệm dịch vụ ${product.name}.` : null,
      internalNote: randomRange(0, 10) > 8 ? `Đã xử lý thông tin chuyển khoản.` : null,
      refundAmount,
      refundedAt,
      createdAt: startDate, // Set createdAt matching startDate for historic charts consistency
      updatedAt: new Date(startDate.getTime() + 3600000 * randomRange(1, 24))
    });
  }

  // Use createMany to insert fast
  console.log('Đang đẩy dữ liệu đơn hàng vào DB...');
  await prisma.order.createMany({ data: ordersDataToInsert });
  console.log(`Đã tạo thành công 1000 đơn hàng.`);

  // 6. Sinh 150 Lịch sử gia hạn (Order Renewals)
  console.log('Sinh ngẫu nhiên 150 bản ghi gia hạn lịch sử...');
  const renewalsToInsert: any[] = [];
  
  // Pick orders that are running or expired to have a renewal history
  const activeAndExpiredOrders = ordersDataToInsert.filter(o => o.status === 'running' || o.status === 'expired_soon' || o.status === 'expired');
  
  for (let i = 0; i < 150; i++) {
    const order = pick(activeAndExpiredOrders);
    const renewUser = pick(users);
    const variant = variants.find(v => v.id === order.variantId) || pick(variants);
    
    // Renewal price
    const role = renewUser.role;
    let priceRole = 'member';
    if (role === 'collaborator' || role === 'agency' || role === 'member') {
      priceRole = role;
    }
    const price = variantPricesMap[variant.id][priceRole] || variantPricesMap[variant.id]['member'];

    // The old end date was before the current end date
    const oldEndDate = new Date(order.endDate);
    oldEndDate.setMonth(oldEndDate.getMonth() - variant.durationValue); // Go back in time

    renewalsToInsert.push({
      orderId: order.id,
      oldEndDate,
      newEndDate: order.endDate,
      variantId: variant.id,
      price,
      renewedByUserId: renewUser.id,
      createdAt: new Date(order.startDate.getTime() + 3600000 * 2) // Just after starting
    });
  }
  
  await prisma.orderRenewal.createMany({ data: renewalsToInsert });
  console.log(`Đã tạo thành công ${renewalsToInsert.length} bản ghi gia hạn.`);

  // 7. Sinh 1000 Bản ghi Audit Logs
  console.log('Sinh ngẫu nhiên 1000 bản ghi nhật ký hoạt động (Audit Logs)...');
  const auditLogsToInsert: any[] = [];
  
  const actions = [
    { action: 'LOGIN_SUCCESS', label: 'Đăng nhập thành công', module: 'auth', desc: 'đã đăng nhập vào hệ thống' },
    { action: 'CREATE_ORDER', label: 'Tạo đơn hàng', module: 'orders', desc: 'đã tạo đơn hàng mới' },
    { action: 'UPDATE_ORDER', label: 'Cập nhật đơn hàng', module: 'orders', desc: 'đã chỉnh sửa thông tin đơn hàng' },
    { action: 'RENEW_ORDER', label: 'Gia hạn đơn hàng', module: 'orders', desc: 'đã gia hạn thời gian đơn hàng' },
    { action: 'CREATE_CUSTOMER', label: 'Tạo khách hàng', module: 'customers', desc: 'đã thêm khách hàng mới' },
    { action: 'UPDATE_CUSTOMER', label: 'Sửa khách hàng', module: 'customers', desc: 'đã sửa thông tin khách hàng' },
    { action: 'UPDATE_SMTP_SETTINGS', label: 'Sửa cấu hình SMTP', module: 'settings', desc: 'đã cập nhật cấu hình email SMTP' }
  ];

  for (let i = 0; i < 1000; i++) {
    const act = pick(actions);
    const actor = pick(users);
    
    // Choose a random time in the last 30 days
    const logDate = new Date();
    logDate.setDate(now.getDate() - randomRange(0, 30));
    logDate.setHours(randomRange(0, 23), randomRange(0, 59), randomRange(0, 59));

    let entityType: string | null = null;
    let entityId: string | null = null;
    let entityName: string | null = null;
    let description = `${actor.name} ${act.desc}`;

    if (act.module === 'orders') {
      const orderRef = pick(ordersDataToInsert);
      entityType = 'Order';
      entityId = orderRef.id;
      entityName = orderRef.orderCode;
      description = `${actor.name} ${act.desc} ${orderRef.orderCode}`;
    } else if (act.module === 'customers') {
      const customerRef = pick(customers);
      entityType = 'Customer';
      entityId = customerRef.id;
      entityName = customerRef.name;
      description = `${actor.name} ${act.desc}: ${customerRef.name}`;
    }

    auditLogsToInsert.push({
      actorUserId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: act.action,
      actionLabel: act.label,
      module: act.module,
      entityType,
      entityId,
      entityName,
      description,
      ipAddress: generateIP(),
      userAgent: pick(userAgents),
      requestMethod: pick(['POST', 'PUT', 'GET']),
      requestPath: `/api/${act.module}`,
      status: randomRange(0, 100) > 98 ? 'failed' : 'success', // 2% failed actions
      errorMessage: randomRange(0, 100) > 98 ? 'Lỗi kết nối cơ sở dữ liệu hoặc tham số không hợp lệ.' : null,
      createdAt: logDate
    });
  }

  await prisma.auditLog.createMany({ data: auditLogsToInsert });
  console.log(`Đã tạo thành công ${auditLogsToInsert.length} bản ghi Audit Logs.`);

  // 8. Tạo cài đặt email mặc định
  console.log('Tạo cài đặt SMTP và Templates mặc định...');
  await prisma.emailSettings.create({
    data: {
      id: 'default',
      smtpHost: 'smtp.mailtrap.io',
      smtpPort: 2525,
      smtpUser: 'smtp_user_test',
      smtpPasswordEncrypted: mockEncrypt('smtp_password_test'),
      smtpSecure: false,
      fromName: 'Nhanh Media Support',
      fromEmail: 'noreply@nhanhmedia.vn'
    }
  });

  await prisma.emailTemplate.createMany({
    data: [
      {
        name: 'Nhắc nhở trước 7 ngày',
        subject: 'Cảnh báo: Dịch vụ {{product_name}} sắp hết hạn sau 7 ngày!',
        body: 'Xin chào {{customer_name}},\n\nDịch vụ {{product_name}} của bạn (Mã đơn hàng: {{order_code}}) sẽ hết hạn vào ngày {{end_date}}.\n\nVui lòng liên hệ với người phụ trách {{creator_name}} hoặc công ty {{company_name}} để gia hạn dịch vụ và tránh gián đoạn.\n\nTrân trọng,\n{{company_name}}',
        type: 'reminder_7_days'
      },
      {
        name: 'Nhắc nhở trước 3 ngày',
        subject: 'Nhắc nhở: Chỉ còn 3 ngày để gia hạn dịch vụ {{product_name}}',
        body: 'Xin chào {{customer_name}},\n\nChúng tôi xin nhắc nhở dịch vụ {{product_name}} của bạn sẽ hết hạn vào ngày {{end_date}} (chỉ còn 3 ngày nữa).\n\nVui lòng tiến hành gia hạn sớm để tránh gián đoạn dịch vụ.\n\nXin cảm ơn!\n{{company_name}}',
        type: 'reminder_3_days'
      },
      {
        name: 'Nhắc nhở trước 1 ngày',
        subject: 'Thông báo khẩn cấp: Dịch vụ {{product_name}} sẽ hết hạn VÀO NGÀY MAI!',
        body: 'Xin chào {{customer_name}},\n\nDịch vụ {{product_name}} của bạn sẽ hết hạn vào ngày mai ({{end_date}}).\n\nNếu không gia hạn, hệ thống sẽ tự động tạm dừng dịch vụ sau thời gian này.\n\nTrân trọng,\n{{company_name}}',
        type: 'reminder_1_day'
      },
      {
        name: 'Nhắc nhở khi hết hạn',
        subject: 'Thông báo: Dịch vụ {{product_name}} của bạn đã HẾT HẠN!',
        body: 'Xin chào {{customer_name}},\n\nDịch vụ {{product_name}} (Mã đơn hàng: {{order_code}}) đăng ký từ ngày {{start_date}} đã hết hạn vào ngày {{end_date}}.\n\nHành động: Hệ thống tạm ngưng cung cấp dịch vụ. Vui lòng liên hệ để mở lại và gia hạn sớm nhất.\n\nTrân trọng,\n{{company_name}}',
        type: 'reminder_expired'
      }
    ]
  });

  await prisma.reminderSettings.createMany({
    data: [
      { daysBefore: 7, enabled: true },
      { daysBefore: 3, enabled: true },
      { daysBefore: 1, enabled: true },
      { daysBefore: 0, enabled: true }
    ]
  });

  console.log('Đã cấu hình xong SMTP, Templates và cài đặt thông báo.');
  console.log('Quá trình sinh 1000 dữ liệu mẫu đã hoàn tất thành công!');
}

main()
  .catch((e) => {
    console.error('Lỗi khi chạy seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
