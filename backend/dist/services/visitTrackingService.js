"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_TIMEZONE = void 0;
exports.getFormattedVisitDate = getFormattedVisitDate;
exports.recordUserVisit = recordUserVisit;
const mongoose_1 = __importDefault(require("mongoose"));
const DailyUserVisit_1 = require("../models/DailyUserVisit");
exports.APP_TIMEZONE = 'Asia/Kolkata';
/**
 * Returns formatted date string (YYYY-MM-DD) for a given date in the application timezone.
 */
function getFormattedVisitDate(date = new Date()) {
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: exports.APP_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(date);
    }
    catch {
        // Fallback to UTC ISO string slice
        return date.toISOString().slice(0, 10);
    }
}
/**
 * Records or updates a unique user visit for the current calendar day.
 * Idempotent, safe against concurrency, and non-blocking.
 */
async function recordUserVisit(userId, req) {
    if (!userId || !mongoose_1.default.isValidObjectId(userId))
        return;
    const visitDate = getFormattedVisitDate();
    const now = new Date();
    const ipAddress = req
        ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            '127.0.0.1')
        : undefined;
    const userAgent = req?.headers['user-agent']
        ? String(req.headers['user-agent']).slice(0, 250)
        : undefined;
    try {
        await DailyUserVisit_1.DailyUserVisit.findOneAndUpdate({
            user: new mongoose_1.default.Types.ObjectId(userId),
            visitDate,
        }, {
            $setOnInsert: {
                user: new mongoose_1.default.Types.ObjectId(userId),
                visitDate,
                firstVisitedAt: now,
            },
            $set: {
                lastVisitedAt: now,
                ...(ipAddress ? { ipAddress } : {}),
                ...(userAgent ? { userAgent } : {}),
            },
            $inc: { visitCount: 1 },
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        });
    }
    catch (err) {
        // Ignore duplicate key race condition (MongoDB code 11000)
        if (err.code !== 11000) {
            console.error('Error tracking daily user visit:', err?.message || err);
        }
    }
}
//# sourceMappingURL=visitTrackingService.js.map