const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding audit logs...');
  
  // Find or create admin, ctv, agency, member users to link to actor_user_id
  let admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  let collaborator = await prisma.user.findFirst({ where: { role: 'collaborator' } });
  let agency = await prisma.user.findFirst({ where: { role: 'agency' } });
  let member = await prisma.user.findFirst({ where: { role: 'member' } });

  // Fallbacks if users don't exist
  const fakeId = () => '00000000-0000-0000-0000-' + Math.floor(100000000000 + Math.random() * 900000000000);
  admin = admin || { id: fakeId(), name: 'Nguyễn Văn Admin', email: 'admin@nhanhmedia.com', role: 'admin' };
  collaborator = collaborator || { id: fakeId(), name: 'Trần Thị CTV', email: 'ctv@nhanhmedia.com', role: 'collaborator' };
  agency = agency || { id: fakeId(), name: 'Phạm Văn Đại Lý', email: 'daily@nhanhmedia.com', role: 'agency' };
  member = member || { id: fakeId(), name: 'Lê Văn Thành Viên', email: 'member@nhanhmedia.com', role: 'member' };

  const logs = [
    {
      actorUserId: admin.id,
      actorName: admin.name,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'LOGIN_SUCCESS',
      actionLabel: 'Đăng nhập thành công',
      module: 'auth',
      description: `${admin.name} đã đăng nhập vào hệ thống`,
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      requestMethod: 'POST',
      requestPath: '/api/auth/login',
      status: 'success',
      createdAt: new Date(Date.now() - 3600000 * 5)
    },
    {
      actorUserId: null,
      actorName: 'Guest',
      actorEmail: null,
      actorRole: 'guest',
      action: 'LOGIN_FAILED',
      actionLabel: 'Đăng nhập thất bại',
      module: 'auth',
      description: 'Đăng nhập thất bại với email: hack_attempts@gmail.com',
      ipAddress: '45.120.33.2',
      userAgent: 'curl/7.68.0',
      requestMethod: 'POST',
      requestPath: '/api/auth/login',
      status: 'failed',
      errorMessage: 'Email hoặc mật khẩu không chính xác.',
      createdAt: new Date(Date.now() - 3600000 * 4.8)
    },
    {
      actorUserId: admin.id,
      actorName: admin.name,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'CREATE_PRODUCT',
      actionLabel: 'Tạo sản phẩm',
      module: 'products',
      entityType: 'Product',
      entityId: 'prod-seed-1',
      entityName: 'Gói Netflix Premium',
      description: `Đã tạo sản phẩm mới: Gói Netflix Premium (Slug: netflix-premium)`,
      newValues: JSON.stringify({
        name: 'Gói Netflix Premium',
        slug: 'netflix-premium',
        description: 'Xem phim Netflix chất lượng 4K Ultra HD',
        status: 'active'
      }),
      ipAddress: '192.168.1.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      requestMethod: 'POST',
      requestPath: '/api/admin/products',
      status: 'success',
      createdAt: new Date(Date.now() - 3600000 * 4)
    },
    {
      actorUserId: admin.id,
      actorName: admin.name,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: 'UPDATE_SMTP_SETTINGS',
      actionLabel: 'Sửa cấu hình SMTP',
      module: 'settings',
      entityType: 'EmailSettings',
      entityId: 'default',
      entityName: 'SMTP Settings',
      description: 'Đã cập nhật cấu hình email SMTP của hệ thống',
      oldValues: JSON.stringify({
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpUser: 'old_email@gmail.com',
        smtpPasswordEncrypted: '********'
      }),
      newValues: JSON.stringify({
        smtpHost: 'smtp.gmail.com',
        smtpPort: 465,
        smtpUser: 'contact@nhanhmedia.com',
        smtpPasswordEncrypted: '********'
      }),
      changedFields: JSON.stringify(['smtpUser']),
      ipAddress: '192.168.1.10',
      requestMethod: 'POST',
      requestPath: '/api/settings/email',
      status: 'success',
      createdAt: new Date(Date.now() - 3600000 * 3.5)
    },
    {
      actorUserId: collaborator.id,
      actorName: collaborator.name,
      actorEmail: collaborator.email,
      actorRole: collaborator.role,
      action: 'CREATE_ORDER',
      actionLabel: 'Tạo đơn hàng',
      module: 'orders',
      entityType: 'Order',
      entityId: 'order-seed-1',
      entityName: 'NM260620-8849',
      description: `Đã tạo đơn hàng mới: NM260620-8849 cho khách hàng Nguyễn Thị B`,
      newValues: JSON.stringify({
        orderCode: 'NM260620-8849',
        price: 250000,
        status: 'new'
      }),
      ipAddress: '115.79.44.18',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      requestMethod: 'POST',
      requestPath: '/api/orders',
      status: 'success',
      createdAt: new Date(Date.now() - 3600000 * 2)
    },
    {
      actorUserId: agency.id,
      actorName: agency.name,
      actorEmail: agency.email,
      actorRole: agency.role,
      action: 'RENEW_ORDER',
      actionLabel: 'Gia hạn đơn hàng',
      module: 'orders',
      entityType: 'Order',
      entityId: 'order-seed-2',
      entityName: 'NM260515-9920',
      description: 'Đã gia hạn đơn hàng NM260515-9920 đến ngày 26/07/2026',
      oldValues: JSON.stringify({
        status: 'expired',
        endDate: '2026-06-15T00:00:00.000Z'
      }),
      newValues: JSON.stringify({
        status: 'running',
        endDate: '2026-07-26T00:00:00.000Z'
      }),
      changedFields: JSON.stringify(['status', 'endDate']),
      ipAddress: '118.69.3.201',
      requestMethod: 'POST',
      requestPath: '/api/orders/order-seed-2/renew',
      status: 'success',
      createdAt: new Date(Date.now() - 3600000 * 1.5)
    },
    {
      actorUserId: member.id,
      actorName: member.name,
      actorEmail: member.email,
      actorRole: member.role,
      action: 'UPDATE_CUSTOMER',
      actionLabel: 'Sửa khách hàng',
      module: 'customers',
      entityType: 'Customer',
      entityId: 'cust-seed-1',
      entityName: 'Trần Văn C',
      description: 'Đã sửa thông tin khách hàng: Trần Văn C (0987654321)',
      oldValues: JSON.stringify({
        phone: '0987654321',
        email: 'tranc@gmail.com'
      }),
      newValues: JSON.stringify({
        phone: '0987654321',
        email: 'tranvanc_new@gmail.com'
      }),
      changedFields: JSON.stringify(['email']),
      ipAddress: '14.161.5.89',
      requestMethod: 'PUT',
      requestPath: '/api/customers/cust-seed-1',
      status: 'success',
      createdAt: new Date(Date.now() - 3600000 * 0.5)
    }
  ];

  for (const log of logs) {
    await prisma.auditLog.create({ data: log });
  }

  console.log('Seeded audit logs successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
