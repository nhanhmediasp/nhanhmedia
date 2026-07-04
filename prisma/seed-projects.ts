import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Bắt đầu sinh dữ liệu mẫu cho Dự án...');

  // 1. Clean existing project data
  await prisma.toolCost.deleteMany();
  await prisma.websiteCost.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskColumn.deleteMany();
  await prisma.project.deleteMany();

  console.log('Đã dọn dẹp các dự án cũ.');

  const now = new Date();

  // PROJECT 1: Thiết kế Website E-commerce Nhanh Media Shop
  const project1Start = new Date();
  project1Start.setDate(now.getDate() - 15);
  const project1End = new Date();
  project1End.setDate(now.getDate() + 30);

  const p1 = await prisma.project.create({
    data: {
      name: 'Thiết kế Website E-commerce Nhanh Media Shop',
      description: 'Dự án xây dựng cửa hàng trực tuyến bán license phần mềm và khóa học marketing. Hỗ trợ thanh toán tự động qua cổng VNPAY.',
      startDate: project1Start,
      endDate: project1End,
      status: 'running',
      budget: 25000000,
    },
  });

  // Create columns for P1
  const col1Todo = await prisma.taskColumn.create({ data: { projectId: p1.id, name: 'Cần làm', position: 0 } });
  const col1InProg = await prisma.taskColumn.create({ data: { projectId: p1.id, name: 'Đang làm', position: 1 } });
  const col1Done = await prisma.taskColumn.create({ data: { projectId: p1.id, name: 'Hoàn thành', position: 2 } });

  // Create tasks for P1
  await prisma.task.createMany({
    data: [
      {
        projectId: p1.id,
        columnId: col1Done.id,
        title: 'Thiết kế wireframe & UI/UX',
        description: 'Phác thảo các trang chủ, trang sản phẩm, trang thanh toán trên Figma và lấy feedback của khách hàng.',
        assignee: 'Nguyễn Văn Admin',
        deadline: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'Design,Figma',
        position: 0,
      },
      {
        projectId: p1.id,
        columnId: col1Done.id,
        title: 'Thiết lập cơ sở dữ liệu Prisma + PostgreSQL',
        description: 'Tạo các model User, Customer, Product, Order, Project và thiết lập quan hệ. Chạy migration.',
        assignee: 'Nguyễn Văn Admin',
        deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'Database,Prisma',
        position: 1,
      },
      {
        projectId: p1.id,
        columnId: col1InProg.id,
        title: 'Xây dựng trang chủ & trang sản phẩm',
        description: 'Cắt giao diện Responsive bằng Tailwind CSS v4, tối ưu SEO và các hiệu ứng micro-interactions.',
        assignee: 'Trần Thị Thành Viên',
        deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        tags: 'Frontend,Tailwind',
        position: 0,
      },
      {
        projectId: p1.id,
        columnId: col1Todo.id,
        title: 'Tích hợp cổng thanh toán VNPAY',
        description: 'Viết API xử lý IPN, tạo URL thanh toán và kiểm tra chữ ký bảo mật từ VNPAY Sandbox.',
        assignee: 'Nguyễn Văn Admin',
        deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'Payment,Backend',
        position: 0,
      },
      {
        projectId: p1.id,
        columnId: col1Todo.id,
        title: 'Kiểm thử bảo mật và hiệu năng load trang',
        description: 'Kiểm tra chống lỗi SQL Injection, XSS và tối ưu điểm số Lighthouse trên mobile đạt trên 90.',
        assignee: 'Trần Thị Thành Viên',
        deadline: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        priority: 'low',
        tags: 'Testing,Security',
        position: 1,
      },
    ],
  });

  // Website costs for P1
  await prisma.websiteCost.createMany({
    data: [
      {
        projectId: p1.id,
        name: 'Tên miền nhanhmediashop.vn',
        type: 'domain',
        amount: 750000,
        date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        note: 'Đăng ký thời hạn 1 năm tại Mắt Bão.',
      },
      {
        projectId: p1.id,
        name: 'Hosting Cloud Pro Vietnix',
        type: 'hosting',
        amount: 2400000,
        date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        note: 'Gói hosting tốc độ cao tối ưu WordPress/NodeJS 1 năm.',
      },
      {
        projectId: p1.id,
        name: 'Theme Premium E-commerce Tailwind',
        type: 'theme',
        amount: 1500000,
        date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
        note: 'Bản quyền sử dụng trọn đời từ nhà phát triển.',
      },
    ],
  });

  // Tool costs for P1
  await prisma.toolCost.createMany({
    data: [
      {
        projectId: p1.id,
        name: 'SendGrid Email Marketing',
        purpose: 'Gửi OTP xác thực tài khoản và gửi mail marketing chiến dịch ra mắt.',
        plan: 'Essentials 40K',
        cost: 480000,
        billingCycle: 'month',
        nextRenewal: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        note: 'Gia hạn tự động hàng tháng qua thẻ VISA.',
      },
      {
        projectId: p1.id,
        name: 'Canva Pro',
        purpose: 'Thiết kế banner chương trình khuyến mãi và hình ảnh sản phẩm.',
        plan: 'Pro Team',
        cost: 300000,
        billingCycle: 'month',
        nextRenewal: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        note: 'Chia sẻ tài khoản nhóm 5 người.',
      },
    ],
  });


  // PROJECT 2: Chiến dịch Marketing Trọn gói Spa Sen Vàng
  const project2Start = new Date();
  project2Start.setDate(now.getDate() - 5);
  const project2End = new Date();
  project2End.setDate(now.getDate() + 25);

  const p2 = await prisma.project.create({
    data: {
      name: 'Chiến dịch Marketing Trọn gói Spa Sen Vàng',
      description: 'Lên chiến lược truyền thông đa kênh Facebook, TikTok và Google Maps cho thương hiệu Spa Sen Vàng cơ sở Quận 1.',
      startDate: project2Start,
      endDate: project2End,
      status: 'running',
      budget: 45000000,
    },
  });

  // Create columns for P2
  const col2Todo = await prisma.taskColumn.create({ data: { projectId: p2.id, name: 'Cần làm', position: 0 } });
  const col2InProg = await prisma.taskColumn.create({ data: { projectId: p2.id, name: 'Đang làm', position: 1 } });
  const col2Done = await prisma.taskColumn.create({ data: { projectId: p2.id, name: 'Hoàn thành', position: 2 } });

  // Create tasks for P2
  await prisma.task.createMany({
    data: [
      {
        projectId: p2.id,
        columnId: col2Done.id,
        title: 'Nghiên cứu từ khóa & chân dung khách hàng Spa',
        description: 'Khảo sát hành vi của nhóm phụ nữ tuổi 25-45 về các dịch vụ chăm sóc da mặt và giảm béo.',
        assignee: 'Lê Văn CTV',
        deadline: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'Marketing,Research',
        position: 0,
      },
      {
        projectId: p2.id,
        columnId: col2InProg.id,
        title: 'Lên kế hoạch content chi tiết tháng 7',
        description: 'Xây dựng 24 bài viết Facebook Page và kịch bản cho 8 video ngắn Reels.',
        assignee: 'Lê Văn CTV',
        deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        tags: 'Content,Facebook',
        position: 0,
      },
      {
        projectId: p2.id,
        columnId: col2Todo.id,
        title: 'Thiết lập tài khoản quảng cáo Facebook & TikTok',
        description: 'Cài đặt Pixel, thêm phương thức thanh toán và thiết lập các chiến dịch chạy thử (A/B testing).',
        assignee: 'Nguyễn Văn Admin',
        deadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'Ads,Setup',
        position: 0,
      },
      {
        projectId: p2.id,
        columnId: col2Todo.id,
        title: 'Sản xuất 10 video ngắn Reels/TikTok',
        description: 'Quay dựng trực tiếp tại Spa Sen Vàng giới thiệu các quy trình và review chân thực từ khách hàng.',
        assignee: 'Lê Văn CTV',
        deadline: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        tags: 'Production,TikTok',
        position: 1,
      },
    ],
  });

  // Tool costs for P2
  await prisma.toolCost.createMany({
    data: [
      {
        projectId: p2.id,
        name: 'Ahrefs Standard',
        purpose: 'Nghiên cứu từ khóa SEO và theo dõi thứ hạng từ khóa của đối thủ cạnh tranh.',
        plan: 'Standard Plan',
        cost: 2400000,
        billingCycle: 'month',
        nextRenewal: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        note: 'Gia hạn thủ công hàng tháng.',
      },
      {
        projectId: p2.id,
        name: 'Kits.AI',
        purpose: 'Tạo giọng đọc AI thuyết minh cho các video ngắn Reels/TikTok.',
        plan: 'Voice Creator',
        cost: 350000,
        billingCycle: 'month',
        nextRenewal: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        note: 'Đăng ký gói rẻ nhất.',
      },
    ],
  });


  // PROJECT 3: Xây dựng Landing Page Bất Động Sản Green Home
  const project3Start = new Date();
  project3Start.setDate(now.getDate() - 30);
  const project3End = new Date();
  project3End.setDate(now.getDate() - 10);

  const p3 = await prisma.project.create({
    data: {
      name: 'Xây dựng Landing Page Bất Động Sản Green Home',
      description: 'Thiết kế và lập trình trang Landing Page giới thiệu dự án chung cư cao cấp Green Home, thu thập thông tin khách hàng tiềm năng.',
      startDate: project3Start,
      endDate: project3End,
      status: 'completed',
      budget: 8000000,
    },
  });

  // Create columns for P3
  const col3Todo = await prisma.taskColumn.create({ data: { projectId: p3.id, name: 'Cần làm', position: 0 } });
  const col3InProg = await prisma.taskColumn.create({ data: { projectId: p3.id, name: 'Đang làm', position: 1 } });
  const col3Done = await prisma.taskColumn.create({ data: { projectId: p3.id, name: 'Hoàn thành', position: 2 } });

  // Create tasks for P3 (All Completed)
  await prisma.task.createMany({
    data: [
      {
        projectId: p3.id,
        columnId: col3Done.id,
        title: 'Thu thập tài liệu dự án Green Home',
        description: 'Nhận catalog, bảng giá và hình ảnh thực tế từ chủ đầu tư.',
        assignee: 'Trần Thị Thành Viên',
        deadline: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        tags: 'Requirement',
        position: 0,
      },
      {
        projectId: p3.id,
        columnId: col3Done.id,
        title: 'Thiết kế Figma Landing Page',
        description: 'Vẽ UI cho cả bản desktop và mobile, thống nhất màu sắc thương hiệu xanh lá/vàng.',
        assignee: 'Nguyễn Văn Admin',
        deadline: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'Figma,UIUX',
        position: 1,
      },
      {
        projectId: p3.id,
        columnId: col3Done.id,
        title: 'Code giao diện Next.js + Tailwind CSS',
        description: 'Lập trình trang Landing Page tĩnh, thêm form đăng ký tư vấn tích hợp gửi dữ liệu về Google Sheet.',
        assignee: 'Nguyễn Văn Admin',
        deadline: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'NextJS,Tailwind',
        position: 2,
      },
      {
        projectId: p3.id,
        columnId: col3Done.id,
        title: 'Bàn giao mã nguồn và cấu hình trỏ tên miền',
        description: 'Trỏ tên miền từ mắt bão về host, cấu hình SSL và hướng dẫn khách hàng sử dụng Google Sheet nhận data.',
        assignee: 'Nguyễn Văn Admin',
        deadline: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'Deploy,Domain',
        position: 3,
      },
    ],
  });

  // Website costs for P3
  await prisma.websiteCost.create({
    data: {
      projectId: p3.id,
      name: 'Tên miền greenhomeproject.com',
      type: 'domain',
      amount: 350000,
      date: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      note: 'Mua giúp khách hàng.',
    },
  });


  // PROJECT 4: Tối ưu SEO Website Mỹ Phẩm Organic
  const project4Start = new Date();
  project4Start.setDate(now.getDate() - 60);
  const project4End = new Date();
  project4End.setDate(now.getDate() - 30);

  const p4 = await prisma.project.create({
    data: {
      name: 'Tối ưu SEO Website Mỹ Phẩm Organic',
      description: 'Phân tích kỹ thuật On-page, tối ưu Core Web Vitals và lập kế hoạch từ khóa cho site thương mại điện tử Mỹ phẩm Organic.',
      startDate: project4Start,
      endDate: project4End,
      status: 'paused',
      budget: 15000000,
    },
  });

  // Create columns for P4
  const col4Todo = await prisma.taskColumn.create({ data: { projectId: p4.id, name: 'Cần làm', position: 0 } });
  const col4InProg = await prisma.taskColumn.create({ data: { projectId: p4.id, name: 'Đang làm', position: 1 } });
  const col4Done = await prisma.taskColumn.create({ data: { projectId: p4.id, name: 'Hoàn thành', position: 2 } });

  // Create tasks for P4
  await prisma.task.createMany({
    data: [
      {
        projectId: p4.id,
        columnId: col4Done.id,
        title: 'Audit SEO Onpage & Offpage hiện tại',
        description: 'Sử dụng Screaming Frog quét lỗi link hỏng, trùng tiêu đề, thiếu Alt tag và phân tích backlink đối thủ.',
        assignee: 'Lê Văn CTV',
        deadline: new Date(now.getTime() - 55 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'SEO,Audit',
        position: 0,
      },
      {
        projectId: p4.id,
        columnId: col4Done.id,
        title: 'Tối ưu tốc độ tải trang Core Web Vitals',
        description: 'Tối ưu ảnh WebP, giảm dung lượng JS dư thừa, thiết lập bộ nhớ đệm cache trên Cloudflare.',
        assignee: 'Nguyễn Văn Admin',
        deadline: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        priority: 'high',
        tags: 'Performance,Cloudflare',
        position: 1,
      },
      {
        projectId: p4.id,
        columnId: col4Todo.id,
        title: 'Viết 15 bài viết chuẩn SEO ngách Mỹ phẩm',
        description: 'Lên bài viết chia sẻ kiến thức chăm sóc da thiên nhiên lồng ghép giới thiệu sản phẩm của shop.',
        assignee: 'Lê Văn CTV',
        deadline: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        tags: 'Content,SEO',
        position: 0,
      },
    ],
  });

  console.log('Đã tạo thành công 4 dự án mẫu!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
