-- =============================================================================
-- WONDERFUL JODI — PRODUCTION DATABASE SCHEMA REPAIR SCRIPT
-- Target Database: u625755214_wonderfuljodi (MariaDB 11.8.9 LTS on Hostinger)
-- Date Prepared: October 26, 2026
-- Migration: 20261026_create_sub_castes_table.sql
-- Resolves: "Invalid `prisma.subCaste.count()` invocation: The table `sub_castes` does not exist in the current database."
-- Safety Profile: ADDITIVE DDL (Creates child table with FK to castes.id)
-- Lock Semantics: Acquires MDL_EXCLUSIVE on sub_castes and MDL_SHARED_READ on parent table `castes`.
-- Downtime Risk: Zero downtime is NOT guaranteed under high concurrent transaction load due to
--                potential metadata lock queueing on `castes`. Must execute during off-peak window.
-- Idempotency: CREATE TABLE IF NOT EXISTS is safe to re-run if table does not exist, but will NOT
--              reconcile conflicting schemas if an altered sub_castes table already exists.
-- Review Status: PENDING REVIEW & EXPLICIT DBA / USER APPROVAL (DO NOT RUN AUTOMATICALLY)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create sub_castes Table
-- Aligns with Prisma Model: SubCaste (mapped to 'sub_castes')
-- Foreign Key: references `castes`(`id`) with ON DELETE CASCADE ON UPDATE CASCADE
-- Unique Constraint: (`caste_id`, `name`)
-- Timestamps: `created_at` has database DEFAULT CURRENT_TIMESTAMP(3).
--             `updated_at` is DATETIME(3) NOT NULL (maintained by Prisma Client
--             via @updatedAt; Prisma 6.19.3 does not generate database-side
--             ON UPDATE CURRENT_TIMESTAMP triggers in MySQL/MariaDB DDL).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sub_castes` (
  `_id` VARCHAR(36) NOT NULL,
  `caste_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `aliases` JSON NULL,
  `source` VARCHAR(255) NOT NULL DEFAULT 'Community Master',
  `source_type` VARCHAR(50) NOT NULL DEFAULT 'COMMUNITY_MASTER',
  `source_reference` VARCHAR(255) DEFAULT NULL,
  `last_verified_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `version` INT NOT NULL DEFAULT 1,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`_id`),
  UNIQUE KEY `sub_castes_caste_id_name_key` (`caste_id`, `name`),
  CONSTRAINT `sub_castes_caste_id_fkey` FOREIGN KEY (`caste_id`) REFERENCES `castes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- ROLLBACK SCRIPT (Execute ONLY if rollback is required)
-- WARNING: Running this drops the entire `sub_castes` table. Any records created
-- since migration will be permanently lost, and applications querying sub_castes
-- will immediately experience P2021 errors again.
-- -----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS `sub_castes`;
