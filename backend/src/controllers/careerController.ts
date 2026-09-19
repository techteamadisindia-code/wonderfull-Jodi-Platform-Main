import { Request, Response, NextFunction } from 'express';
import mongoose from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { JobOpening, IJobOpening } from '../models/JobOpening';
import { JobApplication } from '../models/JobApplication';
import { AuditLog } from '../models/AuditLog';
import { escapeRegex } from '../utils/securityUtils';

/**
 * Helper to record actions in the centralized AuditLog collection
 */
async function logCareerAudit(
  req: AuthRequest,
  action: string,
  details: string,
  targetId: string,
  extra: {
    previousStatus?: string;
    newStatus?: string;
    metadata?: Record<string, any>;
  } = {}
) {
  try {
    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';
    const adminUserId = req.user?.userId;
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    await AuditLog.create({
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
  } catch (err) {
    console.error('[Career AuditLog] Failed to record audit:', err);
  }
}

/**
 * Helper to convert title to slug and guarantee uniqueness
 */
export async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
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
    const query: any = { slug, isDeleted: false };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await JobOpening.findOne(query).select('_id').lean();
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
export async function seedDefaultCareersIfEmpty(): Promise<void> {
  try {
    const count = await JobOpening.countDocuments({ isDeleted: false });
    if (count > 0) return;

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
        shortDescription:
          'Provide high-touch personalized matchmaking consultations and confidential matchmaking services for doctors and esteemed medical families.',
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
        shortDescription:
          'Architect and build real-time matrimonial features, kundali compatibility systems, and secure communication channels using Next.js, Node.js, and MongoDB.',
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
        shortDescription:
          'Verify medical practitioner licenses, National Medical Commission (NMC) registrations, and government IDs to preserve platform authenticity.',
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
        shortDescription:
          'Test core matching algorithms, responsive layouts across devices, and automated test suites for India’s top doctor matrimony app.',
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
        shortDescription:
          'Guide doctors and their families with empathetic phone, chat, and email support for onboarding, photo uploads, and membership queries.',
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

    await JobOpening.insertMany(defaultJobs);
    console.log(`[Careers] Successfully seeded ${defaultJobs.length} initial job openings.`);
  } catch (error) {
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
export async function getPublicCareers(req: Request, res: Response, next: NextFunction) {
  try {
    const { department, workMode, employmentType, search, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query: any = {
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
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { department: { $regex: sanitized, $options: 'i' } },
        { location: { $regex: sanitized, $options: 'i' } },
        { shortDescription: { $regex: sanitized, $options: 'i' } },
        { skills: { $in: [new RegExp(sanitized, 'i')] } },
      ];
    }

    const [total, jobs, departments] = await Promise.all([
      JobOpening.countDocuments(query),
      JobOpening.find(query)
        .select(
          'title slug department location workMode employmentType experience salaryRange shortDescription applicationDeadline status createdAt displayOrder'
        )
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      JobOpening.distinct('department', { isDeleted: false, isPublished: true, status: 'OPEN' }),
    ]);

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
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/careers/:slug
 * Returns complete details for one published job opening
 */
export async function getPublicCareerBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid job opening identifier' });
    }

    const job = await JobOpening.findOne({
      slug: slug.trim().toLowerCase(),
      isDeleted: false,
      isPublished: true,
    })
      .select('-isDeleted -deletedAt -deletedBy -__v')
      .lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job opening not found or is no longer available.',
      });
    }

    return res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/careers/:slug/apply
 * Allows candidate to submit an application
 */
export async function submitJobApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params;
    const { candidateName, email, mobile, experienceYears, resumeUrl, coverLetter } = req.body;

    const job = await JobOpening.findOne({
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
    const existing = await JobApplication.findOne({
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

    const application = await JobApplication.create({
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
  } catch (error) {
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
export async function getAdminCareers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, department, workMode, isPublished, search, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const query: any = { isDeleted: false };

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
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { department: { $regex: sanitized, $options: 'i' } },
        { location: { $regex: sanitized, $options: 'i' } },
        { slug: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // Run summary metrics and filtered queries concurrently
    const [statsAggregate, total, jobs, departments] = await Promise.all([
      JobOpening.aggregate([
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
      JobOpening.countDocuments(query),
      JobOpening.find(query)
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      JobOpening.distinct('department', { isDeleted: false }),
    ]);

    const stats = statsAggregate[0] || {
      total: 0,
      published: 0,
      draft: 0,
      open: 0,
      closed: 0,
      archived: 0,
    };

    // Attach application counts to each job
    const jobIds = jobs.map((j) => j._id);
    const applicationCounts = await JobApplication.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
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
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/careers/:id
 * Complete details for a single job opening
 */
export async function getAdminCareerById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const job = await JobOpening.findOne({ _id: id, isDeleted: false }).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    const applicationsCount = await JobApplication.countDocuments({ jobId: id });

    return res.json({
      success: true,
      data: {
        ...job,
        applicationsCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/careers
 * Creates a new job opening
 */
export async function createJobOpening(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      title,
      slug: customSlug,
      department,
      location,
      workMode = 'On-site',
      employmentType = 'Full-time',
      experience = '',
      salaryRange = '',
      shortDescription,
      fullDescription,
      responsibilities = [],
      requirements = [],
      qualifications = [],
      skills = [],
      benefits = [],
      applicationEmail = 'careers@wonderfuljodi.com',
      applicationUrl = '',
      applicationDeadline,
      status = 'OPEN',
      isPublished = true,
      displayOrder = 0,
    } = req.body;

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
    let parsedDeadline: Date | null = null;
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

    const newJob = await JobOpening.create({
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
      responsibilities: Array.isArray(responsibilities) ? responsibilities.map((r: any) => String(r).trim()).filter(Boolean) : [],
      requirements: Array.isArray(requirements) ? requirements.map((r: any) => String(r).trim()).filter(Boolean) : [],
      qualifications: Array.isArray(qualifications) ? qualifications.map((q: any) => String(q).trim()).filter(Boolean) : [],
      skills: Array.isArray(skills) ? skills.map((s: any) => String(s).trim()).filter(Boolean) : [],
      benefits: Array.isArray(benefits) ? benefits.map((b: any) => String(b).trim()).filter(Boolean) : [],
      applicationEmail: applicationEmail.trim().toLowerCase(),
      applicationUrl: applicationUrl.trim(),
      applicationDeadline: parsedDeadline,
      status,
      isPublished: Boolean(isPublished),
      displayOrder: parseInt(displayOrder as any, 10) || 0,
      createdBy: adminEmail,
      updatedBy: adminEmail,
    });

    await logCareerAudit(
      req,
      'CREATED_JOB_OPENING',
      `Created job opening "${newJob.title}" (${newJob.slug}) in ${newJob.department}`,
      String(newJob._id),
      { newStatus: newJob.status }
    );

    return res.status(201).json({
      success: true,
      message: 'Job opening created successfully',
      data: newJob,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/careers/:id
 * Updates an existing job opening
 */
export async function updateJobOpening(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingJob = await JobOpening.findOne({ _id: id, isDeleted: false });
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

    const updatedJob = await JobOpening.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    await logCareerAudit(
      req,
      'UPDATED_JOB_OPENING',
      `Updated job opening "${updatedJob?.title}"`,
      String(id),
      {
        previousStatus: existingJob.status,
        newStatus: updatedJob?.status,
        metadata: { changedFields: Object.keys(updates) },
      }
    );

    return res.json({
      success: true,
      message: 'Job opening updated successfully',
      data: updatedJob,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/careers/:id/status
 * Quick action to change status (OPEN, CLOSED, DRAFT, ARCHIVED)
 */
export async function updateCareerStatus(req: AuthRequest, res: Response, next: NextFunction) {
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

    const existingJob = await JobOpening.findOne({ _id: id, isDeleted: false });
    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    const previousStatus = existingJob.status;
    existingJob.status = status;
    existingJob.updatedBy = req.user?.email || 'admin@wonderfuljodi.com';
    await existingJob.save();

    await logCareerAudit(
      req,
      'STATUS_CHANGED_JOB_OPENING',
      `Changed status of "${existingJob.title}" from ${previousStatus} to ${status}`,
      String(id),
      { previousStatus, newStatus: status }
    );

    return res.json({
      success: true,
      message: `Status changed to ${status}`,
      data: existingJob,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/careers/:id/publish
 * Quick toggle to publish or unpublish
 */
export async function toggleCareerPublish(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
      return res.status(422).json({ success: false, message: 'isPublished must be a boolean' });
    }

    const existingJob = await JobOpening.findOne({ _id: id, isDeleted: false });
    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    existingJob.isPublished = isPublished;
    existingJob.updatedBy = req.user?.email || 'admin@wonderfuljodi.com';
    await existingJob.save();

    await logCareerAudit(
      req,
      isPublished ? 'PUBLISHED_JOB_OPENING' : 'UNPUBLISHED_JOB_OPENING',
      `${isPublished ? 'Published' : 'Unpublished'} job opening "${existingJob.title}"`,
      String(id)
    );

    return res.json({
      success: true,
      message: `Job opening ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: existingJob,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/careers/:id
 * Soft deletes a job opening record
 */
export async function softDeleteCareer(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const adminEmail = req.user?.email || 'admin@wonderfuljodi.com';

    const existingJob = await JobOpening.findOne({ _id: id, isDeleted: false });
    if (!existingJob) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    existingJob.isDeleted = true;
    existingJob.deletedAt = new Date();
    existingJob.deletedBy = adminEmail;
    await existingJob.save();

    await logCareerAudit(
      req,
      'DELETED_JOB_OPENING',
      `Soft-deleted job opening "${existingJob.title}" (${existingJob.slug})`,
      String(id),
      { previousStatus: existingJob.status }
    );

    return res.json({
      success: true,
      message: 'Job opening removed successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/careers/:id/applications
 * Retrieves candidate applications for a specific opening
 */
export async function getJobApplications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const query: any = { jobId: id };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const applications = await JobApplication.find(query).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/careers/applications/:applicationId/status
 * Updates candidate application status
 */
export async function updateApplicationStatus(req: AuthRequest, res: Response, next: NextFunction) {
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

    const application = await JobApplication.findById(applicationId);
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
  } catch (error) {
    next(error);
  }
}
