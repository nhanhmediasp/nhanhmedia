# BẢN ĐẶC TẢ TÍNH NĂNG VÀ YÊU CẦU KỸ THUẬT (PROMPT TÁI TẠO HỆ THỐNG - QUẢN LÝ THUẦN)

Dưới đây là prompt chi tiết đã được tối giản hóa bằng cách loại bỏ hoàn toàn phần Cộng tác viên (CTV), Đại lý (Agency) và Thành viên (Member). Hệ thống giờ đây chỉ dành riêng cho **Quản trị viên (Admin) và Nhân viên (Staff)** quản lý trực tiếp khách hàng và đơn hàng dịch vụ.

---

```markdown
Bạn là một lập trình viên Fullstack cấp cao. Hãy xây dựng một hệ thống **Quản lý Khách hàng, Sản phẩm & Đơn hàng dịch vụ** thương hiệu **Nhanh Media** (hoặc **FreelancerHub**).

Hệ thống được phát triển bằng **Next.js (App Router)**, **TypeScript**, **Tailwind CSS v4**, và **Prisma ORM**. Giao diện mặc định theo phong cách **Premium Dark Theme với tông màu Tím chủ đạo (Purple accent)**, sử dụng hiệu ứng **Glassmorphism** và các micro-animations mượt mà từ **Lucide Icons** và **Framer Motion** (hoặc CSS transitions).

Hệ thống này **chỉ dành cho Quản lý (Admin/Staff)** đăng nhập để vận hành công việc, không có cổng đăng ký công cộng cho khách hàng hay CTV bên ngoài.

Hãy thực hiện dự án theo các thông số chi tiết dưới đây:
a
---

## 🚀 1. CÔNG NGHỆ & THƯ VIỆN SỬ DỤNG
1. **Frontend / Backend**: Next.js + TypeScript (sử dụng App Router, Route Handlers, Middlewares để kiểm soát truy cập).
2. **Styling**: Tailwind CSS v4, phong cách Glassmorphism (nền tối, viền mờ `border-white/10`, hiệu ứng `backdrop-blur-md bg-slate-900/80`).
3. **Icons**: `lucide-react`.
4. **Cơ sở dữ liệu**: Prisma ORM hỗ trợ SQLite (cho local test) và PostgreSQL (cho Production).
5. **Bảo mật & Session**: 
   - JWT Cookie-based Session tự tạo (chỉ tài khoản Admin/Staff được truy cập Dashboard).
   - Mã hóa mật khẩu tài khoản bằng `bcryptjs`.
   - Mã hóa mật khẩu SMTP bằng thuật toán đối xứng `AES-256-CBC` trước khi lưu vào Database, giải mã khi gửi mail.
6. **Email**: Thư viện `nodemailer` gửi email qua cổng SMTP.

---

## 🗄️ 2. SCHEMA CƠ SỞ DỮ LIỆU (PRISMA)
Dưới đây là cấu trúc Database tinh giản, loại bỏ các bảng liên quan đến Phân chia cấp bậc giá và Đọc thông báo:

```prisma
datasource db {
  provider = "postgresql" // Hoặc "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 1. Quản lý Tài khoản Nội bộ (Admin hoặc Staff)
model User {
  id            String   @id @default(uuid())
  name          String
  email         String   @unique
  passwordHash  String   @map("password_hash")
  phone         String?
  role          String   @default("admin") // admin, staff
  status        String   @default("active") // active, locked
  note          String?
  avatarUrl     String?  @map("avatar_url")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  customers      Customer[]
  orders         Order[]
  renewals       OrderRenewal[]

  @@index([role])
  @@index([status])
  @@index([createdAt])
  @@map("users")
}

// 2. Quản lý Khách hàng của hệ thống
model Customer {
  id               String   @id @default(uuid())
  name             String
  phone            String   @unique
  facebook         String?
  zalo             String?
  email            String?
  createdByUserId  String   @map("created_by_user_id")
  note             String?
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  createdByUser    User     @relation(fields: [createdByUserId], references: [id], onDelete: Cascade)
  orders           Order[]
  emailLogs        EmailLog[]

  @@index([createdByUserId])
  @@index([createdAt])
  @@map("customers")
}

// 3. Quản lý Sản phẩm / Dịch vụ cung cấp
model Product {
  id           String   @id @default(uuid())
  name         String
  slug         String   @unique
  description  String?
  imageUrl     String?  @map("image_url")
  status       String   @default("active") // active, inactive
  importPrice  Float?   @map("import_price")
  supplierName String?  @map("supplier_name")
  supplierLink String?  @map("supplier_link")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  variants    ProductVariant[]
  orders      Order[]

  @@index([status])
  @@index([createdAt])
  @@map("products")
}

// 4. Các Gói Thời hạn của Sản phẩm (ví dụ: 1 tháng, 6 tháng, 1 năm)
// Giá bán được lưu trực tiếp tại đây thay vì bảng phân quyền theo vai trò
model ProductVariant {
  id            String   @id @default(uuid())
  productId     String   @map("product_id")
  name          String
  durationValue Int      @map("duration_value")
  durationUnit  String   @map("duration_unit") // day, month, year
  price         Float    // Giá bán mặc định
  status        String   @default("active") // active, inactive
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  product       Product        @relation(fields: [productId], references: [id], onDelete: Cascade)
  orders        Order[]
  renewals      OrderRenewal[]

  @@index([productId])
  @@index([status])
  @@index([createdAt])
  @@map("product_variants")
}

// 5. Đơn hàng kích hoạt dịch vụ cho Khách hàng
model Order {
  id              String   @id @default(uuid())
  orderCode       String   @unique @map("order_code")
  customerId      String   @map("customer_id")
  createdByUserId String   @map("created_by_user_id") // Người tạo đơn (Admin hoặc Staff)
  productId       String   @map("product_id")
  variantId       String   @map("variant_id")
  supplierId      String?  @map("supplier_id")
  price           Float    // Giá bán của gói tại thời điểm tạo đơn
  customPrice     Float?   @map("custom_price") // Giá thực tế thu của khách (nếu có giảm/tăng)
  importPrice     Float?   @map("import_price") // Giá vốn nhập của nguồn hàng
  amountPaid      Float    @default(0) @map("amount_paid") // Số tiền khách đã thanh toán thực tế
  status          String   @default("running") // running, expired_soon, expired, cancelled, processing
  startDate       DateTime @map("start_date")
  endDate         DateTime @map("end_date")
  note            String?
  internalNote    String?  @map("internal_note")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  refundAmount    Float?   @map("refund_amount")
  refundedAt      DateTime? @map("refunded_at")

  customer      Customer       @relation(fields: [customerId], references: [id])
  createdByUser User           @relation(fields: [createdByUserId], references: [id])
  product       Product        @relation(fields: [productId], references: [id])
  variant       ProductVariant @relation(fields: [variantId], references: [id])
  supplier      Supplier?      @relation(fields: [supplierId], references: [id], onDelete: SetNull)
  renewals      OrderRenewal[]
  emailLogs     EmailLog[]

  @@index([createdAt])
  @@index([status])
  @@index([customerId])
  @@index([createdByUserId])
  @@index([productId])
  @@index([supplierId])
  @@index([endDate])
  @@index([createdAt, status])
  @@map("orders")
}

// 6. Nhật ký Lịch sử Gia hạn Đơn hàng
model OrderRenewal {
  id                String   @id @default(uuid())
  orderId           String   @map("order_id")
  oldEndDate        DateTime @map("old_end_date")
  newEndDate        DateTime @map("new_end_date")
  variantId         String   @map("variant_id")
  price             Float
  renewedByUserId   String   @map("renewed_by_user_id")
  createdAt         DateTime @default(now()) @map("created_at")

  order             Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant           ProductVariant @relation(fields: [variantId], references: [id])
  renewedByUser     User           @relation(fields: [renewedByUserId], references: [id])

  @@index([createdAt])
  @@index([renewedByUserId])
  @@index([orderId])
  @@map("order_renewals")
}

// 7. Cấu hình SMTP gửi thư (Mã hóa mật khẩu bằng AES-256-CBC)
model EmailSettings {
  id                    String   @id @default("default")
  smtpHost              String   @map("smtp_host")
  smtpPort              Int      @map("smtp_port")
  smtpUser              String   @map("smtp_user")
  smtpPasswordEncrypted String   @map("smtp_password_encrypted")
  smtpSecure            Boolean  @default(true) @map("smtp_secure")
  fromName              String   @map("from_name")
  fromEmail             String   @map("from_email")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("email_settings")
}

// 8. Mẫu Template Email Nhắc gia hạn
model EmailTemplate {
  id        String   @id @default(uuid())
  name      String   @unique
  subject   String
  body      String
  type      String   // reminder_7_days, reminder_3_days, reminder_1_day, reminder_expired
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("email_templates")
}

// 9. Nhật ký Email nhắc hạn đã gửi
model EmailLog {
  id           String   @id @default(uuid())
  orderId      String?  @map("order_id")
  customerId   String   @map("customer_id")
  emailTo      String   @map("email_to")
  subject      String
  body         String
  status       String   // success, failed
  sentAt       DateTime @default(now()) @map("sent_at")
  errorMessage String?  @map("error_message")

  order        Order?    @relation(fields: [orderId], references: [id], onDelete: SetNull)
  customer     Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@map("email_logs")
}

// 10. Cấu hình các mốc nhắc hạn tự động
model ReminderSettings {
  id         String   @id @default(uuid())
  daysBefore Int      @unique @map("days_before")
  enabled    Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("reminder_settings")
}

// 11. Nhật ký Hệ thống (Audit Log) truy vết thay đổi dữ liệu
model AuditLog {
  id              String   @id @default(uuid())
  actorUserId     String?  @map("actor_user_id")
  actorName       String   @map("actor_name")
  actorEmail      String?  @map("actor_email")
  actorRole       String   @map("actor_role") // admin, staff
  action          String
  actionLabel     String   @map("action_label")
  module          String   // users, customers, products, orders, settings, auth, reports
  entityType      String?  @map("entity_type")
  entityId        String?  @map("entity_id")
  entityName      String?  @map("entity_name")
  description     String
  oldValues       String?  @map("old_values") // dạng JSON string
  newValues       String?  @map("new_values") // dạng JSON string
  changedFields   String?  @map("changed_fields") // dạng JSON array string
  ipAddress       String?  @map("ip_address")
  userAgent       String?  @map("user_agent")
  requestMethod   String?  @map("request_method")
  requestPath     String?  @map("request_path")
  status          String   @default("success") // success, failed
  errorMessage    String?  @map("error_message")
  createdAt       DateTime @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([actorUserId])
  @@index([actorRole])
  @@index([action])
  @@index([module])
  @@index([entityType])
  @@index([entityId])
  @@index([status])
  @@map("audit_logs")
}

// 12. Đối tác / Nguồn nhập hàng dịch vụ
model Supplier {
  id         String   @id @default(uuid())
  name       String   @unique
  contactUrl String?  @map("contact_url")
  icon       String?
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  orders     Order[]

  @@index([createdAt])
  @@map("suppliers")
}

// 13. Cài đặt Cấu hình Chung Website & Bảo mật đăng nhập
model WebsiteSettings {
  id                    String   @id @default("default")
  siteName              String   @default("Nhanh Media") @map("site_name")
  siteDescription       String?  @map("site_description")
  logoUrl               String?  @map("logo_url")
  faviconUrl            String?  @map("favicon_url")
  adminEmail            String?  @map("admin_email")
  adminPhone            String?  @map("admin_phone")
  adminAddress          String?  @map("admin_address")
  facebookUrl           String?  @map("facebook_url")
  zaloUrl               String?  @map("zalo_url")
  telegramUrl           String?  @map("telegram_url")
  loginMaxAttempts      Int      @default(5) @map("login_max_attempts")
  loginLockEnabled      Boolean  @default(true) @map("login_lock_enabled")
  loginLockDurationMins Int      @default(15) @map("login_lock_duration_mins")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("website_settings")
}

// 14. Theo dõi và bảo vệ chống Brute-force đăng nhập
model LoginAttempt {
  id          String   @id @default(uuid())
  ipAddress   String   @map("ip_address")
  email       String?
  attempts    Int      @default(1)
  lastAttempt DateTime @default(now()) @map("last_attempt")
  lockedUntil DateTime? @map("locked_until")

  @@index([ipAddress])
  @@index([email])
  @@index([lastAttempt])
  @@map("login_attempts")
}
```

---

## 🔑 3. LUỒNG BẢO MẬT & PHÂN QUYỀN
Hệ thống sử dụng Cookie-based JWT Session. Chỉ có tài khoản nội bộ mới có quyền truy cập hệ thống quản trị:

1. **Quyền Admin (Toàn quyền)**:
   - Quản lý tài khoản Nhân viên (`Staff`), phân quyền, kích hoạt hoặc khóa tài khoản.
   - Quản lý danh mục sản phẩm và giá bán mặc định của các gói thời gian.
   - Xem báo cáo doanh thu, giá vốn, và lợi nhuận gộp của toàn hệ thống.
   - Cấu hình SMTP, mốc nhắc hạn, template email và các thông số cài đặt website chung.
   - Xem nhật ký hệ thống nâng cao (Audit Logs) để biết ai đã thực hiện thay đổi dữ liệu nào.

2. **Quyền Staff (Nhân viên vận hành)**:
   - Đăng nhập hệ thống bằng email và password được cấp.
   - Tạo mới khách hàng, quản lý thông tin khách hàng.
   - Lên đơn hàng dịch vụ cho khách hàng, điền thông tin gia hạn hoặc hoàn tiền.
   - Xem các báo cáo đơn hàng và sản phẩm cơ bản (không được xem báo cáo doanh thu tổng hoặc lợi nhuận của toàn hệ thống).
   - Không được thay đổi SMTP, cấu hình bảo mật hoặc quản lý tài khoản User khác.

3. **Tính năng Bảo vệ Đăng nhập (Login Lockout)**:
   - Nếu đăng nhập sai quá số lần quy định (`loginMaxAttempts` - mặc định 5 lần) từ một địa chỉ IP hoặc Email nhất định.
   - Hệ thống sẽ tự động khóa đăng nhập của IP/Email đó trong vòng `loginLockDurationMins` (mặc định 15 phút) để bảo mật.

---

## 🖥️ 4. BẢN ĐỒ ROUTING & CÁC TRANG CẦN XÂY DỰNG

### A. Luồng Công cộng (Public Routes):
- `/login`: Trang đăng nhập duy nhất cho Admin và Staff. Tích hợp tính năng tự động khóa IP khi nhập sai mật khẩu quá 5 lần.
- `/forgot-password`: Yêu cầu gửi email khôi phục mật khẩu.
- `/reset-password`: Điền mật khẩu mới.

### B. Dashboard Quản trị & Vận hành (Admin & Staff Routes):
Hệ thống sử dụng chung một giao diện Dashboard nhưng ẩn/hiện chức năng tùy theo phân quyền `role` (Admin / Staff):

- `/admin/dashboard`: Bảng tổng quan hiển thị các số liệu thống kê:
  - Doanh thu thực tế (`customPrice` hoặc `price` của các đơn hàng).
  - Chi phí giá vốn (`importPrice`).
  - Lợi nhuận gộp (`Doanh thu - Giá vốn`).
  - Các mốc đếm ngược số lượng dịch vụ sắp hết hạn.
  - *(Nhân viên Staff sẽ không nhìn thấy thống kê Lợi nhuận và Giá vốn)*.
- `/admin/reports`: Trang lọc doanh thu chi tiết theo khoảng thời gian, theo sản phẩm, xuất báo cáo đơn hàng ra Excel/CSV.
- `/admin/users`: Quản lý tài khoản Admin và Nhân viên Staff (Thêm tài khoản mới, Kích hoạt/Khóa, Đổi mật khẩu).
- `/admin/customers`: Danh sách toàn bộ khách hàng. Quản lý thông tin liên hệ (Email, Số điện thoại, Facebook, Zalo, Ghi chú).
- `/admin/products`: Quản lý danh mục Sản phẩm. Trong mỗi sản phẩm, tạo các gói dịch vụ (ví dụ: 1 tháng, 6 tháng, 1 năm) với giá bán tương ứng.
- `/admin/suppliers`: Danh sách nguồn nhập hàng (Nhà cung cấp) để đối soát đơn hàng.
- `/admin/orders`: Quản lý đơn hàng dịch vụ:
  - Tạo đơn hàng mới cho khách hàng: chọn Khách hàng, chọn Sản phẩm, chọn Gói dịch vụ, hệ thống tự động điền giá. Admin/Staff có thể tùy chỉnh giá bán (`customPrice`), điền giá vốn (`importPrice`), chọn Nguồn hàng (`Supplier`) và nhập số tiền khách đã thanh toán thực tế (`amountPaid`).
  - Hệ thống tự động tính ngày bắt đầu (`startDate`) và ngày kết thúc (`endDate`).
  - Thao tác đơn hàng: Gia hạn đơn hàng (tự động lưu lịch sử vào `OrderRenewal`), Hủy đơn, Hoàn tiền (`refundAmount` và ngày hoàn tiền).
- `/admin/audit-logs`: (Chỉ Admin truy cập) Xem lịch sử tác động của toàn hệ thống (Ai thêm/sửa/xóa khách hàng, đơn hàng, cấu hình kèm thông tin IP và User Agent).
- `/admin/settings/website`: Tùy chỉnh tên website, logo, thông tin liên hệ và cài đặt chống Brute-force đăng nhập.
- `/admin/settings/email`:
  - Cấu hình SMTP gửi mail nhắc hạn dịch vụ (Hỗ trợ kiểm thử kết nối gửi mail).
  - Cấu hình các mốc ngày nhắc hạn (ví dụ: 7 ngày, 3 ngày, 1 ngày).
  - Soạn thảo Template Email HTML động bằng các thẻ tag: `{customer_name}`, `{order_code}`, `{product_name}`, `{expiry_date}`, `{price}`, `{website_url}`.

---

## ⏰ 5. CƠ CHẾ CRON JOB NHẮC HẠN TỰ ĐỘNG
API route `/api/cron/reminders` chạy định kỳ hàng ngày:

1. **Bảo mật**: Chỉ cho phép thực thi nếu header chứa `Authorization: Bearer <CRON_SECRET>`.
2. **Quy trình hoạt động**:
   - Tìm kiếm các đơn hàng có trạng thái `running` sắp hết hạn trùng khớp với các mốc nhắc hạn trong cài đặt (ví dụ: còn đúng 7 ngày hoặc 3 ngày).
   - Lấy thông tin cấu hình SMTP giải mã mật khẩu bằng khóa `SMTP_ENCRYPTION_KEY` qua thuật toán `AES-256-CBC`.
   - Render nội dung HTML từ template tương ứng và tự động gửi email nhắc nhở tới Khách hàng (`Customer.email`).
   - Ghi nhận kết quả vào bảng `EmailLog`.
   - Nếu đơn hàng quá hạn (`endDate < hiện tại`), hệ thống tự chuyển trạng thái đơn hàng sang `expired` và gửi mail thông báo dịch vụ đã tạm ngưng.

---

## 🎨 6. PHONG CÁCH GIAO DIỆN & STYLE GUIDE
- **Bảng màu**: Nền tối (`slate-950` / `#020617`), màu nhấn Tím (`purple-600` / `#7c3aed`), chữ trắng/xám mờ (`text-slate-100` / `text-slate-400`).
- **Glassmorphism**: Các thẻ hiển thị dạng kính mờ: `bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl`.
- **Data Tables**: Bảng dữ liệu hiện đại có phân trang, thanh tìm kiếm nhanh, lọc trạng thái bằng Badge màu sinh động:
  - `running` / `success`: Badge xanh lá.
  - `processing`: Badge vàng / cam.
  - `expired` / `cancelled`: Badge đỏ.
  - `expired_soon`: Badge cam đậm.
- **Biểu đồ**: Biểu đồ Recharts / Chart.js màu neon tím hiện đại, mượt mà thể hiện doanh số và tăng trưởng.
```

Bạn có thể copy khối code trên để đưa vào dự án mới hoặc AI Agent khác để tự động tạo toàn bộ website quản lý dịch vụ tinh giản này!
