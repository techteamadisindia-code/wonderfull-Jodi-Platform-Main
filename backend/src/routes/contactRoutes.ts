import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ContactInquiry } from '../models/ContactInquiry';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  message: z.string().min(5, 'Message must be at least 5 characters'),
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.errors[0]?.message || 'Invalid contact submission data',
      });
    }

    const { name, email, message } = parsed.data;
    const mobileNumber = parsed.data.mobile || parsed.data.phone || '+91 99999 99999';

    const inquiry = await ContactInquiry.create({
      name,
      mobile: mobileNumber,
      email,
      message,
      status: 'NEW',
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for contacting Wonderful Jodi. Our support team will get back to you shortly.',
      data: { id: inquiry._id },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
