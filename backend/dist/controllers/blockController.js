"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedProfiles = exports.unblockProfileById = exports.blockProfileById = void 0;
exports.blockUser = blockUser;
exports.unblockUser = unblockUser;
exports.getBlockedUsers = getBlockedUsers;
const Block_1 = require("../models/Block");
const User_1 = require("../models/User");
const Profile_1 = require("../models/Profile");
const securityUtils_1 = require("../utils/securityUtils");
const profileController_1 = require("./profileController");
// Helper to resolve User ID whether given a User ID, Profile ID, or Candidate ID (e.g. WJ-100092)
async function resolveTargetUserId(idOrProfileId) {
    const rawId = (idOrProfileId || '').trim();
    if (!rawId || rawId.length < 3 || rawId.length > 50)
        return null;
    // 1. Check canonical profile resolution (handles candidateId like WJ-100092, profile _id, legacy WJ-[hex])
    const profile = await (0, profileController_1.findCanonicalProfile)(rawId);
    if (profile && profile.user) {
        return String(profile.user._id || profile.user.id || profile.user);
    }
    // 2. Direct User lookup if rawId matches ObjectId or UUID format
    if ((0, securityUtils_1.isValidObjectId)(rawId) || /^[0-9a-fA-F]{24}$/.test(rawId) || /^[A-Za-z0-9_-]{20,36}$/.test(rawId)) {
        const directUser = await User_1.User.findById(rawId).select('_id');
        if (directUser)
            return String(directUser._id || directUser.id);
    }
    return null;
}
async function blockUser(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { blockedUserId, profileId, reason } = req.body;
        const targetId = blockedUserId || profileId;
        if (!targetId) {
            return res.status(400).json({ success: false, message: 'A blockedUserId or profileId is required' });
        }
        const resolvedUserId = await resolveTargetUserId(targetId);
        if (!resolvedUserId) {
            return res.status(404).json({ success: false, message: 'User or profile to block not found' });
        }
        if (String(userId) === String(resolvedUserId)) {
            return res.status(400).json({ success: false, message: 'You cannot block your own profile' });
        }
        const block = await Block_1.Block.findOneAndUpdate({ blocker: userId, blockedUser: resolvedUserId }, { blocker: userId, blockedUser: resolvedUserId, reason: (reason || '').trim().slice(0, 500) }, { upsert: true, new: true });
        res.status(201).json({ success: true, message: 'Profile blocked successfully', data: block });
    }
    catch (error) {
        next(error);
    }
}
async function unblockUser(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const rawId = req.params.blockedUserId || req.params.id;
        if (!rawId) {
            return res.status(400).json({ success: false, message: 'Invalid target ID' });
        }
        const resolvedUserId = await resolveTargetUserId(rawId);
        if (!resolvedUserId) {
            return res.status(404).json({ success: false, message: 'User or profile not found' });
        }
        const block = await Block_1.Block.findOneAndDelete({ blocker: userId, blockedUser: resolvedUserId });
        if (!block) {
            return res.status(404).json({ success: false, message: 'Blocked record not found' });
        }
        res.json({ success: true, message: 'Profile unblocked successfully' });
    }
    catch (error) {
        next(error);
    }
}
async function getBlockedUsers(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const blocks = await Block_1.Block.find({ blocker: userId })
            .sort({ createdAt: -1 })
            .populate('blockedUser', 'fullName email verificationStatus isActive')
            .lean();
        const blockedUserIds = blocks.map((b) => b.blockedUser?._id).filter(Boolean);
        const profiles = await Profile_1.Profile.find({ user: { $in: blockedUserIds } })
            .select('user displayName primaryPhoto photos education degree profession city state verificationStatus')
            .lean();
        const profileMap = new Map();
        profiles.forEach((p) => {
            profileMap.set(String(p.user), p);
        });
        const enrichedBlocks = blocks.map((b) => {
            const uId = b.blockedUser?._id ? String(b.blockedUser._id) : null;
            const prof = uId ? profileMap.get(uId) : null;
            return {
                _id: b._id,
                blocker: b.blocker,
                blockedUser: b.blockedUser,
                profile: prof || null,
                reason: b.reason || '',
                createdAt: b.createdAt,
                updatedAt: b.updatedAt,
            };
        });
        res.json({ success: true, data: enrichedBlocks });
    }
    catch (error) {
        next(error);
    }
}
exports.blockProfileById = blockUser;
exports.unblockProfileById = unblockUser;
exports.getBlockedProfiles = getBlockedUsers;
//# sourceMappingURL=blockController.js.map