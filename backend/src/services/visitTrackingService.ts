import { Request } from 'express';
import { DailyUserVisit } from '../models/DailyUserVisit';
import { isValidObjectId } from '../utils/securityUtils';

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
  userId: string | any,
  req?: Request
): Promise<void> {
  const uid = typeof userId === 'object' ? String(userId._id || userId.id) : String(userId);
  if (!uid || !isValidObjectId(uid)) return;

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
        userId: uid,
        visitDate,
      },
      {
        $setOnInsert: {
          userId: uid,
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
      }
    );
  } catch (err: any) {
    console.error('Error tracking daily user visit:', err?.message || err);
  }
}
