"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminCareerRouter = exports.publicCareerRouter = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const careerController_1 = require("../controllers/careerController");
// ─── PUBLIC CAREER ROUTES ───
exports.publicCareerRouter = (0, express_1.Router)();
// GET /api/careers - List all published & open job openings
exports.publicCareerRouter.get('/', careerController_1.getPublicCareers);
// GET /api/careers/:slug - View single published opening
exports.publicCareerRouter.get('/:slug', careerController_1.getPublicCareerBySlug);
// POST /api/careers/:slug/apply - Submit job application
exports.publicCareerRouter.post('/:slug/apply', careerController_1.submitJobApplication);
// ─── ADMIN CAREER ROUTES ───
exports.adminCareerRouter = (0, express_1.Router)();
// Enforce admin privileges on all admin career routes
exports.adminCareerRouter.use(authMiddleware_1.requireAdminAuth);
// GET /api/admin/careers - List all openings with stats
exports.adminCareerRouter.get('/', careerController_1.getAdminCareers);
// POST /api/admin/careers - Create new opening
exports.adminCareerRouter.post('/', careerController_1.createJobOpening);
// GET /api/admin/careers/:id - Single opening details
exports.adminCareerRouter.get('/:id', careerController_1.getAdminCareerById);
// PATCH /api/admin/careers/:id - Update opening
exports.adminCareerRouter.patch('/:id', careerController_1.updateJobOpening);
// PATCH /api/admin/careers/:id/status - Update status
exports.adminCareerRouter.patch('/:id/status', careerController_1.updateCareerStatus);
// PATCH /api/admin/careers/:id/publish - Toggle publish
exports.adminCareerRouter.patch('/:id/publish', careerController_1.toggleCareerPublish);
// DELETE /api/admin/careers/:id - Soft delete
exports.adminCareerRouter.delete('/:id', careerController_1.softDeleteCareer);
// GET /api/admin/careers/:id/applications - List applicants for opening
exports.adminCareerRouter.get('/:id/applications', careerController_1.getJobApplications);
// PATCH /api/admin/careers/applications/:applicationId/status - Update applicant status
exports.adminCareerRouter.patch('/applications/:applicationId/status', careerController_1.updateApplicationStatus);
exports.default = {
    publicCareerRouter: exports.publicCareerRouter,
    adminCareerRouter: exports.adminCareerRouter,
};
//# sourceMappingURL=careerRoutes.js.map