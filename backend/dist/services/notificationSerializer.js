"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeNotificationsForRecipient = serializeNotificationsForRecipient;
exports.serializeNotificationForRecipient = serializeNotificationForRecipient;
const Profile_1 = require("../models/Profile");
const Interest_1 = require("../models/Interest");
const securityUtils_1 = require("../utils/securityUtils");
const entitlementService_1 = require("./entitlementService");
/**
 * Strips private visitor details for Free members and projects allowlisted public
 * visitor details for Paid members.
 *
 * Guarantees:
 * - Free members NEVER receive viewer user ID, profile ID, candidate ID, visitor name,
 *   photo URL, profile URL, phone number, email, or any raw identifying metadata.
 * - Paid members receive ONLY allowlisted public identity fields (public display name,
 *   primary public photo, public candidate ID link).
 */
async function serializeNotificationsForRecipient(notifications, recipientUserId, recipientRole) {
    if (!Array.isArray(notifications) || notifications.length === 0) {
        return [];
    }
    // 1. Server-side entitlement check
    const isEntitled = await (0, entitlementService_1.hasActivePaidMembership)(recipientUserId, recipientRole);
    // 2. Preload authoritative Interest records for any notifications containing an interestId
    const interestMap = new Map();
    const interestIds = [];
    for (const n of notifications) {
        let meta = n?.metadata;
        if (typeof meta === 'string') {
            try {
                meta = JSON.parse(meta);
            }
            catch {
                meta = {};
            }
        }
        const candidateId = meta?.interestId;
        if (candidateId && typeof candidateId === 'string' && (0, securityUtils_1.isValidObjectId)(candidateId)) {
            interestIds.push(candidateId);
        }
    }
    if (interestIds.length > 0) {
        try {
            const uniqueInterestIds = Array.from(new Set(interestIds));
            const interests = await Interest_1.Interest.find({ _id: { $in: uniqueInterestIds } });
            for (const inst of interests) {
                interestMap.set(String(inst._id), inst);
            }
        }
        catch (err) {
            console.error('[NotificationSerializer] Error preloading interests:', err);
        }
    }
    // 3. Identify all PROFILE_VIEW notifications
    const hasProfileViews = notifications.some((n) => n?.type === 'PROFILE_VIEW');
    // If entitled, preload viewer profiles in a single query
    const viewerProfileMap = new Map();
    if (isEntitled && hasProfileViews) {
        const viewerUserIds = [];
        for (const n of notifications) {
            if (n?.type === 'PROFILE_VIEW') {
                let meta = n.metadata;
                if (typeof meta === 'string') {
                    try {
                        meta = JSON.parse(meta);
                    }
                    catch {
                        meta = {};
                    }
                }
                if (meta?.viewerUserId) {
                    viewerUserIds.push(String(meta.viewerUserId));
                }
            }
        }
        if (viewerUserIds.length > 0) {
            try {
                const uniqueViewerIds = Array.from(new Set(viewerUserIds));
                await Promise.all(uniqueViewerIds.map(async (uId) => {
                    const p = await Profile_1.Profile.findOne({
                        $or: [{ user: uId }, { userId: uId }],
                        isDeleted: { $ne: true },
                    });
                    if (p) {
                        viewerProfileMap.set(String(uId), p);
                    }
                }));
            }
            catch (err) {
                console.error('[NotificationSerializer] Error preloading viewer profiles:', err);
            }
        }
    }
    // 4. Serialize each notification
    return notifications.map((n) => {
        const raw = n.toObject ? n.toObject() : { ...n };
        let meta = raw.metadata;
        if (typeof meta === 'string') {
            try {
                meta = JSON.parse(meta);
            }
            catch {
                meta = {};
            }
        }
        else if (!meta || typeof meta !== 'object') {
            meta = {};
        }
        else {
            meta = { ...meta };
        }
        // Fail-closed interest status enforcement:
        // Strip/delete any stale metadata.interestStatus before applying live lookup results
        delete meta.interestStatus;
        // Attach authoritative interest status if an interestId is present
        if (meta.interestId) {
            const matchedInterest = interestMap.get(String(meta.interestId));
            if (matchedInterest && matchedInterest.status) {
                meta.interestStatus = matchedInterest.status;
            }
            else if (raw.type === 'INTEREST_WITHDRAWN') {
                meta.interestStatus = 'REJECTED';
            }
            else if (raw.type === 'INTEREST_ACCEPTED') {
                meta.interestStatus = 'ACCEPTED';
            }
            else if (raw.type === 'INTEREST_DECLINED') {
                meta.interestStatus = 'DECLINED';
            }
            // If interest is missing from DB or lookup fails, interestStatus remains unset/deleted
        }
        raw.metadata = meta;
        if (raw.type !== 'PROFILE_VIEW') {
            return raw;
        }
        const viewedAt = meta.viewedAt || raw.createdAt;
        // --- CASE A: Free Member (Locked Projection) ---
        if (!isEntitled) {
            return {
                _id: raw._id || raw.id,
                id: raw._id || raw.id,
                user: raw.user,
                type: 'PROFILE_VIEW',
                title: 'Someone viewed your profile',
                message: 'A member is interested in your profile. Upgrade to discover who.',
                actionUrl: '/membership?feature=profile-viewers',
                link: '/membership?feature=profile-viewers',
                read: Boolean(raw.read),
                readAt: raw.readAt || null,
                isLocked: true,
                metadata: {
                    isLocked: true,
                    upgradeFeature: 'profile-viewers',
                    unlockUrl: '/membership?feature=profile-viewers',
                    viewedAt,
                },
                createdAt: raw.createdAt,
                updatedAt: raw.updatedAt,
            };
        }
        // --- CASE B: Paid Member (Unlocked Allowlisted Public Projection) ---
        const viewerUserId = String(meta.viewerUserId || '');
        const viewerProfile = viewerProfileMap.get(viewerUserId);
        let displayName = 'A verified member';
        let visitorPhoto = null;
        let visitorProfileId = null;
        if (viewerProfile) {
            displayName =
                viewerProfile.displayName ||
                    viewerProfile.publicName ||
                    viewerProfile.name ||
                    (viewerProfile.firstName
                        ? `${viewerProfile.firstName} ${viewerProfile.lastName ? viewerProfile.lastName.charAt(0) + '.' : ''}`.trim()
                        : 'A verified member');
            visitorPhoto =
                viewerProfile.primaryPhoto ||
                    (Array.isArray(viewerProfile.photos) && viewerProfile.photos.length > 0
                        ? viewerProfile.photos[0]
                        : null);
            visitorProfileId = viewerProfile.candidateId || String(viewerProfile._id);
        }
        const profileUrl = visitorProfileId ? `/profile/${visitorProfileId}` : '/search';
        return {
            _id: raw._id || raw.id,
            id: raw._id || raw.id,
            user: raw.user,
            type: 'PROFILE_VIEW',
            title: `${displayName} viewed your profile`,
            message: `${displayName} viewed your profile.`,
            actionUrl: profileUrl,
            link: profileUrl,
            read: Boolean(raw.read),
            readAt: raw.readAt || null,
            isLocked: false,
            metadata: {
                isLocked: false,
                visitorName: displayName,
                viewerName: displayName,
                visitorPhoto,
                viewerAvatar: visitorPhoto,
                visitorProfileId,
                profileUrl,
                viewedAt,
            },
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    });
}
/**
 * Serializes a single notification object for the recipient
 */
async function serializeNotificationForRecipient(notification, recipientUserId, recipientRole) {
    const [serialized] = await serializeNotificationsForRecipient([notification], recipientUserId, recipientRole);
    return serialized;
}
//# sourceMappingURL=notificationSerializer.js.map