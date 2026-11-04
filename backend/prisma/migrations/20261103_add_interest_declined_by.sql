-- ==============================================================================
-- WONDERFUL JODI — INTEREST LIFECYCLE & AUDIT OPTIMIZATION
-- Safe, Idempotent DDL Migration (Zero Downtime / Non-Destructive)
-- Target: MariaDB 10.6+ / 11.x (Hostinger Cloud Database: u625755214_wonderfuljodi)
-- Execution Note: Staged for review. Zero-DDL fallback is fully supported in runtime.
-- ==============================================================================

-- Add optional dedicated declined_by tracking column to `interests`
ALTER TABLE `interests`
  ADD COLUMN IF NOT EXISTS `declined_by` VARCHAR(36) NULL AFTER `status`;

-- Add index for fast recipient decline query resolution
CREATE INDEX IF NOT EXISTS `idx_interests_declined_by`
  ON `interests` (`declined_by`);
