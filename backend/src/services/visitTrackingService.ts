import { Request } from 'express';
import mongoose from 'mongoose';
import { DailyUserVisit } from '../models/DailyUserVisit';

export const APP_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns formatted date string (YYYY-MM-DD) for a given date in the application timezone.
 */
export function getFormattedVisitDate(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    // Fallback to UTC ISO string slice
    return date.toISOString().slice(0, 10);
  }
}

/**
 * Records or updates a unique user visit for the current calendar day.
 * Idempotent, safe against concurrency, and non-blocking.
 */
export async function recordUserVisit(
  userId: string | mongoose.Types.ObjectId,
  req?: Request
): Promise<void> {
  if (!userId || !mongoose.isValidObjectId(userId)) return;

  const visitDate = getFormattedVisitDate();
  const now = new Date();

  const ipAddress = req
    ? ((req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
       req.socket.remoteAddress ||
       '127.0.0.1')
    : undefined;

  const userAgent = req?.headers['user-agent']
    ? String(req.headers['user-agent']).slice(0, 250)
    : undefined;

  try {
    await DailyUserVisit.findOneAndUpdate(
      {
        user: new mongoose.Types.ObjectId(userId),
        visitDate,
      },
      {
        $setOnInsert: {
          user: new mongoose.Types.ObjectId(userId),
          visitDate,
          firstVisitedAt: now,
        },
        $set: {
          lastVisitedAt: now,
          ...(ipAddress ? { ipAddress } : {}),
          ...(userAgent ? { userAgent } : {}),
        },
        $inc: { visitCount: 1 },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  } catch (err: any) {
    // Ignore duplicate key race condition (MongoDB code 11000)
    if (err.code !== 11000) {
      console.error('Error tracking daily user visit:', err?.message || err);
    }
  }
}
