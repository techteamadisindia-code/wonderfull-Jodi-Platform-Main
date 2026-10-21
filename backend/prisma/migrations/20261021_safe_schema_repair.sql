-- =============================================================================
-- WONDERFUL JODI — PRODUCTION DATABASE SCHEMA REPAIR SCRIPT
-- Target Database: u625755214_wonderfuljodi (MariaDB 11.8.9 LTS on Hostinger)
-- Date Prepared: October 21, 2026
-- Review Status: PENDING REVIEW & EXPLICIT DBA APPROVAL (DO NOT RUN AUTOMATICALLY)
-- Safety Profile: 100% NON-DESTRUCTIVE (Idempotent CREATE / ALTER IF NOT EXISTS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create conversation_participants Table
-- Resolves: 'The table conversation_participants does not exist in current database'
-- Ensures: Relational integrity for conversations, chat messaging, and admin audit
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `conversation_participants` (
  `conversation_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`conversation_id`, `user_id`),
  KEY `conv_part_user_idx` (`user_id`),
  KEY `conv_part_conv_idx` (`conversation_id`),
  CONSTRAINT `conv_part_conv_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `conv_part_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Backfill Existing Conversations into conversation_participants
-- Extracts user IDs from legacy MongoDB JSON array in conversations.participants
-- Example JSON: [{"$oid":"6a805d432cf39c7bd7bee14b"},{"$oid":"6a805d432cf39c7bd7bee14f"}]
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `conversation_participants` (`conversation_id`, `user_id`)
SELECT
  c._id AS conversation_id,
  jt.user_id
FROM `conversations` c
JOIN JSON_TABLE(
  c.`participants`,
  '$[*]' COLUMNS (
    user_id VARCHAR(36) PATH '$.$oid' DEFAULT PATH '$'
  )
) AS jt
WHERE jt.user_id IS NOT NULL
  AND jt.user_id IN (SELECT `_id` FROM `users`);

-- -----------------------------------------------------------------------------
-- 3. Add Missing created_by Column to awards Table
-- Resolves: 'The column u625755214_wonderfuljodi.awards.created_by does not exist'
-- Matches: deleted_by and updated_by column definitions (VARCHAR(24) NULL)
-- -----------------------------------------------------------------------------
ALTER TABLE `awards`
  ADD COLUMN IF NOT EXISTS `created_by` VARCHAR(24) DEFAULT NULL AFTER `deleted_by`;

-- -----------------------------------------------------------------------------
-- 4. Verification Check: blocks Table
-- NOTE: Verified in Phase 2 audit on Oct 21, 2026:
-- Table `blocks` already possesses:
--   - `id` (VARCHAR(24) PK)
--   - `blocker_id` (VARCHAR(24) NOT NULL, FK -> users._id)
--   - `blocked_user_id` (VARCHAR(24) NOT NULL, FK -> users._id)
--   - `reason` (VARCHAR(500) NULL)
--   - `created_at` (DATETIME(3) NOT NULL)
--   - `updated_at` (DATETIME(3) NOT NULL)
-- No structural DDL is required for table `blocks`.
-- -----------------------------------------------------------------------------
