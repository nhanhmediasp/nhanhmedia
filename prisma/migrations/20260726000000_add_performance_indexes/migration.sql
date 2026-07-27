-- Index bổ sung cho các truy vấn nóng.
-- Dùng IF NOT EXISTS để an toàn khi database đã từng được tạo bằng `prisma db push`.

-- email_logs: cron kiểm tra "đã gửi email cho đơn này chưa"
CREATE INDEX IF NOT EXISTS "email_logs_order_id_idx" ON "email_logs"("order_id");
CREATE INDEX IF NOT EXISTS "email_logs_customer_id_idx" ON "email_logs"("customer_id");
CREATE INDEX IF NOT EXISTS "email_logs_sent_at_idx" ON "email_logs"("sent_at");
CREATE INDEX IF NOT EXISTS "email_logs_order_id_status_idx" ON "email_logs"("order_id", "status");

-- notifications: cron chống trùng thông báo theo (title, created_at)
CREATE INDEX IF NOT EXISTS "notifications_title_created_at_idx" ON "notifications"("title", "created_at");

-- orders: cron nhắc hạn quét theo khoảng end_date + lọc status
CREATE INDEX IF NOT EXISTS "orders_end_date_status_idx" ON "orders"("end_date", "status");

-- payment_transactions: màn hình đối soát lọc theo status
CREATE INDEX IF NOT EXISTS "payment_transactions_status_idx" ON "payment_transactions"("status");

-- projects: trước đây KHÔNG có index nào, cron quét full table mỗi lần chạy
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects"("status");
CREATE INDEX IF NOT EXISTS "projects_end_date_idx" ON "projects"("end_date");
CREATE INDEX IF NOT EXISTS "projects_created_at_idx" ON "projects"("created_at");
CREATE INDEX IF NOT EXISTS "projects_category_id_idx" ON "projects"("category_id");
CREATE INDEX IF NOT EXISTS "projects_customer_id_idx" ON "projects"("customer_id");
CREATE INDEX IF NOT EXISTS "projects_status_end_date_idx" ON "projects"("status", "end_date");

-- project_requirement_notes
CREATE INDEX IF NOT EXISTS "project_requirement_notes_project_id_idx" ON "project_requirement_notes"("project_id");

-- task_columns / tasks: bảng Kanban, trước đây thiếu index khoá ngoại
CREATE INDEX IF NOT EXISTS "task_columns_project_id_idx" ON "task_columns"("project_id");
CREATE INDEX IF NOT EXISTS "task_columns_project_id_position_idx" ON "task_columns"("project_id", "position");
CREATE INDEX IF NOT EXISTS "tasks_project_id_idx" ON "tasks"("project_id");
CREATE INDEX IF NOT EXISTS "tasks_column_id_idx" ON "tasks"("column_id");
CREATE INDEX IF NOT EXISTS "tasks_column_id_position_idx" ON "tasks"("column_id", "position");
CREATE INDEX IF NOT EXISTS "tasks_deadline_idx" ON "tasks"("deadline");

-- chi phí dự án
CREATE INDEX IF NOT EXISTS "tool_costs_project_id_idx" ON "tool_costs"("project_id");
CREATE INDEX IF NOT EXISTS "tool_costs_created_at_idx" ON "tool_costs"("created_at");
CREATE INDEX IF NOT EXISTS "tool_costs_next_renewal_idx" ON "tool_costs"("next_renewal");
CREATE INDEX IF NOT EXISTS "website_costs_project_id_idx" ON "website_costs"("project_id");
CREATE INDEX IF NOT EXISTS "website_costs_date_idx" ON "website_costs"("date");
