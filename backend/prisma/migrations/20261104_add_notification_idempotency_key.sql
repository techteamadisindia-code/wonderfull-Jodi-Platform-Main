-- Migration: 20261104_add_notification_idempotency_key.sql
-- Purpose: Add an idempotency_key column to the notifications table so that
--          INTEREST_RESTORED notifications cannot be duplicated across multiple
--          Node.js instances (horizontal scaling).
--
-- Design:
--   - VARCHAR(200) covers the longest key: 'INTEREST_RESTORED:<userId>:<interestId>'
--     which is at most ~12 + 36 + 1 + 36 + 1 = 86 chars (UUID format).
--   - UNIQUE index guarantees exactly-once per (notification type × interest × recipient).
--   - Nullable: existing notifications without an idempotency key are unaffected.
--   - IF NOT EXISTS / IF NOT EXISTS equivalents make the migration idempotent.
--
-- Safety: Non-destructive. Only adds a column and index. Fully reversible.

ALTER TABLE `notifications`
  ADD COLUMN IF NOT EXISTS `idempotency_key` VARCHAR(200) NULL AFTER `metadata`;

-- Create unique index; MariaDB 10.5+ supports CREATE UNIQUE INDEX ... IF NOT EXISTS
CREATE UNIQUE INDEX IF NOT EXISTS `idx_notifications_idempotency_key`
  ON `notifications` (`idempotency_key`);

