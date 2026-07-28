# Hệ thống Quản trị Nội bộ - Nhanh Media

Hệ thống admin-only để quản lý khách hàng, nhân sự, dự án và đơn hàng dịch vụ cho **Nhanh Media**. Chỉ tài khoản có vai trò `admin` được phép đăng nhập.

---

## 🚀 Công nghệ sử dụng
- **Frontend/Backend**: Next.js + TypeScript (App Router, Route Handlers, Proxy).
- **Styling**: Tailwind CSS v4 với thiết kế Premium (Glassmorphic, Gradient, Responsive đầy đủ cho Desktop/Tablet/Mobile).
- **Icons**: Lucide React.
- **ORM & Database**: Prisma ORM + PostgreSQL.
- **Security**: Custom JWT Cookie-based Session + Hóa mật khẩu bằng `bcryptjs` + Mã hóa mật khẩu SMTP bằng `AES-256-CBC`.
- **Email**: Nodemailer gửi thư cảnh báo qua SMTP cấu hình linh hoạt trong Admin Dashboard.

---

## 🛠️ Cài đặt & Chạy dự án

### 1. Chuẩn bị Môi trường
Đảm bảo bạn đã cài đặt **Node.js** (Khuyên dùng v18 trở lên).

### 2. Thiết lập cấu hình `.env`

Dự án dùng **PostgreSQL** (không hỗ trợ SQLite). Nhân bản `.env.example` thành `.env`
rồi điền giá trị thật — xem chú thích chi tiết trong chính file `.env.example`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/nhanh_media?schema=public"

# Sinh mới cho MỖI môi trường:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="<hex 64 ký tự>"
SMTP_ENCRYPTION_KEY="<hex 64 ký tự>"
CRON_SECRET="<chuỗi ngẫu nhiên dài>"

BUSINESS_TIMEZONE="Asia/Ho_Chi_Minh"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

> ⚠️ Không dùng lại giá trị mẫu trong tài liệu. `JWT_SECRET` lộ = giả mạo được
> phiên đăng nhập admin; `SMTP_ENCRYPTION_KEY` lộ = giải mã được mật khẩu SMTP trong DB.

### 2b. Khởi tạo Database
```bash
npx prisma migrate deploy   # DB mới
npx prisma db seed
```
Nếu DB đã có sẵn bảng (tạo bằng `prisma db push` trước đây):
```bash
npx prisma migrate resolve --applied 0_init
npx prisma migrate deploy
```

### 3. Cài đặt các gói thư viện
Mở terminal tại thư mục dự án và chạy:
```bash
npm install
```

### 4. Khởi tạo Cơ sở Dữ liệu & Tạo Dữ liệu mẫu (Seeding)
Tự động đồng bộ schema và tạo dữ liệu phát triển:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Chạy Kiểm thử Tự động (Unit Tests)
Kiểm tra tính đúng đắn của Hashing, JWT, Mã hóa AES, Lọc mốc thời gian và Gợi ý Email:
```bash
npm run test
```

### 6. Khởi động Server Phát triển
Chạy ứng dụng ở môi trường local:
```bash
npm run dev
```
Truy cập ứng dụng tại địa chỉ: [http://localhost:3000](http://localhost:3000)

---

## 🔐 Tài khoản quản trị

Không ghi tài khoản hoặc mật khẩu thật vào repository. Hãy tạo tài khoản `admin`
bằng seed dành cho môi trường phát triển hoặc trực tiếp trong PostgreSQL khi triển khai.
Các bản ghi nhân sự với vai trò khác vẫn có thể được admin quản lý và phân công dự án,
nhưng không có quyền đăng nhập website.

---

## 🛠️ Chạy PostgreSQL cục bộ bằng Docker (Tùy chọn cho môi trường dev)

1. Sửa `docker-compose.yml`, đổi `POSTGRES_PASSWORD` thành mật khẩu của bạn,
   rồi khởi động:
   ```bash
   docker-compose up -d
   ```
2. Trỏ `DATABASE_URL` trong `.env` tới database vừa tạo.
3. Thực thi migrate và seed:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

---

## ⏰ Cấu hình gửi Mail Nhắc hạn Tự động (Cron Job)

Hệ thống tự động rà soát hạn dùng và gửi email cho khách hàng & người tạo đơn qua API: `/api/cron/reminders?token=nhanh_media_cron_job_secret_key_2026_v1` (Token bảo vệ được lấy từ cấu hình `CRON_SECRET` trong file `.env`).

Bạn có thể thiết lập công việc chạy định kỳ hàng ngày (ví dụ 07:00 AM) bằng các dịch vụ như **Vercel Cron**, **EasyCron**, hoặc **Crontab** trên server:
```bash
0 7 * * * curl -X POST "http://domain.com/api/cron/reminders?token=YOUR_CRON_SECRET"
```
#
