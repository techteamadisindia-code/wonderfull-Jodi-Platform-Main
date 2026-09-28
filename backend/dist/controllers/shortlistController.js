"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addShortlist = addShortlist;
exports.removeShortlist = removeShortlist;
exports.getShortlisted = getShortlisted;
const Shortlist_1 = require("../models/Shortlist");
const Profile_1 = require("../models/Profile");
const securityUtils_1 = require("../utils/securityUtils");
async function addShortlist(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { profileId } = req.body;
        if (!(0, securityUtils_1.isValidObjectId)(profileId)) {
            return res.status(400).json({ success: false, message: 'Invalid profile ID' });
        }
        const profileExists = await Profile_1.Profile.findById(profileId);
        if (!profileExists) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        const existing = await Shortlist_1.Shortlist.findOne({ user: userId, profile: profileId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Profile already shortlisted' });
        }
        const shortlist = await Shortlist_1.Shortlist.create({ user: userId, profile: profileId });
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
        const { profileId } = req.params;
        if (!(0, securityUtils_1.isValidObjectId)(profileId)) {
            return res.status(400).json({ success: false, message: 'Invalid profile ID' });
        }
        const shortlist = await Shortlist_1.Shortlist.findOneAndDelete({ user: userId, profile: profileId });
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