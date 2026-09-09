import { NextFunction, Request, Response } from 'express';
<<<<<<< HEAD
import { ZodError } from 'zod';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // 1. Zod Schema Validation Errors
  if (err instanceof ZodError || err?.name === 'ZodError') {
    const firstIssue = err.issues?.[0];
    const message = firstIssue?.message || 'Invalid input data.';
    return res.status(400).json({
      success: false,
      message,
      errors: err.issues?.map((i: any) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  // 2. MongoDB Duplicate Key (E11000)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `An account with this ${field} already exists.`,
    });
  }

  // 3. MongoDB CastError (Malformed ObjectId)
  if (err?.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for resource identifier '${err.path}'`,
    });
  }

  // 4. JWT Errors
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session',
    });
  }

  // Securely log full error on server
  console.error('Unhandled Application Error:', err);

  const status = typeof err.status === 'number' ? err.status : 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, mask internal server errors to prevent information disclosure
  const safeMessage =
    status === 500 && isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  return res.status(status).json({
    success: false,
    message: safeMessage,
    ...(isProduction ? {} : { stack: err.stack }),
  });
=======

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ success: false, message });
>>>>>>> 671859ed9c6f908469f6e883b8706986e566fad1
}
