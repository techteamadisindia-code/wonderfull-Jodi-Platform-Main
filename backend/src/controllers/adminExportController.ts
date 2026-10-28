import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { Registration } from '../models/Registration';
import { Subscription } from '../models/Subscription';
import { Admin } from '../models/Admin';
import { AuditLog } from '../models/AuditLog';
import {
  generateCsv,
  generateExcelWorkbook,
  ExcelSheetData,
} from '../services/dataExportService';
import { escapeRegex, isValidObjectId } from '../utils/securityUtils';

/**
 * Parse and validate MAX_EXPORT_ROWS from environment.
 *
 * Rules:
 *  - Must be a positive, finite integer (no NaN, Infinity, floats, or negative values).
 *  - Must not exceed ABSOLUTE_MAX (100 000) to guard against misconfiguration.
 *  - Any invalid value logs an error and falls back to HARD_DEFAULT (10 000).
 *  - This prevents parseInt('abc') → NaN silently disabling the export limit.
 */
function parseMaxExportRows(raw: string | undefined): number {
  const HARD_DEFAULT = 10000;
  const ABSOLUTE_MAX = 100000;
  if (!raw) return HARD_DEFAULT;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0 || n > ABSOLUTE_MAX) {
    console.error(
      `[Export] Invalid MAX_EXPORT_ROWS="${raw}" (must be a positive integer ≤ ${ABSOLUTE_MAX}). ` +
        `Falling back to safe default ${HARD_DEFAULT}.`
    );
    return HARD_DEFAULT;
  }
  return n;
}

/**
 * Configurable maximum rows allowed in an export batch.
 * Protects server against unbounded memory consumption and event loop starvation.
 *
 * Set via MAX_EXPORT_ROWS environment variable (positive integer ≤ 100 000).
 * Invalid or missing values fall back to 10 000 — the limit is NEVER silently disabled.
 */
export const MAX_EXPORT_ROWS = parseMaxExportRows(process.env.MAX_EXPORT_ROWS);

/**
 * Mask sensitive email for non-superadmin exports
 */
export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'Not recorded';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Mask sensitive mobile number for non-superadmin exports
 */
export function maskMobile(mobile?: string): string {
  if (!mobile) return 'Not recorded';
  const clean = mobile.replace(/\D/g, '');
  if (clean.length < 6) return '******';
  return `${clean.slice(0, 3)}****${clean.slice(-3)}`;
}

/**
 * Format date consistently as YYYY-MM-DD
 */
export function formatDate(d?: Date | string | null): string {
  if (!d) return 'Not recorded';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return 'Not recorded';
    return dt.toISOString().slice(0, 10);
  } catch {
    return 'Not recorded';
  }
}

/**
 * Calculate age safely from Date of Birth without returning negative values or handling future dates
 */
export function calculateAge(dob?: Date | string | null): string {
  if (!dob) return 'Not recorded';
  try {
    const dt = new Date(dob);
    const time = dt.getTime();
    if (isNaN(time)) return 'Not recorded';
    const now = Date.now();
    if (time > now) {
      // Future date of birth is invalid
      return 'Not recorded';
    }
    const today = new Date(now);
    let age = today.getUTCFullYear() - dt.getUTCFullYear();
    const m = today.getUTCMonth() - dt.getUTCMonth();
    if (m < 0 || (m === 0 && today.getUTCDate() < dt.getUTCDate())) {
      age--;
    }
    if (age < 0 || isNaN(age)) {
      return 'Not recorded';
    }
    return String(age);
  } catch {
    return 'Not recorded';
  }
}

/**
 * Authoritatively classify candidate registration status.
 * Prevents classifying a registration as complete solely because an empty or stub profile exists.
 */
export function determineRegistrationStatus(p: any, r: any): 'Complete' | 'Incomplete' | 'Pending' {
  // 1. Authoritative registration status from Registration model
  if (r?.status === 'COMPLETED') {
    return 'Complete';
  }

  // 2. Verified profile completeness: requires candidateId, name, and substantive data
  // Must NOT classify as complete solely because an empty or stub profile document exists
  const hasCandidateId = Boolean(p?.candidateId && String(p.candidateId).trim().length > 0);
  const hasName = Boolean(
    (p?.displayName || p?.fullName || p?.name) &&
      String(p.displayName || p.fullName || p.name).trim().length > 0
  );
  const hasSubstance = Boolean(
    p?.gender ||
      p?.dob ||
      p?.city ||
      p?.state ||
      p?.education ||
      p?.degree ||
      p?.profession ||
      p?.medicalRegistrationNumber
  );

  if (hasCandidateId && hasName && (hasSubstance || !p?._id)) {
    return 'Complete';
  }

  // 3. Incomplete draft or in-progress state
  if (
    r?.status === 'STARTED' ||
    r?.status === 'IN_PROGRESS' ||
    r?.status === 'ABANDONED' ||
    (p && (p._id || p.candidateId || Object.keys(p).length > 0))
  ) {
    return 'Incomplete';
  }

  // 4. Default: Pending
  return 'Pending';
}

/**
 * Identify missing required sections for incomplete registrations
 */
export function getMissingRequiredSections(reg: any): string {
  const missing: string[] = [];
  const stepData = reg.stepData || {};

  const basic = stepData.basicInfo || {};
  if (!basic.fullName || !basic.email || !basic.mobile) {
    missing.push('Basic Information');
  }

  const personal = stepData.personalInfo || {};
  if (!personal.gender && !basic.gender) {
    missing.push('Gender');
  }
  if (!personal.maritalStatus) {
    missing.push('Marital Status');
  }
  if (!personal.city && !personal.workLocation) {
    missing.push('Location');
  }

  const edu = stepData.educationProfession || {};
  if (!edu.profession && !edu.education && !edu.degree) {
    missing.push('Education / Profession');
  }

  const pref = stepData.preferences || {};
  const photos = stepData.photos || {};
  if (!pref.lookingFor && !pref.prefAgeMin) {
    missing.push('Partner Preferences');
  }
  if (!photos.primaryPhoto && (!photos.photos || photos.photos.length === 0)) {
    missing.push('Profile Photo');
  }

  return missing.length > 0 ? missing.join('; ') : 'None missing (ready for submission)';
}

export const ACTIVE_CANDIDATE_HEADERS = [
  'User ID',
  'Candidate ID',
  'Full Name',
  'Gender',
  'Email Address',
  'Mobile Number',
  'Date of Birth',
  'Age',
  'Height',
  'Marital Status',
  'Religion',
  'Caste',
  'Sub-Caste',
  'Mother Tongue',
  'City',
  'State',
  'Country',
  'Pincode',
  'Work Location',
  'Education',
  'Degree',
  'Profession',
  'Company',
  'Annual Income',
  'Medical College',
  'Medical University',
  'Medical Registration Number',
  'Medical Council',
  'Registration State',
  'Registration Year',
  'Medical Experience',
  'Current Hospital',
  'Additional Qualifications',
  'Family Type',
  'Father Occupation',
  'Mother Occupation',
  'Family Status',
  'Family Location',
  'Partner Preferred Age',
  'Partner Preferred Height',
  'Partner Preferred Qualification',
  'Partner Preferred Location',
  'Account Status',
  'Registration Status',
  'KYC Verification Status',
  'Membership Plan',
  'Subscription Status',
  'Subscription Expiry Date',
  'Registration Date',
  'Profile Creation Date',
  'Last Activity Date',
];

export const INCOMPLETE_REGISTRATION_HEADERS = [
  'Registration ID',
  'User ID',
  'Candidate Name',
  'Contact Email',
  'Contact Mobile',
  'Gender',
  'Current Step',
  'Completion Percentage',
  'Missing Required Sections',
  'Verification Status',
  'Account Status',
  'Started Date',
  'Last Activity Date',
];

/**
 * Log sensitive export action in AuditLog without leaking candidate PII.
 * Throws on failure to enforce mandatory fail-closed audit requirements.
 *
 * Schema alignment:
 *   - adminEmail  (String, required) — verified caller email from JWT, never from request body
 *   - adminUser   (ObjectId, optional) — caller's User ObjectId
 *   - status      (enum, required) — always 'SUCCESS' for a completed export call
 *   - details     (String) — JSON-serialised metadata; no candidate PII
 *   - ipAddress   (String) — client IP resolved via Express trust-proxy config
 */
export async function logExportAction(
  callerEmail: string,
  callerId: string,
  clientIp: string,
  exportType: string,
  recordCount: number,
  format: string
): Promise<void> {
  const auditPayload: any = {
    action: 'EXPORT_CANDIDATE_DATA',
    adminEmail: callerEmail,
    ipAddress: clientIp,
    status: 'SUCCESS',
    details: JSON.stringify({
      adminId: callerId,
      exportType,
      recordCount,
      format: format.toUpperCase(),
      timestamp: new Date().toISOString(),
    }),
    createdAt: new Date(),
  };

  if (callerId && isValidObjectId(callerId)) {
    auditPayload.adminUser = callerId;
  }

  await AuditLog.create(auditPayload);
}

/**
 * Build flat data rows for active candidates
 */
export function buildActiveCandidateRows(
  users: any[],
  profileMap: Map<string, any>,
  subscriptionMap: Map<string, any>,
  canViewPrivateContact: boolean,
  registrationMap?: Map<string, any>
): (string | number | null | undefined)[][] {
  return users.map((u) => {
    const p = profileMap.get(String(u._id)) || {};
    const s = subscriptionMap.get(String(u._id)) || {};
    const r = registrationMap ? registrationMap.get(String(u._id)) : null;

    const partnerExp = p.partnerExpectations || {};
    const fam = p.familyBackground || {};

    const prefAge =
      partnerExp.ageMin || partnerExp.ageMax
        ? `${partnerExp.ageMin || ''} - ${partnerExp.ageMax || ''} yrs`
        : 'Not recorded';

    const prefHeight =
      partnerExp.heightMin || partnerExp.heightMax
        ? `${partnerExp.heightMin || ''} - ${partnerExp.heightMax || ''}`
        : 'Not recorded';

    // Registration Status: Complete vs Incomplete vs Pending
    const regStatus = determineRegistrationStatus(p, r);

    // Mask sensitive medical credentials for non-superadmin/unauthorized callers
    const medRegNo = canViewPrivateContact
      ? (p.medicalRegistrationNumber || 'Not recorded')
      : (p.medicalRegistrationNumber ? `****${String(p.medicalRegistrationNumber).slice(-4)}` : 'Not recorded');

    // Protect confidential family location for unauthorized callers
    const familyLocationDisplay = canViewPrivateContact
      ? (fam.familyLocation || 'Not recorded')
      : (fam.familyLocation ? 'Confidential (Admin review only)' : 'Not recorded');

    // Subscription status: never invent status or country, accurately record DB values or 'Not recorded'
    const planName = s.plan ? String(s.plan) : 'FREE';
    const subStatus = s.status ? String(s.status) : 'Not recorded';
    const subExpiry = formatDate(s.expiryDate);

    return [
      String(u._id),
      p.candidateId || 'Not recorded',
      p.displayName || u.fullName || 'Not recorded',
      p.gender || u.gender || 'Not recorded',
      canViewPrivateContact ? (u.email || 'Not recorded') : maskEmail(u.email),
      canViewPrivateContact ? (u.mobile || 'Not recorded') : maskMobile(u.mobile),
      formatDate(p.dob),
      calculateAge(p.dob),
      p.height || 'Not recorded',
      p.maritalStatus || 'Not recorded',
      p.religion || 'Not recorded',
      p.caste || 'Not recorded',
      p.subCaste || 'Not recorded',
      p.motherTongue || 'Not recorded',
      p.city || 'Not recorded',
      p.state || 'Not recorded',
      p.country || 'Not recorded',
      p.currentLocation?.pincode || 'Not recorded',
      p.workLocation || 'Not recorded',
      p.education || 'Not recorded',
      p.degree || 'Not recorded',
      p.profession || 'Not recorded',
      p.company || 'Not recorded',
      p.annualIncome || 'Not recorded',
      p.medicalCollege || 'Not recorded',
      p.medicalUniversity || 'Not recorded',
      medRegNo,
      p.medicalCouncil || 'Not recorded',
      p.registrationState || 'Not recorded',
      p.registrationYear || 'Not recorded',
      p.medicalExperience || 'Not recorded',
      p.currentHospital || 'Not recorded',
      p.additionalQualification || 'Not recorded',
      fam.familyType || p.familyType || 'Not recorded',
      fam.fatherProfession || p.fatherOccupation || 'Not recorded',
      fam.motherProfession || p.motherOccupation || 'Not recorded',
      fam.familyStatus || 'Not recorded',
      familyLocationDisplay,
      prefAge,
      prefHeight,
      partnerExp.qualification || 'Not recorded',
      partnerExp.location?.city || partnerExp.location?.state || 'Not recorded',
      u.isActive ? 'Active' : 'Inactive',
      regStatus,
      u.verificationStatus || p.verificationStatus || 'UNVERIFIED',
      planName,
      subStatus,
      subExpiry,
      formatDate(u.createdAt),
      formatDate(p.createdAt),
      formatDate(u.lastActiveAt || p.lastActiveAt || u.updatedAt),
    ];
  });
}

/**
 * Build flat data rows for incomplete registrations
 */
export function buildIncompleteRegistrationRows(
  registrations: any[],
  userMap: Map<string, any>,
  canViewPrivateContact: boolean
): (string | number | null | undefined)[][] {
  return registrations.map((r) => {
    const linkedUser = r.user ? userMap.get(String(r.user)) : null;
    const basic = r.stepData?.basicInfo || {};

    const rawEmail = r.email || basic.email || linkedUser?.email;
    const rawMobile = r.mobile || basic.mobile || linkedUser?.mobile;

    const emailDisplay = canViewPrivateContact
      ? (rawEmail || 'Not recorded')
      : maskEmail(rawEmail);

    const mobileDisplay = canViewPrivateContact
      ? (rawMobile || 'Not recorded')
      : maskMobile(rawMobile);

    const genderDisplay =
      r.gender || basic.gender || (linkedUser && linkedUser.gender) || 'Not recorded';

    const accountStatusDisplay = linkedUser
      ? (linkedUser.isActive ? 'Active User' : 'Inactive User')
      : 'Draft - No User Account';

    return [
      r.registrationId,
      r.user ? String(r.user) : 'Not registered',
      r.candidateName || basic.fullName || 'Not recorded',
      emailDisplay,
      mobileDisplay,
      genderDisplay,
      `Step ${r.currentStep || 1} of ${r.totalSteps || 4}`,
      `${r.completionPercentage || 0}%`,
      getMissingRequiredSections(r),
      'Unverified (Draft)',
      accountStatusDisplay,
      formatDate(r.startedAt || r.createdAt),
      formatDate(r.lastActiveAt || r.updatedAt),
    ];
  });
}

/**
 * Main Controller: Export candidate data to CSV or Excel (.xlsx)
 * GET or POST /api/admin/export/candidates
 *
 * ─── Permission Model ────────────────────────────────────────────────────────
 *
 * Export access (one of the following permissions is required):
 *   • 'all'               — super-admin; unrestricted access to all features
 *   • 'export.candidates' — dedicated narrowly scoped export permission (preferred)
 *   • 'users'             — broad user-management permission (legacy)
 *   • 'manage_users'      — legacy user-management naming
 *   • 'view_reports'      — reporting access
 *   • 'reports'           — alternate reporting naming
 *
 * Private / sensitive field access (SEPARATE from export access):
 *   • 'all'               — super-admin; always sees unmasked contact & medical data
 *   • 'privateInfo.view'  — explicitly grants unmasked email, mobile,
 *                           medicalRegistrationNumber, and familyLocation
 *
 *   Without 'all' or 'privateInfo.view', the following fields are masked:
 *     - Email               → first 2 chars + *** + @domain
 *     - Mobile              → first 3 digits + **** + last 3 digits
 *     - Medical Reg. Number → ****<last 4 chars>
 *     - Family Location     → 'Confidential (Admin review only)'
 *
 * Authorization is verified server-side on every request; UI visibility is
 * not relied upon to enforce access control.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function exportCandidateData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const format = String(req.query.format || req.body?.format || 'xlsx').toLowerCase();
    const type = String(req.query.type || req.body?.type || 'active').toLowerCase(); // 'active' | 'incomplete' | 'all' | 'filtered'

    if (!['xlsx', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Supported formats are "xlsx" and "csv".',
      });
    }

    if (!['active', 'incomplete', 'all', 'filtered'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export type. Supported types are "active", "incomplete", "all", or "filtered".',
      });
    }

    // 1. Enforce strict server-side authentication & authorization
    const callerId = req.user?.userId || req.user?._id || req.user?.id;
    const verifiedEmail = req.user?.email;

    if (!req.user || !callerId || !verifiedEmail) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Verified administrator credentials missing.',
      });
    }

    // Explicit lookup against Admin collection
    const callerAdmin = await Admin.findOne({ user: callerId });
    if (!callerAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator record not found.',
      });
    }

    const callerPerms: string[] = Array.isArray(callerAdmin.permissions)
      ? callerAdmin.permissions
      : [];

    const isSuperAdmin = callerPerms.includes('all');
    const isAuthorized =
      isSuperAdmin ||
      callerPerms.includes('export.candidates') ||
      callerPerms.includes('users') ||
      callerPerms.includes('manage_users') ||
      callerPerms.includes('view_reports') ||
      callerPerms.includes('reports');

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions to export candidate data.',
      });
    }

    const canViewPrivateContact = isSuperAdmin || callerPerms.includes('privateInfo.view');

    // 2. Resolve client IP via Express trust-proxy config (req.ip), which correctly
    //    interprets X-Forwarded-For only if app.set('trust proxy', ...) is configured.
    //    Never blindly trust the raw X-Forwarded-For header, as that allows IP spoofing
    //    when the application sits behind an untrusted or unvalidated proxy chain.
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

    const shouldExportActive = type === 'active' || type === 'all' || type === 'filtered';
    const shouldExportIncomplete = type === 'incomplete' || type === 'all';

    let activeCandidateRows: (string | number | null | undefined)[][] = [];
    let incompleteRows: (string | number | null | undefined)[][] = [];

    // Query filters for users
    const userQuery: any = { role: 'user' }; // Candidate exports ALWAYS strictly scoped to candidate accounts (role: 'user')

    // Incomplete registration query
    const regQuery: any = {
      status: { $in: ['STARTED', 'IN_PROGRESS', 'ABANDONED'] },
      isDeleted: false,
    };

    let regStatusFilter: string | undefined;

    // 3. Validate query filters for filtered export
    if (type === 'filtered') {
      const { search, role, status, gender, registrationStatus } = {
        ...req.query,
        ...req.body,
      };

      // Validate role filter: Candidate exports ONLY allow candidate accounts ('user')
      if (role && role !== 'user' && role !== 'all') {
        return res.status(400).json({
          success: false,
          message: `Invalid role filter "${role}". Candidate exports only support candidate accounts (role: "user").`,
        });
      }

      // Validate status filter
      if (status && !['all', 'active', 'inactive'].includes(String(status).toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter "${status}". Supported values are "all", "active", or "inactive".`,
        });
      }

      // Validate registrationStatus filter
      if (
        registrationStatus &&
        !['all', 'complete', 'incomplete', 'pending'].includes(String(registrationStatus).toLowerCase())
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid registrationStatus filter "${registrationStatus}". Supported values are "all", "complete", "incomplete", or "pending".`,
        });
      }

      regStatusFilter = registrationStatus ? String(registrationStatus).toLowerCase() : undefined;

      if (status === 'active') {
        userQuery.isActive = true;
      } else if (status === 'inactive') {
        userQuery.isActive = false;
      }

      if (search) {
        const searchStr = String(search).trim();
        const safeSearch = escapeRegex(searchStr);
        const orConditions: any[] = [
          { fullName: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } },
          { mobile: { $regex: safeSearch, $options: 'i' } },
        ];
        if (isValidObjectId(searchStr)) {
          orConditions.push({ _id: searchStr });
        }
        userQuery.$or = orConditions;
      }

      // Gender filter: check both Profile and User records
      if (gender && gender !== 'all') {
        if (gender === 'not_recorded' || gender === 'Not recorded') {
          const [profilesWithGender, usersWithGender] = await Promise.all([
            Profile.find({ gender: { $exists: true, $ne: null } }).select('user').lean(),
            User.find({ gender: { $exists: true, $ne: null } }).select('_id').lean(),
          ]);
          const recordedIds = Array.from(new Set([
            ...profilesWithGender.map((p: any) => String(p.user)),
            ...usersWithGender.map((u: any) => String(u._id)),
          ]));
          userQuery._id = { $nin: recordedIds };
        } else {
          const safeGenderRegex = new RegExp(`^${escapeRegex(String(gender))}$`, 'i');
          const [profilesWithGender, usersWithGender] = await Promise.all([
            Profile.find({ gender: safeGenderRegex }).select('user').lean(),
            User.find({ gender: safeGenderRegex }).select('_id').lean(),
          ]);
          const genderUserIds = Array.from(new Set([
            ...profilesWithGender.map((p: any) => String(p.user)),
            ...usersWithGender.map((u: any) => String(u._id)),
          ]));
          userQuery._id = { $in: genderUserIds };
        }
      }
    } else if (type === 'active') {
      userQuery.isActive = true;
    }

    // 4. Pre-flight count check to guard against oversized exports and memory exhaustion
    let activeCount = 0;
    if (shouldExportActive) {
      activeCount = await User.countDocuments(userQuery);
    }

    let incompleteCount = 0;
    if (shouldExportIncomplete) {
      incompleteCount = await Registration.countDocuments(regQuery);
    }

    const totalMatchingCount = activeCount + incompleteCount;
    if (totalMatchingCount > MAX_EXPORT_ROWS) {
      return res.status(400).json({
        success: false,
        message: `Export exceeds maximum allowed limit of ${MAX_EXPORT_ROWS} records (found ${totalMatchingCount}). Please refine your filters or request an authorized asynchronous export batch.`,
        data: {
          totalMatching: totalMatchingCount,
          maxAllowed: MAX_EXPORT_ROWS,
        },
      });
    }

    // 5. Fetch and process Active Candidates (or filtered users)
    if (shouldExportActive) {
      // Fetch users with a hard upper-bound limit to guard against count/fetch race conditions.
      // Using MAX_EXPORT_ROWS + 1 lets us detect the race: if rows.length > MAX_EXPORT_ROWS,
      // new records were inserted between the count check and the fetch.
      const users = await User.find(userQuery)
        .sort({ createdAt: -1 })
        .limit(MAX_EXPORT_ROWS + 1)
        .lean();

      if (users.length > MAX_EXPORT_ROWS) {
        return res.status(400).json({
          success: false,
          message:
            `Export size changed during processing (count/fetch race). ` +
            `Please retry with stricter filters or request an authorized asynchronous export.`,
          data: { maxAllowed: MAX_EXPORT_ROWS },
        });
      }

      const userIds = users.map((u: any) => u._id);

      // Concurrently fetch matching profiles, subscriptions, and registrations
      const [profiles, subscriptions, registrations] = await Promise.all([
        Profile.find({ user: { $in: userIds } }).lean(),
        Subscription.find({ user: { $in: userIds } }).sort({ createdAt: -1 }).lean(),
        Registration.find({ user: { $in: userIds }, isDeleted: false }).sort({ updatedAt: -1 }).lean(),
      ]);

      const profileMap = new Map(profiles.map((p: any) => [String(p.user), p]));
      const subscriptionMap = new Map();
      for (const s of subscriptions) {
        const uId = String((s as any).user);
        if (!subscriptionMap.has(uId)) {
          subscriptionMap.set(uId, s);
        }
      }

      const registrationMap = new Map();
      for (const r of registrations) {
        const uId = String((r as any).user);
        if (!registrationMap.has(uId)) {
          registrationMap.set(uId, r);
        }
      }

      // If registrationStatus filter applied in filtered export
      let filteredUsers = users;
      if (regStatusFilter === 'complete') {
        filteredUsers = users.filter((u: any) => {
          const id = String(u._id);
          return determineRegistrationStatus(profileMap.get(id), registrationMap.get(id)) === 'Complete';
        });
      } else if (regStatusFilter === 'incomplete') {
        filteredUsers = users.filter((u: any) => {
          const id = String(u._id);
          return determineRegistrationStatus(profileMap.get(id), registrationMap.get(id)) === 'Incomplete';
        });
      } else if (regStatusFilter === 'pending') {
        filteredUsers = users.filter((u: any) => {
          const id = String(u._id);
          return determineRegistrationStatus(profileMap.get(id), registrationMap.get(id)) === 'Pending';
        });
      }

      activeCandidateRows = buildActiveCandidateRows(
        filteredUsers,
        profileMap,
        subscriptionMap,
        canViewPrivateContact,
        registrationMap
      );
    }

    // 6. Fetch and process Incomplete Registrations
    if (shouldExportIncomplete) {
      // Apply the same bounded fetch guard used for active candidates.
      const registrations = await Registration.find(regQuery)
        .sort({ lastActiveAt: -1 })
        .limit(MAX_EXPORT_ROWS + 1)
        .lean();

      if (registrations.length > MAX_EXPORT_ROWS) {
        return res.status(400).json({
          success: false,
          message:
            `Export size changed during processing (count/fetch race). ` +
            `Please retry with stricter filters or request an authorized asynchronous export.`,
          data: { maxAllowed: MAX_EXPORT_ROWS },
        });
      }

      const linkedUserIds = registrations
        .map((r: any) => r.user)
        .filter(Boolean);

      const linkedUsers = await User.find({ _id: { $in: linkedUserIds } }).lean();
      const userMap = new Map(linkedUsers.map((u: any) => [String(u._id), u]));

      incompleteRows = buildIncompleteRegistrationRows(
        registrations,
        userMap,
        canViewPrivateContact
      );
    }

    const totalExported = activeCandidateRows.length + incompleteRows.length;

    // Final row-count guard: if post-processing rows somehow exceed the limit (e.g.,
    // due to a race in the combined 'all' export), abort before transmitting partial data.
    if (totalExported > MAX_EXPORT_ROWS) {
      return res.status(500).json({
        success: false,
        message:
          'Export size exceeded the configured limit after data processing. ' +
          'Export aborted to prevent partial data transmission. Please retry with stricter filters.',
        data: { maxAllowed: MAX_EXPORT_ROWS, actualRows: totalExported },
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10);

    // 7. Generate export file payload (CSV or XLSX) BEFORE recording successful audit.
    // If generation fails (e.g. out of memory, malformed data, compression error),
    // no audit log is recorded with status SUCCESS, and no file is transmitted.
    let fileBuffer: Buffer;
    let contentType: string;
    let filename: string;
    let finalRowCount: number;

    if (format === 'csv') {
      let csvHeaders: string[];
      let csvRows: (string | number | null | undefined)[][];

      if (type === 'incomplete') {
        csvHeaders = INCOMPLETE_REGISTRATION_HEADERS;
        csvRows = incompleteRows;
        filename = `incomplete_registrations_${dateStr}.csv`;
      } else if (type === 'all') {
        // Combined CSV: headers followed by active candidate rows, then mapped incomplete registration rows
        csvHeaders = ACTIVE_CANDIDATE_HEADERS;
        const mappedIncompleteRows: (string | number | null | undefined)[][] = incompleteRows.map((inc) => {
          const mappedRow = new Array(ACTIVE_CANDIDATE_HEADERS.length).fill('Not recorded');
          mappedRow[0] = inc[1]; // User ID
          mappedRow[1] = inc[0]; // Candidate ID -> Reg ID
          mappedRow[2] = inc[2]; // Full Name
          mappedRow[3] = inc[5]; // Gender
          mappedRow[4] = inc[3]; // Email
          mappedRow[5] = inc[4]; // Mobile
          mappedRow[42] = inc[10]; // Account Status
          mappedRow[43] = 'Incomplete'; // Registration Status
          mappedRow[44] = inc[9]; // Verification Status
          mappedRow[45] = 'FREE'; // Membership Plan
          mappedRow[46] = 'Not recorded'; // Subscription Status
          mappedRow[47] = 'Not recorded'; // Expiry Date
          mappedRow[48] = inc[11]; // Started Date
          mappedRow[49] = 'Not created'; // Profile Creation Date
          mappedRow[50] = inc[12]; // Last Activity Date
          return mappedRow;
        });
        csvRows = [...activeCandidateRows, ...mappedIncompleteRows];
        filename = `all_candidate_data_${dateStr}.csv`;
      } else {
        csvHeaders = ACTIVE_CANDIDATE_HEADERS;
        csvRows = activeCandidateRows;
        filename = `active_candidates_${dateStr}.csv`;
      }

      fileBuffer = generateCsv(csvHeaders, csvRows);
      contentType = 'text/csv; charset=utf-8';
      finalRowCount = csvRows.length;
    } else {
      // Excel (.xlsx)
      const sheets: ExcelSheetData[] = [];

      if (shouldExportActive && activeCandidateRows.length >= 0) {
        sheets.push({
          sheetName: type === 'filtered' ? 'Filtered Candidates' : 'Active Candidates',
          headers: ACTIVE_CANDIDATE_HEADERS,
          rows: activeCandidateRows,
        });
      }

      if (shouldExportIncomplete && incompleteRows.length >= 0) {
        sheets.push({
          sheetName: 'Incomplete Registrations',
          headers: INCOMPLETE_REGISTRATION_HEADERS,
          rows: incompleteRows,
        });
      }

      fileBuffer = generateExcelWorkbook(sheets);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `candidates_export_${type}_${dateStr}.xlsx`;
      finalRowCount = totalExported;
    }

    // 8. Mandatory audit log: record verified admin identity, client IP, type, format, record count.
    // Audit log write MUST succeed BEFORE transmitting the generated file.
    // Fails closed if audit record cannot be written.
    try {
      await logExportAction(verifiedEmail, String(callerId), clientIp, type, finalRowCount, format);
    } catch (auditErr: any) {
      console.error('CRITICAL: Export audit logging failed:', auditErr);
      return res.status(500).json({
        success: false,
        message: 'Export failed: Unable to record mandatory audit log. Export aborted to protect data integrity.',
      });
    }

    // 9. Send verified export file ONLY after generation and audit persistence both succeeded
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Total-Count', String(finalRowCount));
    return res.status(200).send(fileBuffer);
  } catch (error) {
    next(error);
  }
}
