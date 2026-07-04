# 🚀 Hướng Dẫn Cài Đặt và Deploy Website (Next.js) lên aaPanel

Tài liệu này hướng dẫn chi tiết từng bước để triển khai dự án **Nhanh Media** (Next.js + Prisma) lên VPS sử dụng **aaPanel**.

---

## 📋 Yêu cầu hệ thống trên VPS
* Đã cài đặt **aaPanel** (bản mới nhất).
* Hệ điều hành khuyên dùng: **Ubuntu 20.04/22.04 LTS** hoặc **Debian 11/12**.
* Cấu hình tối thiểu: **1 Core CPU / 2 GB RAM** (nếu build code Next.js trực tiếp trên server). Nếu RAM 1 GB, bạn nên build ở máy local rồi upload thư mục `.next` lên VPS để tránh bị tràn RAM (Out of Memory).

---

## 🛠️ Bước 1: Cài đặt Môi trường trên aaPanel

1. Đăng nhập vào **aaPanel** Admin Dashboard.
2. Truy cập mục **App Store** ở thanh menu bên trái.
3. Tìm kiếm và cài đặt các phần mềm sau:
   * **Node.js Version Manager** (Quản lý phiên bản Node.js).
   * **Nginx** (Bản mới nhất - dùng làm Reverse Proxy chuyển tiếp cổng).
   * **PostgreSQL Manager** (Nếu bạn muốn chạy Database PostgreSQL trực tiếp trên VPS của mình). *Hoặc bạn có thể dùng dịch vụ Database đám mây miễn phí như [Neon.tech](https://neon.tech).*
4. Sau khi cài đặt xong **Node.js Version Manager**:
   * Mở ứng dụng này lên.
   * Chọn cài đặt phiên bản Node.js ổn định (Khuyên dùng **v18.x** hoặc **v20.x** LTS).
   * Click chọn **Registry** là `Official` hoặc `Taobao` (tùy tốc độ mạng).
   * Tại mục **Command-line Version**, chọn phiên bản Node.js vừa cài đặt để cấu hình lệnh toàn hệ thống.

---

## 🗄️ Bước 2: Chuẩn bị Database (Chọn 1 trong 2 cách)

Dự án sử dụng Prisma ORM. Bạn có hai lựa chọn Database chính:

### Cách A: Sử dụng PostgreSQL (Khuyên dùng cho Production)
1. **Nếu dùng Database trên aaPanel (Local VPS)**:
   * Vào **App Store** → Mở **PostgreSQL Manager**.
   * Thêm database mới: Đặt tên database, tên user và mật khẩu.
   * Ví dụ Connection String: `postgresql://db_user:db_password@127.0.0.1:5432/db_name?schema=public`
2. **Nếu dùng Neon.tech (Đám mây miễn phí - Nhanh nhất)**:
   * Xem hướng dẫn tạo tại [DEPLOY_GUIDE.md](file:///e:/GEMINI/AI/DEPLOY_GUIDE.md#L3).
   * Lấy Connection String có dạng: `postgresql://USER:PASSWORD@ep-xxx.ap-southeast-1.aws.neon.tech/nhanh_media?sslmode=require`

### Cách B: Sử dụng SQLite (Đơn giản nhất, không cần cài Database Server)
> **Lưu ý:** Để dùng SQLite, bạn cần chuyển đổi cấu hình provider trong Prisma schema:
1. Mở file [prisma/schema.prisma](file:///e:/GEMINI/AI/prisma/schema.prisma).
2. Sửa dòng 2 từ `"postgresql"` thành `"sqlite"`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Đổi biến `DATABASE_URL` trong file `.env` thành: `DATABASE_URL="file:./dev.db"`

---

## 📤 Bước 3: Upload Code lên VPS

1. Trên máy tính của bạn, hãy nén thư mục dự án lại thành file `.zip`. **Lưu ý KHÔNG nén các thư mục sau**:
   * `node_modules` (Thư mục thư viện - sẽ cài đặt trên server).
   * `.next` (Thư mục build local).
   * `.git` và các file cấu hình môi trường local `.env`.
2. Trên **aaPanel**, truy cập mục **Files** ở thanh menu bên trái.
3. Tìm đến đường dẫn thư mục web mong muốn (ví dụ: `/www/wwwroot/`).
4. Tạo một thư mục mới cho dự án của bạn (ví dụ: `nhanhmedia`).
5. Vào thư mục đó, click **Upload** và tải file `.zip` lên.
6. Sau khi upload thành công, click chuột phải vào file `.zip` chọn **Unzip** để giải nén toàn bộ code.

---

## 🔑 Bước 4: Tạo file `.env` Cấu hình Môi trường

1. Trong thư mục dự án trên VPS, tạo một file mới tên là `.env` (hoặc nhân bản file `.env.example`).
2. Nhập các giá trị cấu hình tương tự như dưới đây:
   ```env
   # Link Database (Thay bằng link PostgreSQL hoặc SQLite của bạn)
   DATABASE_URL="postgresql://db_user:db_password@127.0.0.1:5432/db_name?schema=public"

   # Khóa JWT (Chạy lệnh bên dưới để sinh chuỗi ngẫu nhiên bảo mật cao)
   JWT_SECRET="nhanh_media_secret_key_for_jwt_tokens_2026_purple_theme"

   # Cron Token (Bảo vệ API tự động nhắc gia hạn)
   CRON_SECRET="nhanh_media_cron_job_secret_key_2026_v1"

   # Khóa 32-byte (Dạng hex) mã hóa mật khẩu SMTP lưu trong Database
   SMTP_ENCRYPTION_KEY="d7c95a289b4b0e515d48721c5a92a543ee7d216f9fdfa7ab725841cb648b292e"
   ```

> **Mẹo:** Bạn nên sinh các mã khóa ngẫu nhiên mới để bảo mật tuyệt đối bằng cách mở terminal trên VPS và chạy lệnh:
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 🚀 Bước 5: Cài đặt Thư viện và Build Ứng dụng

1. Trên aaPanel, truy cập mục **Website** -> chọn tab **Node Project** (hoặc bạn có thể dùng **Terminal** của aaPanel).
2. Click **Terminal** ở góc trên cùng bên phải để mở giao diện dòng lệnh của VPS (hoặc kết nối SSH bằng Bitvise/MobaXterm/PuTTY).
3. Di chuyển vào thư mục dự án của bạn:
   ```bash
   cd /www/wwwroot/nhanhmedia
   ```
4. Chạy lệnh cài đặt các gói phụ thuộc (dependencies):
   ```bash
   npm install
   ```
5. Chạy lệnh cập nhật Prisma Client và áp dụng Database Migrations:
   ```bash
   # Nếu dùng SQLite hoặc PostgreSQL mới tinh, chạy migrate để tạo bảng:
   npx prisma migrate deploy

   # Chạy seed dữ liệu mẫu ban đầu (Tạo admin mặc định):
   npx prisma db seed
   ```
6. Tiến hành build dự án Next.js sang bản phân phối production:
   ```bash
   npm run build
   ```

---

## 🌐 Bước 6: Cấu hình Chạy Website trên aaPanel

aaPanel phiên bản mới có tính năng quản lý Node.js Project trực quan rất tốt:

1. Vào mục **Website** → Chọn tab **Node Project**.
2. Click nút **Add Node Project**.
3. Điền các thông tin cấu hình như sau:
   * **Path**: Chọn thư mục dự án của bạn (ví dụ: `/www/wwwroot/nhanhmedia`).
   * **Project Name**: Đặt tên dự án (ví dụ: `nhanh-media`).
   * **Run Command**: Chọn `start` (Tương đương lệnh `npm run start`).
   * **Port**: Nhập `3000` (hoặc cổng bất kỳ bạn chọn).
   * **Run User**: `www`.
   * **Domain**: Điền domain chính thức của bạn (ví dụ: `admin.nhanhmedia.vn`). aaPanel sẽ tự động cấu hình **Reverse Proxy (Nginx)** ánh xạ tên miền này vào cổng Node.js 3000.
4. Click **Submit** để khởi tạo dự án.
5. Kiểm tra trạng thái: Dự án hiển thị trạng thái `Running` màu xanh là thành công!

---

## 🔒 Bước 7: Cài đặt SSL (HTTPS)
1. Trong danh sách Node Project, tại dự án của bạn, click vào cột **SSL** (chữ `Not set`).
2. Chọn tab **Let's Encrypt**.
3. Tích chọn domain của bạn và click **Apply**.
4. Bật nút **Force HTTPS** để tự động chuyển hướng từ HTTP sang HTTPS bảo mật.

---

## ⏰ Bước 8: Thiết lập Cron Job tự động gửi email nhắc gia hạn đơn hàng

Dự án có API tự động kiểm tra đơn hàng sắp hết hạn để gửi mail nhắc nhở. Bạn cần cài đặt Cron Job chạy định kỳ hàng ngày:

1. Vào mục **Cron** ở thanh menu bên trái của aaPanel.
2. Cấu hình Cron mới:
   * **Type of Task**: Chọn `Shell Script` hoặc `URL`. (Khuyên dùng `Shell Script` để đáng tin cậy hơn).
   * **Name**: `Nhanh Media Cron Reminder`.
   * **Execution cycle**: Chọn `Daily` (Hàng ngày), thời điểm gửi tốt nhất là lúc `07:00` sáng.
   * **Script content** (Nếu chọn Shell Script):
     ```bash
     curl -s -X GET "https://domain-cua-ban.com/api/cron/reminders?token=YOUR_CRON_SECRET"
     ```
     *(Thay `https://domain-cua-ban.com` bằng domain thật của bạn và `YOUR_CRON_SECRET` bằng token trong file `.env`)*
3. Click **Add Task** để lưu cấu hình.

---

## 🔑 Tài khoản đăng nhập quản trị mặc định (Sau khi Seed)
* **Trang quản trị**: Đăng nhập trực tiếp tại trang chủ hoặc màn hình login.
* **Email**: `admin@example.com`
* **Mật khẩu**: `123456`

> **Cảnh báo:** Hãy vào mục cấu hình tài khoản cá nhân và đổi mật khẩu quản trị ngay sau khi cài đặt thành công!

---

## 🔄 Hướng Dẫn Cập Nhật Code (Update) Khi Có Commit Mới

Sau khi bạn chỉnh sửa code ở máy local và commit/push lên GitHub, có 2 cách để cập nhật phiên bản mới lên VPS aaPanel:

### Cách 1: Cập nhật thủ công qua Git (Đơn giản & Khuyên dùng)

Để tiện cho việc cập nhật bằng Git, ngay từ lúc cài đặt ban đầu (Bước 3), thay vì upload file `.zip`, bạn nên clone dự án bằng Git:
```bash
# SSH vào VPS và di chuyển tới thư mục wwwroot
cd /www/wwwroot

# Clone dự án từ repository GitHub của bạn
git clone https://github.com/YOUR_USERNAME/nhanh-media.git nhanhmedia
```

Khi bạn có commit mới trên máy local và đã `git push`:
1. Mở **Terminal** trên aaPanel (hoặc SSH vào VPS).
2. Chạy chuỗi lệnh sau để kéo code mới, cài thư viện mới nếu có, migrate database và build lại:
   ```bash
   cd /www/wwwroot/nhanhmedia
   
   # Kéo code mới nhất từ GitHub
   git pull origin main
   
   # Cài đặt các thư viện mới (nếu có thay đổi trong package.json)
   npm install
   
   # Áp dụng migration database mới (nếu có thay đổi trong prisma/schema.prisma)
   npx prisma migrate deploy
   
   # Build lại dự án Next.js
   npm run build
   ```
3. Truy cập vào **Website → Node Project** trên aaPanel, tìm dự án của bạn và nhấn nút **Restart** để máy chủ Node nhận phiên bản mới vừa build.

---

### Cách 2: Tự động cập nhật bằng aaPanel Webhook (CI/CD Tự động)

Nếu muốn mỗi khi bạn `git push` lên GitHub, VPS sẽ tự động cập nhật và restart mà không cần vào Terminal:

1. **Cài đặt Webhook trên aaPanel**:
   * Vào **App Store** trên aaPanel → Tìm kiếm **WebHook** và cài đặt.
   * Mở phần mềm WebHook lên → Click **Add Webhook**.
   * Thiết lập thông tin:
     * **Name**: `update-nhanh-media`
     * **Shell Script**:
       ```bash
       #!/bin/bash
       echo "Starting update..."
       cd /www/wwwroot/nhanhmedia
       
       # Kéo code mới
       git pull origin main
       
       # Cài thư viện và migrate DB
       npm install
       npx prisma migrate deploy
       
       # Build ứng dụng
       npm run build
       
       # Restart Node Project thông qua aaPanel CLI hoặc PM2
       # (Tùy phiên bản aaPanel, bạn có thể restart service hoặc dùng lệnh dưới nếu chạy qua PM2)
       # pm2 restart nhanh-media
       
       # Hoặc restart Node project tạo bởi aaPanel:
       /etc/init.d/webhook restart
       echo "Update successfully!"
       ```
2. **Lấy Webhook URL**:
   * Sau khi thêm Webhook thành công, click vào mục **Show Key** của Webhook đó. Bạn sẽ nhận được 1 link URL có dạng:
     `http://YOUR_VPS_IP:PORT/hook?access_key=XXXXXX`
3. **Cấu hình trên GitHub**:
   * Truy cập vào Repository dự án của bạn trên GitHub.
   * Vào **Settings** → chọn **Webhooks** ở thanh bên trái → Click **Add webhook**.
   * **Payload URL**: Dán link Webhook URL lấy từ aaPanel ở trên vào.
   * **Content type**: Chọn `application/json`.
   * **Which events...**: Chọn `Just the push event`.
   * Click **Add webhook**.
4. **Kiểm tra**:
   * Kể từ lúc này, mỗi khi bạn chạy `git push` ở máy local, GitHub sẽ gửi tín hiệu gọi Webhook của aaPanel thực thi script tự động cập nhật code trên VPS.

