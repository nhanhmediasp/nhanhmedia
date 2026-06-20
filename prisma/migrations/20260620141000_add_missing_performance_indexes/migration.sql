-- Performance indexes for overall website optimization
-- Replaces full-table scans with index range scans

-- ── users table ────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at");

-- ── customers table ────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "customers_created_by_user_id_idx" ON "customers" ("created_by_user_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "customers_created_at_idx" ON "customers" ("created_at");

-- ── products table ─────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_status_idx" ON "products" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_created_at_idx" ON "products" ("created_at");

-- ── product_variants table ──────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "product_variants_product_id_idx" ON "product_variants" ("product_id");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "product_variants_status_idx" ON "product_variants" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "product_variants_created_at_idx" ON "product_variants" ("created_at");

-- ── suppliers table ────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "suppliers_created_at_idx" ON "suppliers" ("created_at");

-- ── notifications table ────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "notifications_target_role_idx" ON "notifications" ("target_role");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "notifications_created_at_idx" ON "notifications" ("created_at");

-- ── notification_reads table ────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS "notification_reads_user_id_idx" ON "notification_reads" ("user_id");
