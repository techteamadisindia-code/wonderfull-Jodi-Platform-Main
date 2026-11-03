"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeterministicEnvPaths = getDeterministicEnvPaths;
exports.initEnvironment = initEnvironment;
exports.resetEnvironmentForTesting = resetEnvironmentForTesting;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let isEnvInitialized = false;
/**
 * Initializes environment variables for the backend.
 *
 * SAFETY & ISOLATION RULES:
 * 1. If staging mode is active (NODE_ENV === 'staging' or STAGING_MODE === 'true'):
 *    - Looks for dedicated staging configuration (`backend/.env.staging` or `.env.staging`).
 *    - If found, loads it with override priority.
 *    - If missing AND no DATABASE_URL is pre-configured in process.env:
 *      Aborts with an explicit error to prevent silent fallback to production `.env`.
 * 2. If not staging mode:
 *    - Normal production / development environment files (`.env`) are loaded.
 * 3. Idempotent: can be safely imported/invoked multiple times.
 */
/**
 * Resolves deterministic environment file paths based on the module directory.
 * When running from either `backend/src/config` (ts-node) or `backend/dist/config` (compiled JS):
 * - Backend environment file:      path.resolve(configDir, '../../.env')   -> <project_root>/backend/.env
 * - Project-root environment file: path.resolve(configDir, '../../../.env') -> <project_root>/.env
 */
function getDeterministicEnvPaths(configDir = __dirname) {
    const backendEnvPath = path_1.default.resolve(configDir, '../../.env');
    const projectRootEnvPath = path_1.default.resolve(configDir, '../../../.env');
    return { backendEnvPath, projectRootEnvPath };
}
function initEnvironment() {
    if (isEnvInitialized) {
        return;
    }
    isEnvInitialized = true;
    const isStaging = process.env.NODE_ENV === 'staging' ||
        process.env.STAGING_MODE === 'true';
    if (isStaging) {
        process.env.NODE_ENV = 'staging';
        const stagingCandidates = [
            path_1.default.resolve(__dirname, '../../.env.staging'),
            path_1.default.resolve(__dirname, '../../../.env.staging'),
            path_1.default.resolve(process.cwd(), 'backend', '.env.staging'),
            path_1.default.resolve(process.cwd(), '.env.staging'),
        ];
        let foundStagingPath = null;
        for (const cand of stagingCandidates) {
            if (fs_1.default.existsSync(cand)) {
                foundStagingPath = cand;
                break;
            }
        }
        if (foundStagingPath) {
            dotenv_1.default.config({ path: foundStagingPath, override: true });
        }
        else if (!process.env.DATABASE_URL) {
            // Staging mode is active, but no staging configuration was found and no DATABASE_URL is in the environment.
            // Strict fail-closed: do NOT load default .env to prevent accidental production connection!
            console.error('\n════════════════════════════════════════════════════════════════');
            console.error('  🛑 STAGING STARTUP BLOCKED: MISSING STAGING CONFIGURATION');
            console.error('════════════════════════════════════════════════════════════════');
            console.error('NODE_ENV is set to "staging", but no backend/.env.staging file exists');
            console.error('and no DATABASE_URL is set in process.env.');
            console.error('Refusing to fall back to default .env to prevent accidental production pollution.\n');
            return;
        }
        return;
    }
    // Normal Production / Development mode
    if (process.env.TS_NODE_DEV && (!process.env.NODE_ENV || process.env.NODE_ENV === 'production')) {
        process.env.NODE_ENV = 'development';
    }
    // Precedence order:
    // 1. Existing process.env variables (e.g. from Hostinger runtime) take highest precedence.
    // 2. backend/.env takes precedence over root .env.
    // 3. Root .env provides fallback values only (override: false).
    // Note: Bare dotenv.config() is intentionally omitted so root .env is never loaded before backend/.env.
    // Deterministic paths based on module directory:
    // - Backend environment file:      path.resolve(__dirname, '../../.env')   (backend/.env)
    // - Project-root environment file: path.resolve(__dirname, '../../../.env') (root .env)
    const { backendEnvPath, projectRootEnvPath } = getDeterministicEnvPaths(__dirname);
    // 1. Load canonical backend/.env first (if present)
    if (fs_1.default.existsSync(backendEnvPath)) {
        dotenv_1.default.config({ path: backendEnvPath, override: false });
    }
    // 2. Load canonical project-root .env second as fallback (if present and distinct)
    if (fs_1.default.existsSync(projectRootEnvPath) && projectRootEnvPath !== backendEnvPath) {
        dotenv_1.default.config({ path: projectRootEnvPath, override: false });
    }
}
/**
 * Resets the environment initialization flag for test isolation.
 */
function resetEnvironmentForTesting() {
    isEnvInitialized = false;
}
// Auto-run on module import
initEnvironment();
//# sourceMappingURL=env.js.map