# Wonderful Jodi — Database Migration Review Document

**Target Database:** `u625755214_wonderfuljodi`
**Database Engine:** MariaDB 11.8.9 LTS on Hostinger Cloud
**Prepared Date:** October 21, 2026
**Migration Script:** [`backend/prisma/migrations/20261021_safe_schema_repair.sql`](file:///c:/Users/rushi/Downloads/wonderfull-Jodi-Platform-Main-Github/wonderfull-Jodi-Platform-Main-main/backend/prisma/migrations/20261021_safe_schema_repair.sql)
**Safety Classification:** NON-DESTRUCTIVE / ZERO DOWNTIME
**Status:** ⏸️ PENDING EXPLICIT DBA / USER APPROVAL

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

**Migration Script:** [`backend/prisma/migrations/20261023_notification_trash_and_interest_lifecycle.sql`](file:///c:/Users/rushi/Downloads/wonderfull-Jodi-Platform-Main-Github/wonderfuljodi-notification-trash-interest-lifecycle/backend/prisma/migrations/20261023_notification_trash_and_interest_lifecycle.sql)  
**Safety Classification:** NON-DESTRUCTIVE / DUAL-COMPATIBLE / ZERO DOWNTIME  
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
