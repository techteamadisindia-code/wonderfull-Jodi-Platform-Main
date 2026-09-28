import { Router } from 'express';
import { requireAdminAuth } from '../middleware/authMiddleware';
import {
  listContactInquiries,
  getContactInquiry,
  updateContactInquiry,
  deleteContactInquiry,
  replyToContactInquiry,
  getContactInquirySummary,
} from '../controllers/contactInquiryController';

const router = Router();

// All routes require admin authentication
router.use(requireAdminAuth);

// GET  /api/admin/contact-inquiries/summary – summary counts
router.get('/summary', getContactInquirySummary);

// GET  /api/admin/contact-inquiries – list with filters, pagination, search
router.get('/', listContactInquiries);

// GET  /api/admin/contact-inquiries/:id – single inquiry details
router.get('/:id', getContactInquiry);

// PATCH /api/admin/contact-inquiries/:id – update status, priority, category, assign, notes
router.patch('/:id', updateContactInquiry);

// POST /api/admin/contact-inquiries/:id/reply – send email reply
router.post('/:id/reply', replyToContactInquiry);

// DELETE /api/admin/contact-inquiries/:id – delete inquiry (audit logged)
router.delete('/:id', deleteContactInquiry);

export default router;
