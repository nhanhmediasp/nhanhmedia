-- Performance indexes for reports API optimization
-- Replaces full-table scans with index range scans

-- ── orders table ───────────────────────────────────────────────────────────
-- Range scan for date filters (most critical)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_created_at_idx"       ON "orders" ("created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_status_idx"           ON "orders" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_customer_id_idx"      ON "orders" ("customer_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_created_by_user_id_idx" ON "orders" ("created_by_user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_product_id_idx"       ON "orders" ("product_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_supplier_id_idx"      ON "orders" ("supplier_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_end_date_idx"         ON "orders" ("end_date");
-- Composite index: date range + status filter (used in reports with both filters)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_created_at_status_idx" ON "orders" ("created_at", "status");

-- ── order_renewals table ───────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "order_renewals_created_at_idx"       ON "order_renewals" ("created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "order_renewals_renewed_by_user_id_idx" ON "order_renewals" ("renewed_by_user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "order_renewals_order_id_idx"         ON "order_renewals" ("order_id");

-- ── users table ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_role_idx"   ON "users" ("role");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_status_idx" ON "users" ("status");
