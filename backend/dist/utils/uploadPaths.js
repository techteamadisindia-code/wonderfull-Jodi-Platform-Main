"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectRootDir = getProjectRootDir;
exports.getCanonicalUploadRootDir = getCanonicalUploadRootDir;
exports.getCanonicalUploadDir = getCanonicalUploadDir;
exports.getPrimaryUploadDir = getPrimaryUploadDir;
exports.getUploadBaseDirectories = getUploadBaseDirectories;
exports.getUploadDirectories = getUploadDirectories;
exports.isValidUploadFilename = isValidUploadFilename;
exports.findUploadedFile = findUploadedFile;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Checks whether a given directory is the root of the project repository.
 * In this repository layout, the project root contains:
 * - 'backend' directory with 'package.json'
 * - 'frontend' directory (with 'package.json') or 'start.js' or root 'package.json'
 */
function isProjectRootDir(dir) {
    try {
        const hasBackendPkg = fs_1.default.existsSync(path_1.default.join(dir, 'backend', 'package.json'));
        const hasFrontendPkg = fs_1.default.existsSync(path_1.default.join(dir, 'frontend', 'package.json'));
        const hasStartScript = fs_1.default.existsSync(path_1.default.join(dir, 'start.js'));
        const hasRootPkg = fs_1.default.existsSync(path_1.default.join(dir, 'package.json'));
        return hasBackendPkg && (hasFrontendPkg || hasStartScript || hasRootPkg);
    }
    catch {
        return false;
    }
}
/**
 * Resolves the root directory of the application deterministically regardless
 * of whether the process was started from the repository root, backend directory,
 * or a deep subdirectory.
 */
function getProjectRootDir() {
    // 1. Walk upward from __dirname (e.g. backend/src/utils or backend/dist/utils)
    let currentDir = path_1.default.resolve(__dirname);
    for (let i = 0; i < 6; i++) {
        if (isProjectRootDir(currentDir)) {
            return currentDir;
        }
        const parent = path_1.default.dirname(currentDir);
        if (parent === currentDir)
            break;
        currentDir = parent;
    }
    // 2. Walk upward from process.cwd()
    let cwdCandidate = path_1.default.resolve(process.cwd());
    for (let i = 0; i < 6; i++) {
        if (isProjectRootDir(cwdCandidate)) {
            return cwdCandidate;
        }
        const parent = path_1.default.dirname(cwdCandidate);
        if (parent === cwdCandidate)
            break;
        cwdCandidate = parent;
    }
    // 3. Fallback: inspect process.cwd() / backend
    const cwd = path_1.default.resolve(process.cwd());
    if (fs_1.default.existsSync(path_1.default.join(cwd, 'backend'))) {
        return cwd;
    }
    const parentCwd = path_1.default.resolve(cwd, '..');
    if (fs_1.default.existsSync(path_1.default.join(parentCwd, 'backend'))) {
        return parentCwd;
    }
    return cwd;
}
/**
 * Returns the canonical writable uploads directory at <projectRoot>/uploads.
 */
function getCanonicalUploadRootDir() {
    return path_1.default.resolve(getProjectRootDir(), 'uploads');
}
/**
 * Ensures and returns the canonical writable upload directory for a given subfolder
 * at <projectRoot>/uploads/<subfolder>.
 * Does NOT write or touch legacy secondary directories on write.
 */
function getCanonicalUploadDir(subfolder = 'profiles') {
    const primary = path_1.default.join(getCanonicalUploadRootDir(), subfolder);
    if (!fs_1.default.existsSync(primary)) {
        fs_1.default.mkdirSync(primary, { recursive: true });
    }
    return primary;
}
/**
 * Backward-compatible alias for getCanonicalUploadDir.
 */
function getPrimaryUploadDir(subfolder = 'profiles') {
    return getCanonicalUploadDir(subfolder);
}
/**
 * Returns all potential upload base directories in priority order:
 * 1. <projectRoot>/uploads (canonical writable location)
 * 2. <projectRoot>/backend/uploads (legacy read-only fallback)
 * 3. <process.cwd()>/uploads (if different)
 * 4. <process.cwd()>/backend/uploads (if different)
 */
function getUploadBaseDirectories() {
    const root = getProjectRootDir();
    const cwd = process.cwd();
    const candidates = [
        path_1.default.resolve(root, 'uploads'),
        path_1.default.resolve(root, 'backend', 'uploads'),
    ];
    const cwdUploads = path_1.default.resolve(cwd, 'uploads');
    if (!candidates.includes(cwdUploads)) {
        candidates.push(cwdUploads);
    }
    const cwdBackendUploads = path_1.default.resolve(cwd, 'backend', 'uploads');
    if (!candidates.includes(cwdBackendUploads)) {
        candidates.push(cwdBackendUploads);
    }
    return candidates;
}
/**
 * Returns all candidate directories for a specific subfolder (e.g. 'profiles', 'blogs', 'awards', 'biodatas', 'verifications').
 */
function getUploadDirectories(subfolder) {
    return getUploadBaseDirectories().map((base) => path_1.default.join(base, subfolder));
}
/**
 * Checks whether childPath is strictly located inside parentDir (does not equal parentDir,
 * does not escape via ..).
 */
function isStrictlyInside(childPath, parentDir) {
    const rel = path_1.default.relative(parentDir, childPath);
    return !rel.startsWith('..') && !path_1.default.isAbsolute(rel) && rel !== '';
}
/**
 * Validates whether a filename contains strictly safe characters (alphanumeric, dash, underscore, dot)
 * with no path separators, directory traversal sequences, or null bytes.
 */
function isValidUploadFilename(filename) {
    if (!filename || typeof filename !== 'string')
        return false;
    if (filename.length > 255)
        return false;
    if (!/^[a-zA-Z0-9_.-]+$/.test(filename))
        return false;
    if (filename === '.' || filename === '..' || filename.includes('..'))
        return false;
    return path_1.default.basename(filename) === filename;
}
/**
 * Attempts to locate an uploaded file across candidate upload directories
 * (canonical <projectRoot>/uploads first, then legacy <projectRoot>/backend/uploads).
 *
 * Hardened against:
 * 1. Single and double URL encoding (%2e%2e, %252e%252e)
 * 2. Path traversal sequences (.., \, :)
 * 3. Null-byte injection (\0, %00)
 * 4. Symlinks pointing outside approved upload directories (using realpath verification)
 */
function findUploadedFile(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string')
        return null;
    // Fully decode URL encoding up to 3 passes to thwart multi-layer encoding tricks
    let decoded = urlOrPath;
    for (let i = 0; i < 3; i++) {
        try {
            const next = decodeURIComponent(decoded);
            if (next === decoded)
                break;
            decoded = next;
        }
        catch {
            return null;
        }
    }
    // Reject null-byte injection, drive colons, or alternate data streams
    if (decoded.includes('\0') || decoded.includes(':')) {
        return null;
    }
    // Normalize slashes
    const normalized = decoded.trim().replace(/\\/g, '/');
    // Reject path traversal tokens
    if (normalized.includes('..')) {
        return null;
    }
    // Strip leading slashes and any leading 'uploads/' prefix
    let clean = normalized.replace(/^\/+/, '');
    if (clean.startsWith('uploads/')) {
        clean = clean.replace(/^uploads\//, '');
    }
    if (!clean || clean.includes('..'))
        return null;
    // Validate each path segment
    const segments = clean.split('/');
    for (const seg of segments) {
        if (!seg || seg === '.' || seg === '..' || !/^[a-zA-Z0-9_.-]+$/.test(seg)) {
            return null;
        }
    }
    // Check candidate upload directories in priority order
    for (const baseDir of getUploadBaseDirectories()) {
        if (!fs_1.default.existsSync(baseDir))
            continue;
        const candidatePath = path_1.default.resolve(baseDir, clean);
        // Initial check: lexical containment
        if (!isStrictlyInside(candidatePath, baseDir)) {
            continue;
        }
        if (fs_1.default.existsSync(candidatePath)) {
            try {
                // Resolve symlinks to verify physical destination is within approved upload base
                const realCandidate = fs_1.default.realpathSync(candidatePath);
                const realBase = fs_1.default.realpathSync(baseDir);
                if (!isStrictlyInside(realCandidate, realBase)) {
                    // Symlink escapes approved upload directory!
                    continue;
                }
                const stats = fs_1.default.statSync(realCandidate);
                if (stats.isFile() && stats.size > 0) {
                    return candidatePath;
                }
            }
            catch {
                continue;
            }
        }
    }
    return null;
}
//# sourceMappingURL=uploadPaths.js.map