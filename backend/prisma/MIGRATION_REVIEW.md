# Wonderful Jodi — Database Migration Review Document

**Target Database:** `u625755214_wonderfuljodi`
**Database Engine:** MariaDB 11.8.9 LTS on Hostinger Cloud
**Prepared Date:** October 21, 2026
**Migration Script:** [backend/prisma/migrations/20261021_safe_schema_repair.sql](migrations/20261021_safe_schema_repair.sql)
**Safety Classification:** NON-DESTRUCTIVE / ZERO DOWNTIME
**Status:** PENDING EXPLICIT DBA / USER APPROVAL

---

## 1. Migration Purpose & Impacted Systems

| Entity | Problem in Production | Migration Action | Impacted Workflows |
|---|---|---|---|
| `conversation_participants` | Table missing from MariaDB | `CREATE TABLE IF NOT EXISTS` with foreign keys to `conversations` & `users` | Enables "Accept Interest", Chat messaging, Admin "Messages & Moderation" |
| `conversations` | 8 legacy conversations have JSON participants in MariaDB | `INSERT IGNORE` backfill using `JSON_TABLE` to extract user IDs | Backfills existing chat history into the relational structure |
| `awards` | Missing `created_by` column | `ALTER TABLE ADD COLUMN IF NOT EXISTS created_by VARCHAR(24) NULL` | Resolves HTTP 500 on Admin Dashboard "Awards" tab |
| `blocks` | Verified intact | Documented: `blocks` already has `blocker_id`, `blocked_user_id`, and active FKs | No changes required |

---

## 2. Safety & Pre-requisite Checklist

- [ ] Take full database backup via Hostinger phpMyAdmin (Export -> Custom -> All tables -> GZip).
- [ ] Verify database user permissions (`CREATE`, `ALTER`, `INSERT`).
- [ ] Confirm no long-running transactions are active.
- [ ] Execute script during low-traffic window.

---

## 3. Rollback Procedure

If the migration must be rolled back for any reason, execute:

```sql
-- Rollback 1: Drop conversation_participants table
DROP TABLE IF EXISTS `conversation_participants`;

-- Rollback 2: Drop added column from awards table
ALTER TABLE `awards` DROP COLUMN IF EXISTS `created_by`;
```

*(Note: Rolling back `conversation_participants` does NOT delete any conversations or messages, as conversations are stored in `conversations` and messages in `messages`).*

---

## 4. Feature Migration: Notification Trash & Soft Delete Optimization (October 23, 2026)

**Migration Script:** [backend/prisma/migrations/20261023_notification_trash_and_interest_lifecycle.sql](migrations/20261023_notification_trash_and_interest_lifecycle.sql)<br/>
**Safety Classification:** NON-DESTRUCTIVE / DUAL-COMPATIBLE / ZERO DOWNTIME<br/>
**Status:** OPTIONAL DDL (Application operates with full resilience via JSON `metadata` even before DDL execution)

### 4.1 Schema Impact & Strategy

- **Zero-DDL Resilience:** The backend uses `metadata.isDeleted` and `metadata.trashed` inside the existing `metadata` JSON column of `notifications`. This guarantees zero-downtime soft-deletion without requiring database schema lock or immediate DDL migration.
- **DDL Optimization:** If applied, adds dedicated `is_deleted` and `deleted_at` columns along with composite index `idx_notifications_user_deleted_created` to speed up inbox queries on high-volume accounts.
- **Interests Lifecycle:** The `interests.status` enum already supports `'PENDING', 'ACCEPTED', 'DECLINED', 'REJECTED', 'CANCELLED'`. No enum modification is needed for the withdrawal transition (`ACCEPTED -> REJECTED`).

### 4.2 Staging Verification Procedure

1. Verify target database is staging, NOT production (`assertStagingIsolation` in `stagingGuard.ts`).
2. Run `mysql -u ... -p ... < backend/prisma/migrations/20261023_notification_trash_and_interest_lifecycle.sql`.
3. Verify column presence: `SHOW COLUMNS FROM notifications LIKE 'is_deleted';`.
4. Run automated test suite: `node backend/test_notification_trash_interest_lifecycle_suite.js`.
5. Verify application queries and inbox filtering pass without any column lookup errors.

### 4.3 Rollback Procedure

```sql
ALTER TABLE `notifications` DROP INDEX IF EXISTS `idx_notifications_user_deleted_created`;
ALTER TABLE `notifications` DROP COLUMN IF EXISTS `deleted_at`;
ALTER TABLE `notifications` DROP COLUMN IF EXISTS `is_deleted`;
```

*(Rolling back the dedicated columns does not lose soft-deletion status because `metadata.isDeleted` is preserved in the JSON payload).*

---

## 5. Schema Repair: Sub-Castes Table Creation (October 26, 2026)

**Target Database:** `u625755214_wonderfuljodi`<br/>
**Database Engine:** MariaDB 11.8.9 LTS on Hostinger Cloud<br/>
**Migration Script:** [backend/prisma/migrations/20261026_create_sub_castes_table.sql](migrations/20261026_create_sub_castes_table.sql)<br/>
**Safety Classification:** ADDITIVE DDL (Creates new child table with FK to `castes.id`)<br/>
**Downtime Assessment:** Low risk under off-peak maintenance window; **Zero downtime is NOT guaranteed** under heavy traffic due to InnoDB metadata lock acquisition on the parent table (`castes`).<br/>
**Status:** PENDING EXPLICIT DBA / USER APPROVAL (DO NOT RUN AUTOMATICALLY)

### 5.1 Root Cause & Impacted Systems

| Entity | Problem in Production | Migration Action | Impacted Workflows |
|---|---|---|---|
| `sub_castes` | Table missing from MariaDB (`P2021`) | `CREATE TABLE IF NOT EXISTS sub_castes` with FK to `castes(id)` and unique constraint on `(caste_id, name)` | Resolves runtime `prisma.subCaste.count()` failure; enables sub-caste lookups in registration, profile editing, and admin master data management |

### 5.2 Technical Safety & Concurrency Analysis

1. **Locking & Concurrency:**
   - MariaDB InnoDB acquires an exclusive metadata lock (`MDL_EXCLUSIVE`) on `sub_castes` and a shared metadata lock (`MDL_SHARED_READ`) on the referenced parent table `castes`.
   - While `castes` table rows are not rewritten, any active long-running query or transaction on `castes` can block MDL acquisition. Subsequent read/write queries on `castes` will then queue behind this DDL lock request.
   - **Mitigation:** Execute strictly during off-peak hours (e.g. 02:00-04:00 IST). Verify with `SHOW FULL PROCESSLIST;` that no transactions are active on `castes` before running the DDL.
2. **Idempotency Semantics:**
   - `CREATE TABLE IF NOT EXISTS` is idempotent if the table does not exist or was created with this exact DDL.
   - **Crucial Limitation:** If `sub_castes` already exists with a conflicting or partial schema, `CREATE TABLE IF NOT EXISTS` will silently do nothing and will NOT reconcile columns or constraints.
   - **Pre-check:** Run `SHOW TABLES LIKE 'sub_castes';` beforehand. If it exists, inspect with `DESCRIBE sub_castes;` before running.
3. **Rollback & Data Safety Analysis:**
   - **Rollback SQL:** `DROP TABLE IF EXISTS sub_castes;`
   - **Data Destruction Caveat:** Rolling back drops the table completely. If user registrations, profile updates, or admin imports have written `SubCaste` records between migration and rollback, **all newly created records will be permanently deleted**.
   - Furthermore, dropping the table will immediately reintroduce the `P2021` runtime error for any active client queries.
   - **Conclusion:** Rollback by dropping the table is safe ONLY immediately after execution before production traffic creates dependent data, or requires an explicit data backup before dropping.

### 5.3 Timestamp Defaults & Runtime Update Behavior (Prisma Client vs MariaDB)

- **Investigation Result:** In Prisma 6.19.3, the declaration `updatedAt DateTime @updatedAt @map("updated_at")` generates:

```sql
`updated_at` DATETIME(3) NOT NULL,
```

  It does **NOT** generate `DEFAULT CURRENT_TIMESTAMP(3)` or `ON UPDATE CURRENT_TIMESTAMP(3)` at the database level.
- **Maintenance Mechanism:**
  - In Prisma's design, `@updatedAt` is an **application-layer feature** enforced by the **Prisma Client query engine**.
  - When mutations (`create`, `update`, `upsert`) occur via Prisma Client (e.g. `prisma.subCaste.update()` or `SubCaste.create()`), Prisma Client automatically injects `new Date()` into the SQL query parameters.
  - Defining `updated_at DATETIME(3) NOT NULL` in the migration SQL matches Prisma 6.19.3's generated DDL exactly (100% parity) and prevents drift when running `prisma migrate diff` or future schema inspections.
- **Convention Consistency:**
  - This matches the convention across the entire codebase, including parent model `Caste` (`updated_at DATETIME(3) NOT NULL`) and all other Prisma-managed models in `backend/prisma/schema.prisma`.
- **Index Consistency & Foreign Key Optimization:**
  - In MariaDB/MySQL InnoDB, foreign key constraints require an index on the child table where the foreign key column is the leading column.
  - The composite unique index `sub_castes_caste_id_name_key` on `(caste_id, name)` already indexes `caste_id` as its leading prefix, fully satisfying MariaDB InnoDB's foreign key requirement.
  - The redundant standalone index `KEY sub_castes_caste_id_idx (caste_id)` was eliminated from the migration script, achieving 100% structural parity with Prisma's generated DDL without index bloat.

### 5.4 Pre-requisite Checklist

- [ ] Take full database backup via Hostinger phpMyAdmin (Export -> Custom -> Select all tables -> Compression: gzipped).
- [ ] Verify database user permissions (`CREATE`, `INDEX`, `REFERENCES`).
- [ ] Verify active transactions: `SHOW FULL PROCESSLIST;` (ensure no locks on `castes`).
- [ ] Run pre-check: `SHOW TABLES LIKE 'sub_castes';` (must confirm whether table already exists).
- [ ] Execute script via phpMyAdmin SQL console or MySQL CLI during low-traffic window.

### 5.5 Post-Migration Verification Procedure

1. Execute `SHOW TABLES LIKE 'sub_castes';` (should return 1 row).
2. Execute `DESCRIBE sub_castes;` to confirm column types (`_id`, `caste_id`, `name`, etc.).
3. Verify `SELECT COUNT(*) FROM sub_castes;` returns 0 (or row count) without throwing P2021.
4. Verify `/api/community/sub-castes?casteId=<validId>` returns HTTP 200 with JSON payload.

### 5.6 Emergency Rollback Procedure

If execution encounters a critical fault *before* application traffic writes records:

```sql
DROP TABLE IF EXISTS `sub_castes`;
```

*(If production records have already been written, take a mysqldump of `sub_castes` before dropping to avoid irreversible data loss).*
