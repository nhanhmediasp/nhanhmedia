# Chuyển từ aaPanel/PostgreSQL sang Vercel + Supabase

Kiến trúc sau khi chuyển:

- Vercel chạy Next.js, API routes và cron.
- Supabase chạy PostgreSQL và Storage.
- Hệ thống tiếp tục dùng JWT hiện tại; không cần chuyển user sang Supabase Auth.
- URL ảnh cũ dạng `/uploads/ten-file` được giữ nguyên, nên không cần sửa dữ liệu ảnh trong database.

## 1. Tạo Supabase project

Chọn region gần người dùng và Vercel Function nhất. Trong Supabase Dashboard, lấy:

1. **Transaction pooler** port `6543`: dùng làm `DATABASE_URL` trên Vercel.
2. **Session pooler** port `5432` hoặc Direct connection: dùng làm `DIRECT_URL` khi chuyển database.
3. Project URL: dùng làm `SUPABASE_URL`.
4. `service_role` key: dùng làm `SUPABASE_SERVICE_ROLE_KEY`.

Không đưa `service_role` key vào biến có tiền tố `NEXT_PUBLIC_`.

## 2. Chuẩn bị biến môi trường

Trên máy thực hiện migration hoặc trong terminal aaPanel:

```bash
export SOURCE_DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/nhanh_media'
export DIRECT_URL='postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres?sslmode=require'
export SUPABASE_URL='https://PROJECT_REF.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='SERVICE_ROLE_KEY'
export SUPABASE_STORAGE_BUCKET='media'
export SUPABASE_STORAGE_PREFIX='uploads'
```

Nếu password chứa ký tự đặc biệt như `@`, `:`, `/` hoặc `#`, phải URL-encode password trong connection string.

Máy chạy script database cần có `pg_dump` và `pg_restore`. Nên dùng PostgreSQL client cùng major version hoặc mới hơn PostgreSQL nguồn.

## 3. Chuyển database

Tạm dừng thao tác ghi trên website cũ để không phát sinh dữ liệu sau thời điểm dump. Sau đó chạy:

```bash
npm run migrate:database -- --confirm-target-overwrite
```

Script sẽ:

1. Dump riêng schema `public` của PostgreSQL aaPanel.
2. Lưu một bản an toàn trong `migration-backups/`.
3. Restore toàn bộ bảng, dữ liệu, index, constraint và lịch sử Prisma sang Supabase.

Script có thể ghi đè các object trùng tên trong schema `public` của database đích. Chỉ chạy vào Supabase project mới hoặc project đã xác định có thể thay thế dữ liệu.

Không chạy `prisma db seed` sau khi restore vì seed hiện tại xóa dữ liệu nghiệp vụ trước khi tạo dữ liệu mẫu.

Kiểm tra kết quả bằng Direct/Session URL:

```bash
DATABASE_URL="$DIRECT_URL" npx prisma migrate status
DATABASE_URL="$DIRECT_URL" npx prisma studio
```

## 4. Chuyển toàn bộ ảnh cũ

Chạy trên aaPanel tại thư mục project, nơi vẫn còn `public/uploads`:

```bash
npm install
npm run migrate:uploads -- /duong-dan-day-du/project/public/uploads
```

Script có thể chạy lại an toàn: file cùng tên được cập nhật, không tạo bản sao. Tên object được giữ nguyên nên các giá trị `/uploads/...` đang có trong database vẫn hoạt động.

## 5. Cấu hình Vercel

Import repository vào Vercel và khai báo các biến sau cho Production:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:6543/postgres?sslmode=require&connection_limit=1
DB_CONNECTION_LIMIT=1
DB_POOL_TIMEOUT=20
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=media
SUPABASE_STORAGE_PREFIX=uploads
NEXT_PUBLIC_APP_URL=https://ten-mien-cua-ban.vn
JWT_SECRET=GIU_NGUYEN_GIA_TRI_TREN_AAPANEL
SMTP_ENCRYPTION_KEY=GIU_NGUYEN_GIA_TRI_TREN_AAPANEL
CRON_SECRET=SECRET_NGAU_NHIEN
BUSINESS_TIMEZONE=Asia/Ho_Chi_Minh
```

Sao chép thêm các biến Telegram, Gemini và SePay đang dùng từ aaPanel. Đặc biệt phải giữ nguyên:

- `JWT_SECRET`: để cơ chế đăng nhập hiện tại tiếp tục hoạt động.
- `SMTP_ENCRYPTION_KEY`: để giải mã được mật khẩu SMTP đã lưu trong database.

Không cần đặt `DIRECT_URL` trên Vercel nếu Vercel không chạy migration trong build.

## 6. Cutover an toàn

1. Giữ website aaPanel ở chế độ tạm dừng ghi.
2. Chạy migration database lần cuối.
3. Chạy migration uploads lần cuối.
4. Deploy Vercel và kiểm tra đăng nhập, dashboard, ảnh, tạo đơn thử, email và webhook.
5. Trỏ domain sang Vercel.
6. Đặt lại Telegram/SePay webhook về domain production mới.
7. Giữ aaPanel và file dump ít nhất vài ngày ở chế độ read-only trước khi gỡ.

Nếu kiểm tra thất bại, trỏ domain lại aaPanel; database và thư mục upload cũ chưa bị script thay đổi.
