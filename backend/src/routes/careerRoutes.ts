import { Router } from 'express';
import { requireAdminAuth } from '../middleware/authMiddleware';
import {
  getPublicCareers,
  getPublicCareerBySlug,
  submitJobApplication,
  getAdminCareers,
  getAdminCareerById,
  createJobOpening,
  updateJobOpening,
  updateCareerStatus,
  toggleCareerPublish,
  softDeleteCareer,
  getJobApplications,
  updateApplicationStatus,
} from '../controllers/careerController';

// ─── PUBLIC CAREER ROUTES ───
export const publicCareerRouter = Router();

// GET /api/careers - List all published & open job openings
publicCareerRouter.get('/', getPublicCareers);

// GET /api/careers/:slug - View single published opening
publicCareerRouter.get('/:slug', getPublicCareerBySlug);

// POST /api/careers/:slug/apply - Submit job application
publicCareerRouter.post('/:slug/apply', submitJobApplication);


// ─── ADMIN CAREER ROUTES ───
export const adminCareerRouter = Router();

// Enforce admin privileges on all admin career routes
adminCareerRouter.use(requireAdminAuth);

// GET /api/admin/careers - List all openings with stats
adminCareerRouter.get('/', getAdminCareers);

// POST /api/admin/careers - Create new opening
adminCareerRouter.post('/', createJobOpening);

// GET /api/admin/careers/:id - Single opening details
adminCareerRouter.get('/:id', getAdminCareerById);

// PATCH /api/admin/careers/:id - Update opening
adminCareerRouter.patch('/:id', updateJobOpening);

// PATCH /api/admin/careers/:id/status - Update status
adminCareerRouter.patch('/:id/status', updateCareerStatus);

// PATCH /api/admin/careers/:id/publish - Toggle publish
adminCareerRouter.patch('/:id/publish', toggleCareerPublish);

// DELETE /api/admin/careers/:id - Soft delete
adminCareerRouter.delete('/:id', softDeleteCareer);

// GET /api/admin/careers/:id/applications - List applicants for opening
adminCareerRouter.get('/:id/applications', getJobApplications);

// PATCH /api/admin/careers/applications/:applicationId/status - Update applicant status
adminCareerRouter.patch('/applications/:applicationId/status', updateApplicationStatus);

export default {
  publicCareerRouter,
  adminCareerRouter,
};
