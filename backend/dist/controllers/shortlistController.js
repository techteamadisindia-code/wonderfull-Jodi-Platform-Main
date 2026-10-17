"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addShortlist = addShortlist;
exports.removeShortlist = removeShortlist;
exports.getShortlisted = getShortlisted;
const Shortlist_1 = require("../models/Shortlist");
const securityUtils_1 = require("../utils/securityUtils");
const profileController_1 = require("./profileController");
async function addShortlist(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const rawProfileId = (req.body.profileId || '').trim();
        if (!rawProfileId || rawProfileId.length < 3 || rawProfileId.length > 50) {
            return res.status(400).json({ success: false, message: 'Invalid profile ID' });
        }
        const profileExists = await (0, profileController_1.findCanonicalProfile)(rawProfileId);
        if (!profileExists) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        // Prevent self-shortlisting: resolve target profile to canonical user ID
        const targetUserId = String(profileExists.user?._id ||
            profileExists.user?.id ||
            (typeof profileExists.user === 'string' ? profileExists.user : '') ||
            profileExists.userId ||
            '');
        if (targetUserId && String(userId) === targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot shortlist your own profile',
            });
        }
        const canonicalProfileId = String(profileExists._id || profileExists.id);
        const existing = await Shortlist_1.Shortlist.findOne({
            user: userId,
            $or: [{ profile: canonicalProfileId }, { profile: rawProfileId }],
        });
        if (existing) {
            return res.status(400).json({ success: false, code: 'ALREADY_SHORTLISTED', message: 'Profile already shortlisted' });
        }
        const shortlist = await Shortlist_1.Shortlist.create({ user: userId, profile: canonicalProfileId });
        res.status(201).json({ success: true, data: shortlist });
    }
    catch (error) {
        next(error);
    }
}
async function removeShortlist(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const rawProfileId = (req.params.profileId || '').trim();
        if (!rawProfileId || rawProfileId.length < 3 || rawProfileId.length > 50) {
            return res.status(400).json({ success: false, message: 'Invalid profile ID' });
        }
        const profile = await (0, profileController_1.findCanonicalProfile)(rawProfileId);
        const canonicalProfileId = profile ? String(profile._id || profile.id) : null;
        const shortlist = await Shortlist_1.Shortlist.findOneAndDelete({
            user: userId,
            ...(canonicalProfileId
                ? { $or: [{ profile: canonicalProfileId }, { profile: rawProfileId }] }
                : { profile: rawProfileId }),
        });
        if (!shortlist) {
            return res.status(404).json({ success: false, message: 'Shortlist entry not found' });
        }
        res.json({ success: true, message: 'Removed from shortlist' });
    }
    catch (error) {
        next(error);
    }
}
async function getShortlisted(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const items = await Shortlist_1.Shortlist.find({ user: userId }).populate({
            path: 'profile',
            populate: { path: 'user', select: 'fullName verificationStatus verified' },
        });
        const sanitizedItems = items.map((item) => ({
            _id: item._id,
            user: item.user,
            createdAt: item.createdAt,
            profile: item.profile ? (0, securityUtils_1.serializePublicProfile)(item.profile, { viewerUserId: userId }) : null,
        }));
        res.json({ success: true, data: sanitizedItems });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=shortlistController.js.map