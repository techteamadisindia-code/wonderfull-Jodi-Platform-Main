# Wonderful Jodi: JWT Secret Hardening, Rotation & Deployment Runbook

## 1. Overview & Security Objectives

This runbook outlines the required procedures for configuring, rotating, and deploying cryptographic JWT secrets for Wonderful Jodi with **Strict Administrator Token Separation (Hotfix 3 & 3A)**.

**Security Objectives Achieved:**
1. **Zero Hardcoded Secrets**: All hardcoded fallback secrets (such as development keys) have been completely removed from the codebase.
2. **Dual-Secret Mandatory Requirement**: Both `JWT_SECRET` (member access tokens) and `JWT_ADMIN_SECRET` (administrator tokens) are **MANDATORY** in production and staging. Fallback to `JWT_SECRET` for administrator tokens has been completely eliminated.
3. **Fail-Closed Guarantee**: The backend process strictly halts startup (`process.exit(1)`) in production and staging environments if either required secret is missing, empty, a placeholder, or shorter than 32 characters (256 bits).
4. **Cryptographic Boundary Separation**:
   - Member access tokens signed with `JWT_SECRET` cannot pass administrator token verification (`verifyAdminToken`), even if a role claim says `admin` or `superadmin`.
   - Administrator tokens signed with `JWT_ADMIN_SECRET` cannot be accepted as member access tokens (`verifyAccessToken`).
   - Refresh tokens cannot be substituted for access or administrator tokens.
5. **No Secret Leakage**: Secret values and sensitive `.env` contents are never logged, printed to console, or included in test outputs.

---

## 2. Required Environment Variables

The application strictly expects the following environment variables to be configured in Hostinger:

| Variable Name | Required | Purpose | Minimum Strength Requirements |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | **MANDATORY** | Signs and verifies user & member access tokens. | Minimum 32 characters, high entropy, no placeholders. |
| `JWT_ADMIN_SECRET` | **MANDATORY** | Signs and verifies administrator tokens. Strict separation from member tokens. | Minimum 32 characters, high entropy, no placeholders. |
| `NODE_ENV` | **MANDATORY** | Sets runtime mode (`production`, `staging`, `development`, or `test`). | Must be `production` on live servers. |

> [!NOTE]
> **Refresh Tokens**: Refresh tokens in Wonderful Jodi are opaque, cryptographically random 40-byte strings stored as SHA-256 hashes in the MariaDB `RefreshToken` table with family rotation. They do NOT use JWT signing and do not require a separate JWT signing secret.

> [!IMPORTANT]
> **Pre-Deployment Requirement**: `JWT_ADMIN_SECRET` **MUST** be added to Hostinger's environment settings **BEFORE** deploying the updated code. If `JWT_ADMIN_SECRET` is missing, the application will refuse to start.
>
> **Forbidden Patterns**: The backend will abort startup if any secret contains known placeholder patterns such as `supersecret`, `dev_key`, `placeholder`, `change_me`, `replace_me`, `your_actual`, `default_key`, or repetitive characters.

---

## 3. Secret Generation Protocol

Generate distinct, high-entropy secrets using an approved cryptographic random number generator:

### Option A: OpenSSL (Recommended)
```bash
# Generate Member Secret
openssl rand -base64 32

# Generate Administrator Secret (Must be distinct from Member Secret!)
openssl rand -base64 32
```

### Option B: Node.js Crypto CLI
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

*Never reuse secrets between member tokens and administrator tokens. Never reuse secrets between development, staging, and production environments. Never commit secret values to version control.*

---

## 4. Configuring Secrets in Hostinger

Depending on whether your Hostinger service is a **VPS (Ubuntu / Debian)** or **Hostinger Cloud / Web Hosting (Node.js Selector / hPanel)**, follow the corresponding procedure below.

### Method A: Hostinger VPS (Systemd / PM2)
1. SSH into the production VPS:
   ```bash
   ssh operator@your-vps-ip
   ```
2. Navigate to the backend application root:
   ```bash
   cd /var/www/wonderfuljodi/backend
   ```
3. Edit the production environment file with restricted file permissions (`chmod 600 .env`):
   ```bash
   nano .env
   ```
4. Set both mandatory secrets:
   ```env
   NODE_ENV=production
   JWT_SECRET=<GENERATED_32_CHAR_MEMBER_SECRET>
   JWT_ADMIN_SECRET=<GENERATED_32_CHAR_ADMIN_SECRET>
   ```
5. If using PM2, restart the application with the updated environment:
   ```bash
   pm2 restart wonderfuljodi-backend --update-env
   ```
6. If using Systemd, restart the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart wonderfuljodi
   ```

### Method B: Hostinger hPanel (Node.js Application Manager)
1. Log in to the Hostinger hPanel.
2. Navigate to **Websites** &rarr; **Dashboard** &rarr; **Node.js**.
3. Under **Application Settings**, locate the **Environment Variables** section.
4. Add or update:
   - Key: `JWT_SECRET`, Value: `<GENERATED_32_CHAR_MEMBER_SECRET>`
   - Key: `JWT_ADMIN_SECRET`, Value: `<GENERATED_32_CHAR_ADMIN_SECRET>`
5. Click **Save** and **Restart Application**.

---

## 5. Preventing Missing-Secret Deployments

To prevent an accidental deployment where secrets are omitted:
1. **Startup Validator (`validateJwtEnvironment`)**: The backend automatically validates secret presence and entropy before invoking `server.listen()`. If `JWT_SECRET` or `JWT_ADMIN_SECRET` is missing, empty, or a placeholder, the process immediately logs a redacted error and exits with code `1`.
2. **Automated CI/CD Pre-flight Check**: Add the following command to the deployment pipeline before restarting the production process:
   ```bash
   node -e "require('./dist/config/jwtConfig').validateJwtEnvironment({ forceValidate: true })"
   ```
3. **Health Check Probing**: Automated deploy scripts must verify that `GET /api/health` returns `HTTP 200` within 15 seconds of process launch. If the service exited due to configuration error, the deployment script halts and alerts the operator.

---

## 6. Impact of Secret Rotation & Initial Deployment on Active Sessions

### 1. Initial Deployment of Hotfix 3A (Strict Admin Separation)
- **Administrator Sessions**: Existing administrator tokens (which were previously signed under `JWT_SECRET`) will fail signature verification against `JWT_ADMIN_SECRET`. **All active administrators will be logged out and must sign in again at `/admin/login`**.
- **Member Sessions**: Member sessions are **completely unaffected**. Member access tokens continue to verify under `JWT_SECRET`, and refresh tokens continue to rotate transparently via the database.

### 2. Subsequent Rotation of `JWT_SECRET` (Member Access Secret)
- **User Impact**: **Minimal / Zero Disruption**. The Wonderful Jodi frontend Axios interceptor intercepts the `401 TOKEN_EXPIRED` response, issues a single background request to `/api/auth/refresh`, and receives a new access token signed with the new secret.
- **Why?**: In Wonderful Jodi, refresh tokens are opaque 40-byte cryptographically random tokens stored in the MariaDB `RefreshToken` table with session family tracking—they do not depend on `JWT_SECRET`. Users remain logged in seamlessly.

### 3. Subsequent Rotation of `JWT_ADMIN_SECRET` (Administrator Secret)
- **User Impact**: All administrator sessions are immediately invalidated. Administrators must re-authenticate at `/admin/login`. Member sessions are unaffected.

---

## 7. Zero-Downtime Rollout Procedure

To deploy this security hotfix safely:

1. **Step 1: Pre-generate Distinct Secrets**
   - Generate two separate 32+ character secrets (`openssl rand -base64 32`) for `JWT_SECRET` and `JWT_ADMIN_SECRET`.
2. **Step 2: Update Environment Variables in Hostinger FIRST**
   - Configure both `JWT_SECRET` and `JWT_ADMIN_SECRET` in Hostinger environment settings **before** deploying code.
3. **Step 3: Deploy Application Build**
   - Transfer compiled artifacts (`backend/dist`) or run `npm run build` on the deployment host.
4. **Step 4: Reload Process Gracefully**
   - Execute zero-downtime cluster reload:
     ```bash
     pm2 reload wonderfuljodi-backend --update-env
     ```
5. **Step 5: Verify Deployment Health**
   - Follow the verification steps in Section 8 below.

---

## 8. Verifying Deployment Health Without Exposing Secrets

Operators can verify that the deployment succeeded and secrets are active without inspecting or printing sensitive values:

### 1. Health Probe
```bash
curl -i https://wonderfuljodi.com/api/health
```
**Expected Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"OK","uptime":...,"timestamp":"..."}
```

### 2. Process Logs Inspection
Inspect PM2 or Systemd logs to confirm clean initialization:
```bash
pm2 logs wonderfuljodi-backend --lines 40 --nostream
```
**Verify:**
- Look for: `WONDERFUL JODI FULLSTACK PLATFORM`
- Look for: `API Health: http://localhost:5000/api/health`
- **Ensure Absence Of**: `🛑 SERVER STARTUP BLOCKED: JWT CONFIGURATION ERROR`
- **Ensure**: No secret keys, passwords, or tokens appear anywhere in the log output.

### 3. Automated Regression Verification
Run the regression test suite on the host:
```bash
node test_jwt_security_suite.js
```
**Expected Result**: All 42 tests pass cleanly.
