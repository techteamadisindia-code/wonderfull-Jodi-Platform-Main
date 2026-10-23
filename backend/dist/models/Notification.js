"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
exports.isNotificationTrashed = isNotificationTrashed;
const prismaBridge_1 = require("../db/prismaBridge");
/**
 * Canonical helper to check if a notification has been soft-deleted/trashed.
 * Soft-deletion is stored within the standard `metadata` JSON column.
 */
function isNotificationTrashed(metadata) {
    if (!metadata)
        return false;
    let parsed = metadata;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        }
        catch {
            return false;
        }
    }
    return Boolean(parsed?.isDeleted || parsed?.trashed);
}
const notificationSchema = new prismaBridge_1.Schema({
    user: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    broadcast: { type: prismaBridge_1.Schema.Types.ObjectId, ref: 'Broadcast', index: true },
    type: { type: String, required: true, trim: true, default: 'SYSTEM' },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    actionUrl: { type: String, trim: true, maxlength: 500 },
    link: { type: String, trim: true, maxlength: 500 },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    metadata: { type: prismaBridge_1.Schema.Types.Mixed },
}, { timestamps: true });
// Compound indexes for fast user notification querying and unread counting
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
exports.Notification = (0, prismaBridge_1.createPrismaModelAdapter)('notification', { "user": "userId", "broadcast": "broadcastId" });
//# sourceMappingURL=Notification.js.map