"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const contactInquiryController_1 = require("../controllers/contactInquiryController");
const router = (0, express_1.Router)();
// All routes require admin authentication
router.use(authMiddleware_1.requireAdminAuth);
// GET  /api/admin/contact-inquiries/summary – summary counts
router.get('/summary', contactInquiryController_1.getContactInquirySummary);
// GET  /api/admin/contact-inquiries – list with filters, pagination, search
router.get('/', contactInquiryController_1.listContactInquiries);
// GET  /api/admin/contact-inquiries/:id – single inquiry details
router.get('/:id', contactInquiryController_1.getContactInquiry);
// PATCH /api/admin/contact-inquiries/:id – update status, priority, category, assign, notes
router.patch('/:id', contactInquiryController_1.updateContactInquiry);
// POST /api/admin/contact-inquiries/:id/reply – send email reply
router.post('/:id/reply', contactInquiryController_1.replyToContactInquiry);
// DELETE /api/admin/contact-inquiries/:id – delete inquiry (audit logged)
router.delete('/:id', contactInquiryController_1.deleteContactInquiry);
exports.default = router;
//# sourceMappingURL=adminContactInquiryRoutes.js.map