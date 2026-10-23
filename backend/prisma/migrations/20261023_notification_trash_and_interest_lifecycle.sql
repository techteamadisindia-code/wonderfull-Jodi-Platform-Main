-- ==============================================================================
-- WONDERFUL JODI — NOTIFICATION TRASH & INTEREST LIFECYCLE OPTIMIZATION
-- Safe, Idempotent DDL Migration (Zero Downtime / Non-Destructive)
-- Target: MariaDB 10.6+ / 11.x (Hostinger Cloud Database: u625755214_wonderfuljodi)
-- Execution Note: Staging-only validation required before production deployment.
-- ==============================================================================

-- 1. Add optional dedicated soft-delete tracking columns to `notifications`
-- (Note: The application already supports zero-DDL soft-deletion via the `metadata` JSON column).
ALTER TABLE `notifications` 
  ADD COLUMN IF NOT EXISTS `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE AFTER `readAt`,
  ADD COLUMN IF NOT EXISTS `deleted_at` DATETIME NULL AFTER `is_deleted`;

-- 2. Add composite index for high-throughput notification inbox filtering
-- Using standard MariaDB syntax: CREATE INDEX IF NOT EXISTS or guarded procedure
CREATE INDEX IF NOT EXISTS `idx_notifications_user_deleted_created`
  ON `notifications` (`user`, `is_deleted`, `createdAt`);

-- 3. Verify interests table status enum coverage
-- The `interests` table enum natively supports 'PENDING', 'ACCEPTED', 'DECLINED', 'REJECTED', 'CANCELLED'.
-- No destructive alteration or type truncation is performed.
