# 🟣 NhanhMedia – Hệ Thống Quản Lý Dịch Vụ

Hệ thống quản lý khách hàng, cộng tác viên (CTV), đại lý và đơn hàng dịch vụ cho **Nhanh Media**.  
Xây dựng bằng **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS v4**, **Prisma ORM** và **MySQL**.

---

## 🚀 Công Nghệ Sử Dụng

| Lớp | Công nghệ |
|---|---|
| Frontend/Backend | Next.js 16 (App Router, Route Handlers, Middleware) |
| Ngôn ngữ | TypeScript |
| Styling | Tailwind CSS v4 – Giao diện Premium, Glassmorphic, Responsive |
| Icons | Lucide React |
| ORM & Database | Prisma ORM + **MySQL / MariaDB** |
| Xác thực | JWT Cookie-based Session + `bcryptjs` |
| Mã hóa | AES-256-CBC (mã hóa mật khẩu SMTP trong DB) |
| Email | Nodemailer – SMTP cấu hình trong Admin Dashboard |
| Process Manager | PM2 (production) |

---

## 📋 Tính Năng Chính

- **Quản lý người dùng** – 4 cấp phân quyền: Admin, Member, CTV, Agency
- **Quản lý khách hàng** – Tạo, sửa, xóa, tìm kiếm, phân quyền theo người tạo
- **Quản lý sản phẩm & gói dịch vụ** – Biến thể, thời hạn, giá theo từng role
- **Quản lý đơn hàng** – Tạo đơn, gia hạn, theo dõi trạng thái, hoàn tiền
- **Nhà cung cấp (Supplier)** – Quản lý thông tin nhà cung cấp gắn với đơn hàng
- **Thông báo nội bộ** – Gửi thông báo theo role hoặc toàn hệ thống
- **Nhắc hạn tự động** – Cron job gửi email trước 7/3/1 ngày và khi hết hạn
- **Audit Log** – Ghi nhật ký toàn bộ hành động trong hệ thống
- **Báo cáo doanh thu** – Thống kê theo thời gian, role, sản phẩm
- **Cài đặt SMTP** – Cấu hình email trong Admin, mật khẩu được mã hóa AES-256

---

## 🛠️ Cài Đặt & Chạy Local (Development)

### 1. Yêu cầu

- **Node.js** v20 LTS trở lên
- **MySQL 8.0+** hoặc **MariaDB 10.6+**

### 2. Clone và cài dependency

```bash
git clone https://github.com/your-username/nhanhmedia.git
cd nhanhmedia
npm install
```

### 3. Tạo file `.env`

```bash
cp .env.example .env
```

Chỉnh sửa `.env` với thông tin database local:

```env
DATABASE_URL="mysql://root:password@127.0.0.1:3306/nhanhmedia_dev"
JWT_SECRET="your-random-secret-here"
CRON_SECRET="your-cron-secret"
SMTP_ENCRYPTION_KEY="d7c95a289b4b0e515d48721c5a92a543ee7d216f9fdfa7ab725841cb648b292e"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Khởi tạo Database

```bash
# Tạo bảng từ schema (không cần migration files)
npx prisma db push

# Hoặc dùng migrate (tạo migration file lưu lại lịch sử)
npx prisma migrate dev --name init
```

### 5. Seed dữ liệu mẫu

```bash
npm run db:seed
```

### 6. Chạy server dev

```bash
npm run dev
```

Truy cập: [http://localhost:3000](http://localhost:3000)

---

## 🔐 Tài Khoản Mặc Định (Sau khi seed)

> Mật khẩu mặc định cho tất cả tài khoản: **`123456`**  
> ⚠️ Đổi mật khẩu ngay sau khi đăng nhập lần đầu!

| Role | Email | Quyền hạn |
|---|---|---|
| **Admin** | `admin@example.com` | Toàn quyền: cấu hình, sản phẩm, báo cáo, người dùng |
| **Member** | `member@example.com` | Tạo khách hàng & đơn hàng với giá thành viên |
| **CTV** | `ctv@example.com` | Tạo khách hàng & đơn hàng với giá cộng tác viên |
| **Agency** | `agency@example.com` | Tạo khách hàng & đơn hàng với giá đại lý (ưu đãi nhất) |

---

## 📦 Scripts

```bash
npm run dev          # Chạy môi trường development
npm run build        # Build production (prisma generate + next build)
npm run start        # Khởi động production server (port 3000)
npm run lint         # Kiểm tra lỗi ESLint
npm run test         # Chạy unit tests (JWT, bcrypt, AES, ...)

npm run db:migrate   # Chạy prisma migrate deploy (production)
npm run db:push      # Đồng bộ schema → database (không cần migration files)
npm run db:seed      # Seed dữ liệu mẫu vào database
```

---

## ⏰ Cron Job – Nhắc Hạn Tự Động

API endpoint nhắc hạn: `POST /api/cron/reminders`  
Header bảo vệ: `x-cron-secret: <CRON_SECRET>`

Cấu hình crontab chạy hàng ngày lúc 0h:

```bash
0 0 * * * curl -s -X POST -H "x-cron-secret: YOUR_CRON_SECRET" https://yourdomain.com/api/cron/reminders
```

Hoặc dùng **aaPanel Cron Jobs** để thiết lập theo giao diện.

---

## 🖥️ Deploy Production – aaPanel

Xem hướng dẫn chi tiết: **[DEPLOY_AAPANEL.md](./DEPLOY_AAPANEL.md)**

Tóm tắt quy trình:

```bash
# Trên server aaPanel
cd /www/wwwroot/yourdomain.com
cp .env.example .env && nano .env   # Điền thông tin MySQL thực
npm install
npx prisma db push                  # Tạo bảng MySQL
npm run db:seed                     # (Tuỳ chọn) Seed dữ liệu mẫu
npm run build                       # Build production
mkdir -p logs
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

---

## 🗂️ Cấu Trúc Thư Mục

```
.
├── prisma/
│   ├── schema.prisma       # Prisma schema (MySQL)
│   ├── seed.ts             # Dữ liệu mẫu
│   └── migrations/         # Migration files
├── src/
│   ├── app/
│   │   ├── admin/          # Trang quản trị (dashboard, users, products, orders, ...)
│   │   ├── api/            # API Route Handlers
│   │   ├── login/          # Trang đăng nhập
│   │   └── ...             # Các trang user (customers, orders, reports, ...)
│   ├── components/         # React components tái sử dụng
│   └── lib/                # Utilities (auth, db, crypto, audit)
├── public/                 # Static assets
├── ecosystem.config.js     # PM2 config
├── DEPLOY_AAPANEL.md       # Hướng dẫn deploy aaPanel
├── next.config.ts          # Next.js config (standalone output)
└── .env.example            # Template biến môi trường
```

---

## 🔒 Bảo Mật

- JWT lưu trong HttpOnly Cookie, hết hạn sau 7 ngày
- Mật khẩu hash bằng `bcryptjs` (cost factor 10)
- Mật khẩu SMTP mã hóa `AES-256-CBC` trước khi lưu vào DB
- Middleware kiểm tra quyền hạn trên tất cả route `/admin/*`
- Không hard-code credential trong source code
- File `.env` được ignore trong `.gitignore`

---

## 📄 License

MIT © Nhanh Media
