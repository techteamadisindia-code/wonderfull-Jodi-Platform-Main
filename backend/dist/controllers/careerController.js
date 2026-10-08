"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeJobOpening = normalizeJobOpening;
exports.normalizeJobOpenings = normalizeJobOpenings;
exports.ensureJobOpeningsTable = ensureJobOpeningsTable;
exports.generateUniqueSlug = generateUniqueSlug;
exports.seedDefaultCareersIfEmpty = seedDefaultCareersIfEmpty;
exports.getPublicCareers = getPublicCareers;
exports.getPublicCareerBySlug = getPublicCareerBySlug;
exports.submitJobApplication = submitJobApplication;
exports.getAdminCareers = getAdminCareers;
exports.getAdminCareerById = getAdminCareerById;
exports.createJobOpening = createJobOpening;
exports.updateJobOpening = updateJobOpening;
exports.updateCareerStatus = updateCareerStatus;
exports.toggleCareerPublish = toggleCareerPublish;
exports.softDeleteCareer = softDeleteCareer;
exports.getJobApplications = getJobApplications;
exports.updateApplicationStatus = updateApplicationStatus;
const JobOpening_1 = require("../models/JobOpening");
const JobApplication_1 = require("../models/JobApplication");
const AuditLog_1 = require("../models/AuditLog");
const securityUtils_1 = require("../utils/securityUtils");
const client_1 = require("../db/client");
/**
 * Helper to record actions in the centralized AuditLog collection
 */
async function logCareerAudit(req, action, details, targetId, extra = {}) {
    try {
        const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
        const adminUserId = req.user?.userId;
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            '127.0.0.1';
        await AuditLog_1.AuditLog.create({
            adminUser: adminUserId,
            adminEmail,
            action,
            targetModel: 'JobOpening',
            targetId: String(targetId),
            previousStatus: extra.previousStatus,
            newStatus: extra.newStatus,
            details,
            ipAddress,
            status: 'SUCCESS',
            metadata: extra.metadata,
        });
    }
    catch (err) {
        console.error('[Career AuditLog] Failed to record audit:', err);
    }
}
/**
 * Helper to convert title to slug and guarantee uniqueness
 */
/**
 * Normalizes JSON array fields on job openings so that responsibilities,
 * requirements, qualifications, skills, and benefits are guaranteed to be
 * clean string arrays (never null, undefined, or unparsed JSON strings).
 */
function normalizeJobOpening(job) {
    if (!job)
        return job;
    const clone = typeof job.toObject === 'function' ? job.toObject() : { ...job };
    const jsonArrayFields = ['responsibilities', 'requirements', 'qualifications', 'skills', 'benefits'];
    for (const field of jsonArrayFields) {
        if (clone[field] === undefined || clone[field] === null) {
            clone[field] = [];
        }
        else if (typeof clone[field] === 'string') {
            try {
                const parsed = JSON.parse(clone[field]);
                clone[field] = Array.isArray(parsed) ? parsed : [clone[field]];
            }
            catch {
                clone[field] = [clone[field]];
            }
        }
        else if (!Array.isArray(clone[field])) {
            clone[field] = [];
        }
    }
    return clone;
}
function normalizeJobOpenings(jobs) {
    if (!Array.isArray(jobs))
        return [];
    return jobs.map(normalizeJobOpening);
}
const CREATE_JOB_OPENINGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS \`job_openings\` (
  \`_id\` VARCHAR(36) NOT NULL,
  \`title\` VARCHAR(150) NOT NULL,
  \`slug\` VARCHAR(150) NOT NULL,
  \`department\` VARCHAR(100) NOT NULL,
  \`location\` VARCHAR(150) NOT NULL,
  \`work_mode\` VARCHAR(50) NOT NULL DEFAULT 'On-site',
  \`employment_type\` VARCHAR(50) NOT NULL DEFAULT 'Full-time',
  \`experience\` VARCHAR(100) DEFAULT '',
  \`salary_range\` VARCHAR(100) DEFAULT '',
  \`short_description\` VARCHAR(300) NOT NULL,
  \`full_description\` TEXT NOT NULL,
  \`responsibilities\` JSON DEFAULT NULL,
  \`requirements\` JSON DEFAULT NULL,
  \`qualifications\` JSON DEFAULT NULL,
  \`skills\` JSON DEFAULT NULL,
  \`benefits\` JSON DEFAULT NULL,
  \`application_email\` VARCHAR(191) DEFAULT 'careers@wonderfuljodi.com',
  \`application_url\` VARCHAR(500) DEFAULT '',
  \`application_deadline\` DATETIME DEFAULT NULL,
  \`status\` VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  \`is_published\` TINYINT(1) NOT NULL DEFAULT 1,
  \`display_order\` INT NOT NULL DEFAULT 0,
  \`created_by\` VARCHAR(100) DEFAULT 'admin',
  \`updated_by\` VARCHAR(100) DEFAULT 'admin',
  \`is_deleted\` TINYINT(1) NOT NULL DEFAULT 0,
  \`deleted_at\` DATETIME DEFAULT NULL,
  \`deleted_by\` VARCHAR(100) DEFAULT NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`_id\`),
  UNIQUE KEY \`job_openings_slug_key\` (\`slug\`),
  KEY \`job_openings_dept_idx\` (\`department\`, \`is_deleted\`),
  KEY \`job_openings_status_idx\` (\`is_deleted\`, \`is_published\`, \`status\`, \`display_order\`, \`created_at\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
async function ensureJobOpeningsTable() {
    try {
        await client_1.prisma.$executeRawUnsafe(CREATE_JOB_OPENINGS_TABLE_SQL);
        return true;
    }
    catch (err) {
        console.warn('[Careers] Could not ensure job_openings table:', err?.message || err);
        return false;
    }
}
async function generateUniqueSlug(title, excludeId) {
    let baseSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!baseSlug) {
        baseSlug = `job-${Date.now()}`;
    }
    let slug = baseSlug;
    let counter = 1;
    while (true) {
        const query = { slug, isDeleted: false };
        if (excludeId) {
            query._id = { $ne: excludeId };
        }
        const existing = await JobOpening_1.JobOpening.findOne(query).select('_id').lean();
        if (!existing) {
            return slug;
        }
        counter += 1;
        slug = `${baseSlug}-${counter}`;
    }
}
/**
 * Seeder to populate standard default doctor-matrimony careers if empty
 */
async function seedDefaultCareersIfEmpty() {
    try {
        const count = await JobOpening_1.JobOpening.countDocuments({ isDeleted: false });
        if (count > 0)
            return;
        console.log('[Careers] Seeding initial Wonderful Jodi job openings...');
        const defaultJobs = [
            {
                title: 'VIP Relationship Manager',
                slug: 'vip-relationship-manager',
                department: 'Client Services',
                location: 'Pune / Mumbai / Hybrid',
                workMode: 'Hybrid',
                employmentType: 'Full-time',
                experience: '2-5 years',
                salaryRange: '₹6,00,000 - ₹9,50,000 P.A. + Performance Incentives',
                shortDescription: 'Provide high-touch personalized matchmaking consultations and confidential matchmaking services for doctors and esteemed medical families.',
                fullDescription: `As a VIP Relationship Manager at Wonderful Jodi, you will serve as the trusted advisor and dedicated matchmaker for premier doctor members and their families across India and globally.

You will understand medical career demands, sub-speciality schedules, and family values to curate highly compatible matches with the utmost discretion and warmth.`,
                responsibilities: [
                    'Manage end-to-end matchmaking portfolios for VIP and Royal tier doctor members.',
                    'Conduct detailed profile discovery calls with doctors and their families.',
                    'Coordinate verified profile introductions, initial meetings, and family discussions.',
                    'Uphold the highest standards of discretion, confidentiality, and professional etiquette.',
                    'Achieve member satisfaction and matchmaking success milestones.',
                ],
                requirements: [
                    'Excellent interpersonal communication and relationship management skills.',
                    'Prior experience in premium client management, hospitality, luxury services, or matchmaking.',
                    'Familiarity with medical professions, hierarchies, and lifestyle expectations is a strong plus.',
                    'Fluency in English and Hindi (regional languages like Marathi or Gujarati are advantageous).',
                ],
                qualifications: [
                    "Bachelor's or Master's degree in Psychology, Communications, Business, or related fields.",
                    'Minimum 2 years of proven client-facing relationship management experience.',
                ],
                skills: ['Client Relations', 'Empathy', 'Confidentiality', 'Communication', 'Scheduling', 'CRM'],
                benefits: [
                    'Competitive fixed salary + attractive success incentives.',
                    'Health insurance coverage for self and family.',
                    'Flexible hybrid work arrangement with travel allowances.',
                    'Opportunities for rapid leadership progression.',
                ],
                applicationEmail: 'careers@wonderfuljodi.com',
                applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                status: 'OPEN',
                isPublished: true,
                displayOrder: 1,
            },
            {
                title: 'Senior Full Stack Engineer',
                slug: 'senior-full-stack-engineer',
                department: 'Engineering',
                location: 'Bengaluru / Remote',
                workMode: 'Remote',
                employmentType: 'Full-time',
                experience: '4-7 years',
                salaryRange: '₹18,00,000 - ₹28,00,000 P.A.',
                shortDescription: 'Architect and build real-time matrimonial features, kundali compatibility systems, and secure communication channels using Next.js, Node.js, and MongoDB.',
                fullDescription: `Wonderful Jodi is scaling rapidly to serve thousands of doctors across India. We are looking for a Senior Full Stack Engineer who takes ownership of building scalable, secure, and delightful user experiences.

You will architect real-time messaging, compatibility matching algorithms, medical degree verification pipelines, and administrative automation tools.`,
                responsibilities: [
                    'Architect robust full-stack features using Next.js 14, React, TypeScript, and Node.js.',
                    'Design scalable MongoDB schemas and optimize high-throughput queries.',
                    'Implement enterprise-grade security for medical document verification and chat encryption.',
                    'Mentor junior developers and participate in design and code reviews.',
                    'Monitor application performance, latency, and reliability metrics.',
                ],
                requirements: [
                    '4+ years of professional full-stack development experience.',
                    'Proficiency with TypeScript, Next.js, React, Node.js, and Express.',
                    'Deep experience with MongoDB indexing, aggregation pipelines, and schema design.',
                    'Familiarity with WebSockets/real-time messaging and cloud deployments.',
                ],
                qualifications: [
                    "B.Tech / B.E. / M.C.A. in Computer Science or equivalent practical experience.",
                ],
                skills: ['TypeScript', 'Next.js', 'Node.js', 'MongoDB', 'React', 'Tailwind CSS', 'Docker'],
                benefits: [
                    '100% remote-first work culture with flexible working hours.',
                    'Generous learning & conference budget.',
                    'Comprehensive health and wellness benefits.',
                    'Annual performance bonuses and equity options.',
                ],
                applicationEmail: 'careers@wonderfuljodi.com',
                applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                status: 'OPEN',
                isPublished: true,
                displayOrder: 2,
            },
            {
                title: 'Compliance & Verification Specialist',
                slug: 'compliance-verification-specialist',
                department: 'Operations & Safety',
                location: 'Pune',
                workMode: 'On-site',
                employmentType: 'Full-time',
                experience: '1-3 years',
                salaryRange: '₹4,50,000 - ₹6,50,000 P.A.',
                shortDescription: 'Verify medical practitioner licenses, National Medical Commission (NMC) registrations, and government IDs to preserve platform authenticity.',
                fullDescription: `At Wonderful Jodi, trust and doctor authenticity are our greatest assets. As a Compliance & Verification Specialist, you are the first line of defense ensuring only genuine doctors, dentists, and verified healthcare professionals join our network.

You will cross-verify state medical council registrations, educational credentials, and identification documents in a secure, privacy-compliant workflow.`,
                responsibilities: [
                    'Verify doctor registration certificates with National Medical Commission (NMC) and State Councils.',
                    'Review government photo IDs and biodata documents for accuracy and authenticity.',
                    'Liaise with members respectfully when document clarifications are needed.',
                    'Identify and flag suspicious or fraudulent registrations immediately.',
                    'Maintain meticulous compliance audit records.',
                ],
                requirements: [
                    'Sharp eye for detail and document authenticity.',
                    'High integrity and strict commitment to user data confidentiality.',
                    'Comfortable using digital verification portals and internal administrative consoles.',
                    'Strong written and spoken communication skills in English and Hindi.',
                ],
                qualifications: [
                    "Bachelor's degree in any discipline (Law, Administration, or Paramedical preferred).",
                    '1+ years of experience in KYC, document verification, or background screening.',
                ],
                skills: ['Document Verification', 'KYC Compliance', 'Attention to Detail', 'Data Confidentiality'],
                benefits: [
                    'Stable career in a mission-driven high-growth brand.',
                    'Health insurance coverage.',
                    'Performance incentives and paid time off.',
                ],
                applicationEmail: 'careers@wonderfuljodi.com',
                applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'OPEN',
                isPublished: true,
                displayOrder: 3,
            },
            {
                title: 'Software Testing Intern',
                slug: 'software-testing-intern',
                department: 'Quality Assurance',
                location: 'Pune / Hybrid',
                workMode: 'Hybrid',
                employmentType: 'Internship',
                experience: 'Fresher / Final Year Student',
                salaryRange: '₹15,000 - ₹25,000 / Month Stipend',
                shortDescription: 'Test core matching algorithms, responsive layouts across devices, and automated test suites for India’s top doctor matrimony app.',
                fullDescription: `Join our engineering team as a Software Testing Intern and gain hands-on experience in manual, API, and automated QA testing.

You will test critical matrimony user flows including registration, kundali matchmaking, real-time chats, and payment gateways across Android, iOS, and desktop web browsers.`,
                responsibilities: [
                    'Execute test plans for new features, bug fixes, and responsive redesigns.',
                    'Perform cross-browser and cross-device usability testing.',
                    'Write clear, reproducible bug reports with steps and screenshots.',
                    'Collaborate directly with full-stack engineers to verify bug resolutions.',
                ],
                requirements: [
                    'Understanding of software testing lifecycle (STLC) and web technologies.',
                    'Analytical mindset and methodical approach to finding edge-case bugs.',
                    'Familiarity with Postman, Chrome DevTools, and basic JavaScript/TypeScript is a plus.',
                ],
                qualifications: [
                    'Currently pursuing or recently completed B.Tech / B.E. / BCA / MCA in Computer Science.',
                ],
                skills: ['Manual Testing', 'API Testing', 'Bug Tracking', 'Mobile Responsive QA', 'Postman'],
                benefits: [
                    'Paid monthly stipend.',
                    'Mentorship from senior engineers.',
                    'High pre-placement offer (PPO) conversion probability based on performance.',
                ],
                applicationEmail: 'careers@wonderfuljodi.com',
                applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'OPEN',
                isPublished: true,
                displayOrder: 4,
            },
            {
                title: 'Customer Support Executive',
                slug: 'customer-support-executive',
                department: 'Customer Support',
                location: 'Mumbai / On-site',
                workMode: 'On-site',
                employmentType: 'Full-time',
                experience: '1-3 years',
                salaryRange: '₹3,50,000 - ₹5,00,000 P.A.',
                shortDescription: 'Guide doctors and their families with empathetic phone, chat, and email support for onboarding, photo uploads, and membership queries.',
                fullDescription: `Doctor families value prompt, polite, and reassuring assistance. As a Customer Support Executive, you will be the friendly voice assisting users with everything from profile completion and photo uploads to subscription queries.`,
                responsibilities: [
                    'Handle inbound inquiries via call, WhatsApp, and email with warmth and clarity.',
                    'Assist busy medical professionals in completing their matrimonial profiles.',
                    'Address technical queries, payment confirmation, and membership tier benefits.',
                    'Collect user feedback and advocate for product improvements.',
                ],
                requirements: [
                    'Empathetic, patient, and polite phone and written demeanor.',
                    'Fluent in English, Hindi, and at least one regional language.',
                    'Experience in customer service or tech support in consumer platforms.',
                ],
                qualifications: [
                    "Bachelor's degree in any discipline.",
                    '1+ years in customer care, tele-support, or client onboarding.',
                ],
                skills: ['Customer Support', 'Telephonic Communication', 'Active Listening', 'CRM Tools'],
                benefits: [
                    'Fixed competitive salary with monthly customer happiness incentives.',
                    'Medical insurance coverage.',
                    'Friendly, doctor-centric working culture.',
                ],
                applicationEmail: 'careers@wonderfuljodi.com',
                applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                status: 'OPEN',
                isPublished: true,
                displayOrder: 5,
            },
        ];
        await JobOpening_1.JobOpening.insertMany(defaultJobs);
        console.log(`[Careers] Successfully seeded ${defaultJobs.length} initial job openings.`);
    }
    catch (error) {
        console.error('[Careers] Error seeding default careers:', error);
    }
}
// ─────────────────────────────────────────────────────────────
// 1. PUBLIC CAREER ENDPOINTS
// ─────────────────────────────────────────────────────────────
/**
 * GET /api/careers
 * Returns published, open, and non-deleted job openings
 */
async function getPublicCareers(req, res, next) {
    try {
        const { department, workMode, employmentType, search, page = '1', limit = '20' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;
        const query = {
            isDeleted: false,
            isPublished: true,
            status: 'OPEN',
        };
        if (department && typeof department === 'string' && department !== 'All') {
            query.department = department.trim();
        }
        if (workMode && typeof workMode === 'string' && workMode !== 'All') {
            query.workMode = workMode.trim();
        }
        if (employmentType && typeof employmentType === 'string' && employmentType !== 'All') {
            query.employmentType = employmentType.trim();
        }
        if (search && typeof search === 'string' && search.trim().length > 0) {
            const sanitized = (0, securityUtils_1.escapeRegex)(search.trim());
            query.$or = [
                { title: { $regex: sanitized, $options: 'i' } },
                { department: { $regex: sanitized, $options: 'i' } },
                { location: { $regex: sanitized, $options: 'i' } },
                { shortDescription: { $regex: sanitized, $options: 'i' } },
            ];
        }
        let total = 0;
        let rawJobs = [];
        let departments = [];
        try {
            const [totalCount, jobsList, deptList] = await Promise.all([
                JobOpening_1.JobOpening.countDocuments(query),
                JobOpening_1.JobOpening.find(query)
                    .select('title slug department location workMode employmentType experience salaryRange shortDescription fullDescription responsibilities requirements qualifications skills benefits applicationDeadline status createdAt displayOrder')
                    .sort({ displayOrder: 1, createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                JobOpening_1.JobOpening.distinct('department', { isDeleted: false, isPublished: true, status: 'OPEN' }),
            ]);
            total = totalCount;
            rawJobs = jobsList;
            departments = deptList;
        }
        catch (dbErr) {
            const msg = String(dbErr?.message || '');
            if (msg.includes("job_openings' doesn't exist") || msg.includes('does not exist in the current database')) {
                console.warn('[Careers] job_openings table missing during getPublicCareers query, returning empty set.');
                return res.json({
                    success: true,
                    data: [],
                    departments: [],
                    pagination: {
                        total: 0,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: 1,
                    },
                });
            }
            throw dbErr;
        }
        const jobs = normalizeJobOpenings(rawJobs);
        return res.json({
            success: true,
            data: jobs,
            departments: departments.sort(),
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/careers/:slug
 * Returns complete details for one published job opening
 */
async function getPublicCareerBySlug(req, res, next) {
    try {
        const { slug } = req.params;
        if (!slug || typeof slug !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid job opening identifier' });
        }
        let rawJob = null;
        try {
            rawJob = await JobOpening_1.JobOpening.findOne({
                slug: slug.trim().toLowerCase(),
                isDeleted: false,
                isPublished: true,
            })
                .select('-isDeleted -deletedAt -deletedBy -__v')
                .lean();
        }
        catch (dbErr) {
            const msg = String(dbErr?.message || '');
            if (msg.includes("job_openings' doesn't exist") || msg.includes('does not exist in the current database')) {
                return res.status(404).json({
                    success: false,
                    message: 'Job opening not found or is no longer available.',
                });
            }
            throw dbErr;
        }
        if (!rawJob) {
            return res.status(404).json({
                success: false,
                message: 'Job opening not found or is no longer available.',
            });
        }
        const job = normalizeJobOpening(rawJob);
        return res.json({
            success: true,
            data: job,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /api/careers/:slug/apply
 * Allows candidate to submit an application
 */
async function submitJobApplication(req, res, next) {
    try {
        const { slug } = req.params;
        const { candidateName, email, mobile, experienceYears, resumeUrl, coverLetter } = req.body;
        const job = await JobOpening_1.JobOpening.findOne({
            slug: slug.trim().toLowerCase(),
            isDeleted: false,
            isPublished: true,
            status: 'OPEN',
        });
        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'This job opening is closed or no longer accepting applications.',
            });
        }
        // Validation
        if (!candidateName || typeof candidateName !== 'string' || candidateName.trim().length < 2) {
            return res.status(422).json({ success: false, message: 'Please provide your full name.' });
        }
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!email || !emailRegex.test(email.trim())) {
            return res.status(422).json({ success: false, message: 'Please provide a valid email address.' });
        }
        if (!mobile || typeof mobile !== 'string' || mobile.trim().length < 8) {
            return res.status(422).json({ success: false, message: 'Please provide a valid contact number.' });
        }
        // Check for recent duplicate application for the same job and email
        const existing = await JobApplication_1.JobApplication.findOne({
            jobId: job._id,
            email: email.trim().toLowerCase(),
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted an application for this position recently.',
            });
        }
        const application = await JobApplication_1.JobApplication.create({
            jobId: job._id,
            jobTitle: job.title,
            candidateName: candidateName.trim(),
            email: email.trim().toLowerCase(),
            mobile: mobile.trim(),
            experienceYears: experienceYears ? String(experienceYears).trim() : '',
            resumeUrl: resumeUrl ? String(resumeUrl).trim() : '',
            coverLetter: coverLetter ? String(coverLetter).trim() : '',
            status: 'RECEIVED',
        });
        return res.status(201).json({
            success: true,
            message: 'Your application has been received successfully. Our team will review your profile.',
            data: {
                applicationId: application._id,
                jobTitle: job.title,
                status: application.status,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
// ─────────────────────────────────────────────────────────────
// 2. ADMIN CAREER MANAGEMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────
/**
 * GET /api/admin/careers
 * Returns all job openings with summary statistics and application counts
 */
async function getAdminCareers(req, res, next) {
    try {
        const { status, department, workMode, isPublished, search, page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (pageNum - 1) * limitNum;
        const query = { isDeleted: false };
        if (status && typeof status === 'string' && status !== 'ALL') {
            query.status = status;
        }
        if (department && typeof department === 'string' && department !== 'ALL') {
            query.department = department;
        }
        if (workMode && typeof workMode === 'string' && workMode !== 'ALL') {
            query.workMode = workMode;
        }
        if (isPublished !== undefined && isPublished !== 'ALL' && isPublished !== '') {
            query.isPublished = isPublished === 'true';
        }
        if (search && typeof search === 'string' && search.trim().length > 0) {
            const sanitized = (0, securityUtils_1.escapeRegex)(search.trim());
            query.$or = [
                { title: { $regex: sanitized, $options: 'i' } },
                { department: { $regex: sanitized, $options: 'i' } },
                { location: { $regex: sanitized, $options: 'i' } },
                { slug: { $regex: sanitized, $options: 'i' } },
            ];
        }
        // Run summary metrics and filtered queries concurrently
        let statsAggregate = [];
        let total = 0;
        let rawJobs = [];
        let departments = [];
        try {
            const [statsResult, totalCount, jobsList, deptList] = await Promise.all([
                JobOpening_1.JobOpening.aggregate([
                    { $match: { isDeleted: false } },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            published: { $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] } },
                            draft: { $sum: { $cond: [{ $eq: ['$status', 'DRAFT'] }, 1, 0] } },
                            open: { $sum: { $cond: [{ $eq: ['$status', 'OPEN'] }, 1, 0] } },
                            closed: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
                            archived: { $sum: { $cond: [{ $eq: ['$status', 'ARCHIVED'] }, 1, 0] } },
                        },
                    },
                ]),
                JobOpening_1.JobOpening.countDocuments(query),
                JobOpening_1.JobOpening.find(query)
                    .sort({ displayOrder: 1, createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                JobOpening_1.JobOpening.distinct('department', { isDeleted: false }),
            ]);
            statsAggregate = statsResult;
            total = totalCount;
            rawJobs = jobsList;
            departments = deptList;
        }
        catch (dbErr) {
            const msg = String(dbErr?.message || '');
            if (msg.includes("job_openings' doesn't exist") || msg.includes('does not exist in the current database')) {
                return res.json({
                    success: true,
                    stats: { total: 0, published: 0, draft: 0, open: 0, closed: 0, archived: 0 },
                    departments: [],
                    data: [],
                    pagination: { total: 0, page: pageNum, limit: limitNum, totalPages: 1 },
                });
            }
            throw dbErr;
        }
        const stats = statsAggregate[0] || {
            total: 0,
            published: 0,
            draft: 0,
            open: 0,
            closed: 0,
            archived: 0,
        };
        const jobs = normalizeJobOpenings(rawJobs);
        // Attach application counts to each job
        const jobIds = jobs.map((j) => j._id);
        let applicationCounts = [];
        try {
            applicationCounts = await JobApplication_1.JobApplication.aggregate([
                { $match: { jobId: { $in: jobIds } } },
                { $group: { _id: '$jobId', count: { $sum: 1 } } },
            ]);
        }
        catch {
            applicationCounts = [];
        }
        const countMap = new Map();
        applicationCounts.forEach((ac) => {
            countMap.set(String(ac._id), ac.count);
        });
        const enrichedJobs = jobs.map((job) => ({
            ...job,
            applicationsCount: countMap.get(String(job._id)) || 0,
        }));
        return res.json({
            success: true,
            stats: {
                total: stats.total,
                published: stats.published,
                draft: stats.draft,
                open: stats.open,
                closed: stats.closed,
                archived: stats.archived,
            },
            departments: departments.sort(),
            data: enrichedJobs,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/admin/careers/:id
 * Complete details for a single job opening
 */
async function getAdminCareerById(req, res, next) {
    try {
        const { id } = req.params;
        const rawJob = await JobOpening_1.JobOpening.findOne({ _id: id, isDeleted: false }).lean();
        if (!rawJob) {
            return res.status(404).json({ success: false, message: 'Job opening not found' });
        }
        const job = normalizeJobOpening(rawJob);
        let applicationsCount = 0;
        try {
            applicationsCount = await JobApplication_1.JobApplication.countDocuments({ jobId: id });
        }
        catch {
            applicationsCount = 0;
        }
        return res.json({
            success: true,
            data: {
                ...job,
                applicationsCount,
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * POST /api/admin/careers
 * Creates a new job opening
 */
async function createJobOpening(req, res, next) {
    try {
        const { title, slug: customSlug, department, location, workMode = 'On-site', employmentType = 'Full-time', experience = '', salaryRange = '', shortDescription, fullDescription, responsibilities = [], requirements = [], qualifications = [], skills = [], benefits = [], applicationEmail = 'careers@wonderfuljodi.com', applicationUrl = '', applicationDeadline, status = 'OPEN', isPublished = true, displayOrder = 0, } = req.body;
        // Field validations
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(422).json({ success: false, message: 'Job title is required.' });
        }
        if (!department || typeof department !== 'string' || department.trim().length === 0) {
            return res.status(422).json({ success: false, message: 'Department is required.' });
        }
        if (!location || typeof location !== 'string' || location.trim().length === 0) {
            return res.status(422).json({ success: false, message: 'Location is required.' });
        }
        if (!shortDescription || typeof shortDescription !== 'string' || shortDescription.trim().length === 0) {
            return res.status(422).json({ success: false, message: 'Short description is required.' });
        }
        if (!fullDescription || typeof fullDescription !== 'string' || fullDescription.trim().length === 0) {
            return res.status(422).json({ success: false, message: 'Full description is required.' });
        }
        const validWorkModes = ['On-site', 'Hybrid', 'Remote'];
        if (!validWorkModes.includes(workMode)) {
            return res.status(422).json({
                success: false,
                message: `Work mode must be one of: ${validWorkModes.join(', ')}`,
            });
        }
        const validEmploymentTypes = ['Full-time', 'Part-time', 'Internship', 'Contract'];
        if (!validEmploymentTypes.includes(employmentType)) {
            return res.status(422).json({
                success: false,
                message: `Employment type must be one of: ${validEmploymentTypes.join(', ')}`,
            });
        }
        // Deadline validation: If newly published, cannot be in the past
        let parsedDeadline = null;
        if (applicationDeadline) {
            parsedDeadline = new Date(applicationDeadline);
            if (isNaN(parsedDeadline.getTime())) {
                return res.status(422).json({ success: false, message: 'Application deadline must be a valid date.' });
            }
            if (isPublished && parsedDeadline.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
                return res.status(422).json({
                    success: false,
                    message: 'Application deadline cannot be in the past for published openings.',
                });
            }
        }
        // Email validation if supplied
        if (applicationEmail && !/^\S+@\S+\.\S+$/.test(applicationEmail.trim())) {
            return res.status(422).json({ success: false, message: 'Please provide a valid application email address.' });
        }
        // URL validation if supplied
        if (applicationUrl && !/^https?:\/\/.+/.test(applicationUrl.trim())) {
            return res.status(422).json({ success: false, message: 'Please provide a valid application URL (must start with http:// or https://).' });
        }
        // Generate guaranteed unique slug
        const finalSlug = customSlug && customSlug.trim()
            ? await generateUniqueSlug(customSlug)
            : await generateUniqueSlug(title);
        const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
        const newJob = await JobOpening_1.JobOpening.create({
            title: title.trim(),
            slug: finalSlug,
            department: department.trim(),
            location: location.trim(),
            workMode,
            employmentType,
            experience: experience.trim(),
            salaryRange: salaryRange.trim(),
            shortDescription: shortDescription.trim(),
            fullDescription: fullDescription.trim(),
            responsibilities: Array.isArray(responsibilities) ? responsibilities.map((r) => String(r).trim()).filter(Boolean) : [],
            requirements: Array.isArray(requirements) ? requirements.map((r) => String(r).trim()).filter(Boolean) : [],
            qualifications: Array.isArray(qualifications) ? qualifications.map((q) => String(q).trim()).filter(Boolean) : [],
            skills: Array.isArray(skills) ? skills.map((s) => String(s).trim()).filter(Boolean) : [],
            benefits: Array.isArray(benefits) ? benefits.map((b) => String(b).trim()).filter(Boolean) : [],
            applicationEmail: applicationEmail.trim().toLowerCase(),
            applicationUrl: applicationUrl.trim(),
            applicationDeadline: parsedDeadline,
            status,
            isPublished: Boolean(isPublished),
            displayOrder: parseInt(displayOrder, 10) || 0,
            createdBy: adminEmail,
            updatedBy: adminEmail,
        });
        await logCareerAudit(req, 'CREATED_JOB_OPENING', `Created job opening "${newJob.title}" (${newJob.slug}) in ${newJob.department}`, String(newJob._id), { newStatus: newJob.status });
        return res.status(201).json({
            success: true,
            message: 'Job opening created successfully',
            data: normalizeJobOpening(newJob),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * PATCH /api/admin/careers/:id
 * Updates an existing job opening
 */
async function updateJobOpening(req, res, next) {
    try {
        const { id } = req.params;
        const updates = req.body;
        const existingJob = await JobOpening_1.JobOpening.findOne({ _id: id, isDeleted: false });
        if (!existingJob) {
            return res.status(404).json({ success: false, message: 'Job opening not found' });
        }
        // Slug check if changing
        if (updates.slug && updates.slug.trim().toLowerCase() !== existingJob.slug) {
            updates.slug = await generateUniqueSlug(updates.slug, String(existingJob._id));
        }
        if (updates.workMode) {
            const validWorkModes = ['On-site', 'Hybrid', 'Remote'];
            if (!validWorkModes.includes(updates.workMode)) {
                return res.status(422).json({ success: false, message: 'Invalid work mode provided.' });
            }
        }
        if (updates.employmentType) {
            const validEmploymentTypes = ['Full-time', 'Part-time', 'Internship', 'Contract'];
            if (!validEmploymentTypes.includes(updates.employmentType)) {
                return res.status(422).json({ success: false, message: 'Invalid employment type provided.' });
            }
        }
        if (updates.applicationDeadline) {
            const parsedDeadline = new Date(updates.applicationDeadline);
            if (isNaN(parsedDeadline.getTime())) {
                return res.status(422).json({ success: false, message: 'Application deadline must be a valid date.' });
            }
            updates.applicationDeadline = parsedDeadline;
        }
        const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
        updates.updatedBy = adminEmail;
        const updatedJob = await JobOpening_1.JobOpening.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
        await logCareerAudit(req, 'UPDATED_JOB_OPENING', `Updated job opening "${updatedJob?.title}"`, String(id), {
            previousStatus: existingJob.status,
            newStatus: updatedJob?.status,
            metadata: { changedFields: Object.keys(updates) },
        });
        return res.json({
            success: true,
            message: 'Job opening updated successfully',
            data: normalizeJobOpening(updatedJob),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * PATCH /api/admin/careers/:id/status
 * Quick action to change status (OPEN, CLOSED, DRAFT, ARCHIVED)
 */
async function updateCareerStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['OPEN', 'CLOSED', 'DRAFT', 'ARCHIVED'];
        if (!validStatuses.includes(status)) {
            return res.status(422).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(', ')}`,
            });
        }
        const existingJob = await JobOpening_1.JobOpening.findOne({ _id: id, isDeleted: false });
        if (!existingJob) {
            return res.status(404).json({ success: false, message: 'Job opening not found' });
        }
        const previousStatus = existingJob.status;
        existingJob.status = status;
        existingJob.updatedBy = req.user?.email || 'admin@wonderfuljodi.com';
        await existingJob.save();
        await logCareerAudit(req, 'STATUS_CHANGED_JOB_OPENING', `Changed status of "${existingJob.title}" from ${previousStatus} to ${status}`, String(id), { previousStatus, newStatus: status });
        return res.json({
            success: true,
            message: `Status changed to ${status}`,
            data: normalizeJobOpening(existingJob),
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * PATCH /api/admin/careers/:id/publish
 * Quick toggle to publish or unpublish
 */
async function toggleCareerPublish(req, res, next) {
    try {
        const { id } = req.params;
        const { isPublished } = req.body;
        if (typeof isPublished !== 'boolean') {
            return res.status(422).json({ success: false, message: 'isPublished must be a boolean' });
        }
        const existingJob = await JobOpening_1.JobOpening.findOne({ _id: id, isDeleted: false });
        if (!existingJob) {
            return res.status(404).json({ success: false, message: 'Job opening not found' });
        }
        existingJob.isPublished = isPublished;
        existingJob.updatedBy = req.user?.email || 'admin@wonderfuljodi.com';
        await existingJob.save();
        await logCareerAudit(req, isPublished ? 'PUBLISHED_JOB_OPENING' : 'UNPUBLISHED_JOB_OPENING', `${isPublished ? 'Published' : 'Unpublished'} job opening "${existingJob.title}"`, String(id));
        return res.json({
            success: true,
            message: `Job opening ${isPublished ? 'published' : 'unpublished'} successfully`,
            data: existingJob,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * DELETE /api/admin/careers/:id
 * Soft deletes a job opening record
 */
async function softDeleteCareer(req, res, next) {
    try {
        const { id } = req.params;
        const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
        const existingJob = await JobOpening_1.JobOpening.findOne({ _id: id, isDeleted: false });
        if (!existingJob) {
            return res.status(404).json({ success: false, message: 'Job opening not found' });
        }
        existingJob.isDeleted = true;
        existingJob.deletedAt = new Date();
        existingJob.deletedBy = adminEmail;
        await existingJob.save();
        await logCareerAudit(req, 'DELETED_JOB_OPENING', `Soft-deleted job opening "${existingJob.title}" (${existingJob.slug})`, String(id), { previousStatus: existingJob.status });
        return res.json({
            success: true,
            message: 'Job opening removed successfully',
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * GET /api/admin/careers/:id/applications
 * Retrieves candidate applications for a specific opening
 */
async function getJobApplications(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.query;
        const query = { jobId: id };
        if (status && status !== 'ALL') {
            query.status = status;
        }
        const applications = await JobApplication_1.JobApplication.find(query).sort({ createdAt: -1 }).lean();
        return res.json({
            success: true,
            count: applications.length,
            data: applications,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * PATCH /api/admin/careers/applications/:applicationId/status
 * Updates candidate application status
 */
async function updateApplicationStatus(req, res, next) {
    try {
        const { applicationId } = req.params;
        const { status, adminNotes } = req.body;
        const validStatuses = ['RECEIVED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED'];
        if (!validStatuses.includes(status)) {
            return res.status(422).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(', ')}`,
            });
        }
        const application = await JobApplication_1.JobApplication.findById(applicationId);
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }
        application.status = status;
        if (adminNotes !== undefined) {
            application.adminNotes = String(adminNotes).trim();
        }
        await application.save();
        return res.json({
            success: true,
            message: `Candidate application status updated to ${status}`,
            data: application,
        });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=careerController.js.map