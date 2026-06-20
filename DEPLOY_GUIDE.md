# 🚀 Hướng dẫn Deploy lên Vercel

## Bước 1: Tạo Database PostgreSQL miễn phí (Neon.tech)

1. Truy cập [https://neon.tech](https://neon.tech) → **Sign Up** miễn phí
2. Tạo project mới → chọn region **Singapore** (gần Việt Nam nhất)
3. Copy **Connection String** dạng:
   ```
   postgresql://USER:PASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/nhanh_media?sslmode=require
   ```

---

## Bước 2: Push Code lên GitHub

```bash
# Trong thư mục E:\AI, chạy:
git add .
git commit -m "feat: configure for Vercel deployment"
git push origin main
```

> Nếu chưa có remote GitHub:
> ```bash
> git remote add origin https://github.com/YOUR_USERNAME/nhanh-media.git
> git push -u origin main
> ```

---

## Bước 3: Deploy lên Vercel

1. Truy cập [https://vercel.com](https://vercel.com) → **Sign up** bằng GitHub
2. Click **"Add New Project"** → Chọn repo `nhanh-media`
3. Framework sẽ tự detect là **Next.js** ✅
4. **CHƯA Deploy ngay** — cần cấu hình biến môi trường trước

---

## Bước 4: Cấu hình Environment Variables trên Vercel

Vào **Settings → Environment Variables**, thêm từng biến:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://USER:PASS@HOST/nhanh_media?sslmode=require` |
| `JWT_SECRET` | Tạo bằng lệnh bên dưới |
| `CRON_SECRET` | Tạo bằng lệnh bên dưới |
| `SMTP_ENCRYPTION_KEY` | Tạo bằng lệnh bên dưới |

### Lệnh tạo Secret Key ngẫu nhiên (chạy trong PowerShell):
```powershell
# JWT_SECRET (64 chars):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# CRON_SECRET (32 chars):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# SMTP_ENCRYPTION_KEY (32 bytes = 64 hex chars):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Bước 5: Cấu hình Build Command

Trong Vercel → Settings → **Build & Development Settings**:

| Setting | Value |
|---------|-------|
| Build Command | `prisma migrate deploy && npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

> **Lưu ý**: `prisma migrate deploy` sẽ tự động áp dụng migration lên DB Neon khi build

---

## Bước 6: Deploy!

Click **"Deploy"** và chờ ~2-3 phút. Sau khi thành công:

✅ App sẽ chạy tại `https://nhanh-media-xxx.vercel.app`

---

## Bước 7: Seed Dữ liệu Ban đầu (Quan trọng!)

Sau khi deploy xong, chạy lệnh sau trên máy local để seed admin/CTV vào DB production:

```bash
# Tạm thời đổi DATABASE_URL trong .env sang link Neon production
# Sau đó chạy:
npx prisma db seed

# Nhớ đổi lại DATABASE_URL về sqlite sau khi seed xong!
```

---

## Bước 8: Cấu hình Domain tùy chỉnh (Tùy chọn)

Vercel → Settings → **Domains** → Thêm domain của bạn (VD: `admin.nhanhmedia.vn`)

---

## ⚙️ Cron Job Tự động

`vercel.json` đã cấu hình cron chạy **mỗi ngày lúc 7h sáng (UTC+7)**.

Để test cron thủ công, gọi API:
```
GET https://your-app.vercel.app/api/cron/reminders?token=YOUR_CRON_SECRET
```

---

## 🔐 Tài khoản mặc định sau Seed

| Email | Mật khẩu | Quyền |
|-------|----------|-------|
| `admin@example.com` | `123456` | Admin |
| `member@example.com` | `123456` | Thành viên |
| `ctv@example.com` | `123456` | Cộng tác viên |
| `agency@example.com` | `123456` | Đại lý |

> ⚠️ **Đổi mật khẩu ngay sau khi đăng nhập lần đầu!**
