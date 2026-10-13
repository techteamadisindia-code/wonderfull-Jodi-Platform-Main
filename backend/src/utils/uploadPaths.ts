import path from 'path';
import fs from 'fs';

/**
 * Checks whether a given directory is the root of the project repository.
 * In this repository layout, the project root contains:
 * - 'backend' directory with 'package.json'
 * - 'frontend' directory (with 'package.json') or 'start.js' or root 'package.json'
 */
function isProjectRootDir(dir: string): boolean {
  try {
    const hasBackendPkg = fs.existsSync(path.join(dir, 'backend', 'package.json'));
    const hasFrontendPkg = fs.existsSync(path.join(dir, 'frontend', 'package.json'));
    const hasStartScript = fs.existsSync(path.join(dir, 'start.js'));
    const hasRootPkg = fs.existsSync(path.join(dir, 'package.json'));

    return hasBackendPkg && (hasFrontendPkg || hasStartScript || hasRootPkg);
  } catch {
    return false;
  }
}

/**
 * Resolves the root directory of the application deterministically regardless
 * of whether the process was started from the repository root, backend directory,
 * or a deep subdirectory.
 */
export function getProjectRootDir(): string {
  // 1. Walk upward from __dirname (e.g. backend/src/utils or backend/dist/utils)
  let currentDir = path.resolve(__dirname);
  for (let i = 0; i < 6; i++) {
    if (isProjectRootDir(currentDir)) {
      return currentDir;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }

  // 2. Walk upward from process.cwd()
  let cwdCandidate = path.resolve(process.cwd());
  for (let i = 0; i < 6; i++) {
    if (isProjectRootDir(cwdCandidate)) {
      return cwdCandidate;
    }
    const parent = path.dirname(cwdCandidate);
    if (parent === cwdCandidate) break;
    cwdCandidate = parent;
  }

  // 3. Fallback: inspect process.cwd() / backend
  const cwd = path.resolve(process.cwd());
  if (fs.existsSync(path.join(cwd, 'backend'))) {
    return cwd;
  }

  const parentCwd = path.resolve(cwd, '..');
  if (fs.existsSync(path.join(parentCwd, 'backend'))) {
    return parentCwd;
  }

  return cwd;
}

/**
 * Returns the canonical writable uploads directory at <projectRoot>/uploads.
 */
export function getCanonicalUploadRootDir(): string {
  return path.resolve(getProjectRootDir(), 'uploads');
}

/**
 * Ensures and returns the canonical writable upload directory for a given subfolder
 * at <projectRoot>/uploads/<subfolder>.
 * Does NOT write or touch legacy secondary directories on write.
 */
export function getCanonicalUploadDir(subfolder: string = 'profiles'): string {
  const primary = path.join(getCanonicalUploadRootDir(), subfolder);
  if (!fs.existsSync(primary)) {
    fs.mkdirSync(primary, { recursive: true });
  }
  return primary;
}

/**
 * Backward-compatible alias for getCanonicalUploadDir.
 */
export function getPrimaryUploadDir(subfolder: string = 'profiles'): string {
  return getCanonicalUploadDir(subfolder);
}

/**
 * Returns all potential upload base directories in priority order:
 * 1. <projectRoot>/uploads (canonical writable location)
 * 2. <projectRoot>/backend/uploads (legacy read-only fallback)
 * 3. <process.cwd()>/uploads (if different)
 * 4. <process.cwd()>/backend/uploads (if different)
 */
export function getUploadBaseDirectories(): string[] {
  const root = getProjectRootDir();
  const cwd = process.cwd();

  const candidates = [
    path.resolve(root, 'uploads'),
    path.resolve(root, 'backend', 'uploads'),
  ];

  const cwdUploads = path.resolve(cwd, 'uploads');
  if (!candidates.includes(cwdUploads)) {
    candidates.push(cwdUploads);
  }

  const cwdBackendUploads = path.resolve(cwd, 'backend', 'uploads');
  if (!candidates.includes(cwdBackendUploads)) {
    candidates.push(cwdBackendUploads);
  }

  return candidates;
}

/**
 * Returns all candidate directories for a specific subfolder (e.g. 'profiles', 'blogs', 'awards', 'biodatas', 'verifications').
 */
export function getUploadDirectories(subfolder: string): string[] {
  return getUploadBaseDirectories().map((base) => path.join(base, subfolder));
}

/**
 * Checks whether childPath is strictly located inside parentDir (does not equal parentDir,
 * does not escape via ..).
 */
function isStrictlyInside(childPath: string, parentDir: string): boolean {
  const rel = path.relative(parentDir, childPath);
  return !rel.startsWith('..') && !path.isAbsolute(rel) && rel !== '';
}

/**
 * Validates whether a filename contains strictly safe characters (alphanumeric, dash, underscore, dot)
 * with no path separators, directory traversal sequences, or null bytes.
 */
export function isValidUploadFilename(filename: string): boolean {
  if (!filename || typeof filename !== 'string') return false;
  if (filename.length > 255) return false;
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) return false;
  if (filename === '.' || filename === '..' || filename.includes('..')) return false;
  return path.basename(filename) === filename;
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
export function findUploadedFile(urlOrPath: string): string | null {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;

  // Fully decode URL encoding up to 3 passes to thwart multi-layer encoding tricks
  let decoded = urlOrPath;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
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
  if (!clean || clean.includes('..')) return null;

  // Validate each path segment
  const segments = clean.split('/');
  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..' || !/^[a-zA-Z0-9_.-]+$/.test(seg)) {
      return null;
    }
  }

  // Check candidate upload directories in priority order
  for (const baseDir of getUploadBaseDirectories()) {
    if (!fs.existsSync(baseDir)) continue;

    const candidatePath = path.resolve(baseDir, clean);

    // Initial check: lexical containment
    if (!isStrictlyInside(candidatePath, baseDir)) {
      continue;
    }

    if (fs.existsSync(candidatePath)) {
      try {
        // Resolve symlinks to verify physical destination is within approved upload base
        const realCandidate = fs.realpathSync(candidatePath);
        const realBase = fs.realpathSync(baseDir);

        if (!isStrictlyInside(realCandidate, realBase)) {
          // Symlink escapes approved upload directory!
          continue;
        }

        const stats = fs.statSync(realCandidate);
        if (stats.isFile() && stats.size > 0) {
          return candidatePath;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}
