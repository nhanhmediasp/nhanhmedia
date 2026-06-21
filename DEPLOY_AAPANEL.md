# Hướng Dẫn Deploy NhanhMedia lên aaPanel

> **Yêu cầu**: VPS đã cài aaPanel, domain đã trỏ về IP VPS.

---

## A. Chuẩn Bị Trên aaPanel

### 1. Cài các phần mềm cần thiết

Vào **aaPanel → App Store** và cài:

| Phần mềm | Phiên bản khuyến nghị |
|---|---|
| **Nginx** | Bất kỳ bản LTS |
| **MySQL** | 8.0 hoặc **MariaDB 10.6+** |
| **Node.js** | **20.x LTS** (bắt buộc) |
| **PM2** | Cài qua npm sau khi có Node.js |

Cài PM2 (chạy trong terminal aaPanel):
```bash
npm install -g pm2
```

### 2. Tạo database MySQL

Vào **aaPanel → Database → MySQL → Thêm database**:

- **Tên database**: `nhanhmedia` (hoặc tùy ý)
- **Tên user**: `nhanhmedia_user`
- **Mật khẩu**: Đặt mật khẩu mạnh, ghi nhớ lại
- **Quyền truy cập**: `127.0.0.1` (local only)

> ⚠️ Ghi lại đầy đủ: `database_name`, `username`, `password` để dùng trong bước cấu hình `.env`

### 3. Tạo website trên aaPanel

Vào **aaPanel → Website → Thêm website**:

- **Domain**: `nhanhmedia.com` (hoặc domain thực)
- **Thư mục gốc**: `/www/wwwroot/nhanhmedia.com`
- **PHP**: Không chọn PHP (Node.js app)

---

## B. Upload Source Code Lên Server

### Cách 1: Dùng Git Clone (khuyến nghị)

```bash
cd /www/wwwroot/
git clone https://github.com/your-username/nhanhmedia.git nhanhmedia.com
cd nhanhmedia.com
```

### Cách 2: Upload file ZIP

1. Nén toàn bộ project thành file `.zip` (trừ thư mục `node_modules`, `.next`)
2. Vào **aaPanel → File Manager**, upload lên `/www/wwwroot/nhanhmedia.com/`
3. Giải nén:

```bash
cd /www/wwwroot/nhanhmedia.com
unzip source.zip
```

---

## C. Cài Dependency

```bash
cd /www/wwwroot/nhanhmedia.com
npm install
```

> Lệnh này tự chạy `prisma generate` nhờ script `postinstall` trong `package.json`.

---

## D. Tạo File `.env` Trên Server

```bash
cd /www/wwwroot/nhanhmedia.com
cp .env.example .env
nano .env
```

Nội dung file `.env` trên server:

```env
# Thay thế các giá trị bên dưới bằng thông tin thực tế
DATABASE_URL="mysql://nhanhmedia_user:YOUR_PASSWORD@127.0.0.1:3306/nhanhmedia"

# Tạo JWT_SECRET ngẫu nhiên: openssl rand -hex 32
JWT_SECRET="paste_random_secret_here"

# Tạo CRON_SECRET ngẫu nhiên: openssl rand -hex 16
CRON_SECRET="paste_cron_secret_here"

# Tạo SMTP key: openssl rand -hex 32
SMTP_ENCRYPTION_KEY="paste_64_char_hex_here"

# URL website (không có dấu / ở cuối)
NEXT_PUBLIC_APP_URL="https://nhanhmedia.com"
```

Lưu và thoát: `Ctrl+X → Y → Enter`

**Tạo secret ngẫu nhiên:**
```bash
openssl rand -hex 32
```

---

## E. Migrate Database

Có **2 lựa chọn**:

### Option A: Dùng `db push` (đơn giản, khuyến nghị cho lần đầu)

```bash
cd /www/wwwroot/nhanhmedia.com
npx prisma db push
```

Lệnh này tạo tất cả bảng từ schema mà không cần migration files. Phù hợp khi mới setup lần đầu.

### Option B: Dùng `migrate deploy` (cho production chuẩn)

```bash
cd /www/wwwroot/nhanhmedia.com
npx prisma generate
npm run db:migrate
```

> **Lưu ý**: Option B yêu cầu đã có migration files MySQL trong thư mục `prisma/migrations/`. Nếu chưa có, dùng Option A.

---

## F. Seed Dữ Liệu Mẫu (Tuỳ chọn)

> ⚠️ **Chỉ chạy seed khi database còn trống**. Seed sẽ xóa hết dữ liệu cũ và tạo lại từ đầu!

```bash
cd /www/wwwroot/nhanhmedia.com
npm run db:seed
```

Sau seed, có thể đăng nhập bằng:
- **Admin**: `admin@example.com` / `123456`
- **Member**: `member@example.com` / `123456`

> Nhớ **đổi mật khẩu ngay** sau khi đăng nhập lần đầu!

---

## G. Build Website

```bash
cd /www/wwwroot/nhanhmedia.com
npm run build
```

Quá trình build sẽ mất vài phút. Kết quả build nằm trong thư mục `.next/`.

---

## H. Chạy Bằng PM2

### Khởi động lần đầu

```bash
cd /www/wwwroot/nhanhmedia.com

# Tạo thư mục logs
mkdir -p logs

# Khởi động với ecosystem config
pm2 start ecosystem.config.js --env production

# Lưu cấu hình PM2 để tự khởi động sau khi server reboot
pm2 save
pm2 startup
```

> Sau khi chạy `pm2 startup`, copy lệnh nó in ra và chạy lại (thường bắt đầu bằng `sudo env PATH=...`)

### Kiểm tra trạng thái

```bash
pm2 status
pm2 logs nhanhmedia-web --lines 50
```

### Các lệnh PM2 thường dùng

```bash
pm2 restart nhanhmedia-web    # Restart website
pm2 reload nhanhmedia-web     # Reload không downtime
pm2 stop nhanhmedia-web       # Dừng website
pm2 delete nhanhmedia-web     # Xóa khỏi PM2
pm2 monit                     # Xem realtime monitor
```

---

## I. Cấu Hình Reverse Proxy Trong aaPanel/Nginx

### Cách 1: Dùng aaPanel Reverse Proxy GUI

1. Vào **aaPanel → Website → Click tên domain → Reverse Proxy**
2. Chọn **Thêm reverse proxy**:
   - **Tên**: `nhanhmedia`
   - **Target URL**: `http://127.0.0.1:3000`
   - **Gửi Domain**: Tích chọn

### Cách 2: Sửa thủ công Nginx config

Vào **aaPanel → Website → Click tên domain → Config**

Thêm vào block `server {}`:

```nginx
# Reverse proxy về Next.js trên port 3000
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
}

# Static files từ Next.js
location /_next/static/ {
    proxy_pass http://127.0.0.1:3000/_next/static/;
    proxy_cache_bypass $http_upgrade;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Public files
location /public/ {
    proxy_pass http://127.0.0.1:3000/public/;
}
```

### Bật SSL Let's Encrypt

1. Vào **aaPanel → Website → Click domain → SSL**
2. Chọn tab **Let's Encrypt**
3. Chọn domain → **Apply**
4. Bật **Force HTTPS**

---

## J. Cấu Hình Cron Job (Tự động nhắc nhở hết hạn)

Vào **aaPanel → Cron Jobs → Thêm mới**:

- **Tên**: Reminder NhanhMedia
- **Loại**: URL
- **URL**: `https://nhanhmedia.com/api/cron/reminders`
- **Header**: Thêm header `x-cron-secret: GIÁ_TRỊ_CRON_SECRET_TRONG_ENV`
- **Lịch**: `0 0 * * *` (chạy lúc 0h mỗi ngày)

Hoặc dùng shell command:
```bash
curl -s -H "x-cron-secret: YOUR_CRON_SECRET" https://nhanhmedia.com/api/cron/reminders
```

---

## K. Kiểm Tra Sau Deploy

### 1. Truy cập website
```
https://nhanhmedia.com
```

### 2. Test đăng nhập admin
- URL: `https://nhanhmedia.com/login`
- Email: `admin@example.com` (nếu đã seed)
- Mật khẩu: `123456`

### 3. Test API
```bash
curl https://nhanhmedia.com/api/auth/me
```

### 4. Kiểm tra database kết nối
```bash
cd /www/wwwroot/nhanhmedia.com
npx prisma db pull 2>&1 | head -20
```

---

## L. Xử Lý Lỗi Thường Gặp

### Website không chạy

```bash
# Xem log PM2
pm2 logs nhanhmedia-web --lines 100

# Xem log Nginx
tail -f /www/wwwlogs/nhanhmedia.com.error.log
```

### Lỗi kết nối database

```bash
# Test kết nối MySQL
mysql -u nhanhmedia_user -p -h 127.0.0.1 nhanhmedia
```

Kiểm tra `DATABASE_URL` trong `.env` có đúng user/password/database không.

### Lỗi `Cannot find module '@prisma/client'`

```bash
cd /www/wwwroot/nhanhmedia.com
npx prisma generate
pm2 restart nhanhmedia-web
```

### Lỗi 502 Bad Gateway

Nginx không kết nối được đến port 3000. Kiểm tra:
```bash
pm2 status                    # Đảm bảo app đang running
ss -tlnp | grep 3000          # Kiểm tra port 3000 có đang lắng nghe không
```

### Build thất bại

```bash
# Xóa cache và build lại
rm -rf .next
npm run build
```

### Restart sau khi cập nhật code

```bash
cd /www/wwwroot/nhanhmedia.com
git pull                      # Lấy code mới (nếu dùng Git)
npm install                   # Cài dependency mới (nếu có)
npm run build                 # Build lại
pm2 reload nhanhmedia-web     # Reload không downtime
```

---

## M. Bảo Mật

- ✅ File `.env` phải có permission `600`: `chmod 600 .env`
- ✅ Không để `.env` trong public directory
- ✅ Đổi mật khẩu admin sau khi seed
- ✅ Dùng mật khẩu MySQL mạnh (>= 16 ký tự)
- ✅ `JWT_SECRET` phải >= 32 ký tự ngẫu nhiên
- ✅ Bật firewall aaPanel, chỉ mở port 80, 443, 22
- ✅ Bật SSL Let's Encrypt và Force HTTPS

---

## N. Cấu Trúc Thư Mục Trên Server

```
/www/wwwroot/nhanhmedia.com/
├── .env                    # File env thực (KHÔNG commit)
├── .next/                  # Build output (tạo sau npm run build)
├── ecosystem.config.js     # PM2 config
├── logs/                   # PM2 logs
│   ├── pm2-error.log
│   └── pm2-out.log
├── node_modules/           # Dependencies
├── prisma/                 # Schema & migrations
├── public/                 # Static assets
└── src/                    # Source code
```

---

> **Hỗ trợ**: Nếu gặp vấn đề, xem log PM2 (`pm2 logs`) và log Nginx (`/www/wwwlogs/`) trước khi debug thêm.
