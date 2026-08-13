import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { sendMail } from '../services/emailService';

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10),
  password: z.string().min(8),
});

const loginSchema = z.object({
  emailOrMobile: z.string().min(5),
  password: z.string().min(8),
});

const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8) });

function signToken(userId: string, role: string) {
  const secret = process.env.JWT_SECRET ?? 'secret';
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '1d';
  return jwt.sign({ userId, role }, secret, { expiresIn });
}

export async function registerUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ $or: [{ email: data.email }, { mobile: data.mobile }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or mobile already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      mobile: data.mobile,
      password: passwordHash,
      role: 'user',
    });

    const token = signToken(user._id.toString(), user.role);
    await sendMail({
      to: user.email,
      subject: 'Welcome to Wonderful Jodi',
      text: `Hello ${user.fullName}, welcome to Wonderful Jodi matrimonial platform.`,
    });

    return res.status(201).json({ success: true, data: { token, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } } });
  } catch (error) {
    next(error);
  }
}

export async function loginUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ $or: [{ email: data.emailOrMobile }, { mobile: data.emailOrMobile }] });
    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user._id.toString(), user.role);
    return res.json({ success: true, data: { token, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } } });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET ?? 'secret', { expiresIn: '1h' });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendMail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Reset your password by visiting: ${resetUrl}`,
    });

    return res.json({ success: true, message: 'Password reset link sent' });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const payload = jwt.verify(data.token, process.env.JWT_SECRET ?? 'secret') as { userId: string };
    const hashedPassword = await bcrypt.hash(data.password, 12);
    await User.findByIdAndUpdate(payload.userId, { password: hashedPassword });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}
