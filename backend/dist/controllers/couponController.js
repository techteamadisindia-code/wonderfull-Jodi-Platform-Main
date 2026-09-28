"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCouponEndpoint = validateCouponEndpoint;
exports.getAdminCoupons = getAdminCoupons;
exports.createAdminCoupon = createAdminCoupon;
exports.updateAdminCoupon = updateAdminCoupon;
exports.getAdminCouponUsage = getAdminCouponUsage;
exports.redeemCouponEndpoint = redeemCouponEndpoint;
exports.deleteAdminCoupon = deleteAdminCoupon;
const Coupon_1 = require("../models/Coupon");
const CouponRedemption_1 = require("../models/CouponRedemption");
const AuditLog_1 = require("../models/AuditLog");
const offerEngine_1 = require("../services/offerEngine");
async function logAudit(req, action, targetId, details, metadata) {
    try {
        await AuditLog_1.AuditLog.create({
            adminUser: req.user?.userId,
            adminEmail: req.user?.email || 'admin@wonderfuljodi.com',
            action,
            targetModel: 'Coupon',
            targetId,
            details,
            metadata,
            status: 'SUCCESS',
        });
    }
    catch (err) {
        console.warn('AuditLog creation warning:', err);
    }
}
/**
 * Public/User: Validate Coupon (POST /api/coupons/validate)
 */
async function validateCouponEndpoint(req, res, next) {
    try {
        const { couponCode, planKey } = req.body;
        if (!couponCode || !planKey) {
            return res.status(400).json({
                valid: false,
                reasonCode: 'MISSING_REQUIRED_FIELDS',
                message: 'Please provide both couponCode and planKey.',
            });
        }
        const offerResult = await (0, offerEngine_1.calculateOffer)({
            userId: req.user?.userId,
            planKeyOrSlug: planKey,
            couponCode,
        });
        if (!offerResult.couponValidation?.valid) {
            return res.json({
                valid: false,
                reasonCode: offerResult.couponValidation?.reasonCode || 'COUPON_INVALID',
                message: offerResult.couponValidation?.message || 'This coupon is not valid.',
                originalAmount: offerResult.originalPrice,
                discountAmount: 0,
                finalAmount: offerResult.originalPrice,
            });
        }
        res.json({
            valid: true,
            couponId: offerResult.coupon?.id,
            couponCode: offerResult.coupon?.code,
            name: offerResult.coupon?.name,
            discountType: offerResult.coupon?.discountType,
            discountValue: offerResult.coupon?.discountValue,
            originalAmount: offerResult.originalPrice,
            discountAmount: offerResult.discountAmount,
            finalAmount: offerResult.finalPrice,
            discountPercentage: offerResult.discountPercentage,
            isFree: offerResult.isFree,
            campaignId: offerResult.campaign?.id,
            message: offerResult.couponValidation.message,
        });
    }
    catch (error) {
        res.status(400).json({
            valid: false,
            reasonCode: 'VALIDATION_ERROR',
            message: error.message || 'Unable to validate coupon.',
        });
    }
}
/**
 * Admin: List all coupons with filters & search
 */
async function getAdminCoupons(req, res, next) {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const status = req.query.status?.toUpperCase();
        const search = req.query.search;
        const query = {};
        if (status && status !== 'ALL') {
            query.status = status;
        }
        if (search) {
            query.$or = [
                { couponCode: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { issuedToCandidateId: { $regex: search, $options: 'i' } },
            ];
        }
        const total = await Coupon_1.Coupon.countDocuments(query);
        const coupons = await Coupon_1.Coupon.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        res.json({
            success: true,
            data: coupons,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Create Coupon
 */
async function createAdminCoupon(req, res, next) {
    try {
        const { couponCode, name, description, discountType, discountValue, applicablePlans, startDate, expiryDate, usageLimit, perMemberLimit, minimumMembershipAmount, newMemberOnly, existingMemberOnly, gender, minAge, maxAge, maritalStatus, verificationStatus, location, qualification, campaignId, allowStacking, status, } = req.body;
        if (!couponCode || !name || !discountType || !expiryDate) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code, name, discount type, and expiry date are required.',
            });
        }
        const cleanCode = String(couponCode).trim().toUpperCase();
        const existing = await Coupon_1.Coupon.findOne({ couponCode: cleanCode });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `A coupon with code '${cleanCode}' already exists.`,
            });
        }
        const coupon = await Coupon_1.Coupon.create({
            couponCode: cleanCode,
            name,
            description,
            discountType,
            discountValue: discountType === 'FREE' ? 100 : Number(discountValue) || 0,
            applicablePlans: Array.isArray(applicablePlans) && applicablePlans.length > 0 ? applicablePlans : ['ALL'],
            startDate: startDate ? new Date(startDate) : new Date(),
            expiryDate: new Date(expiryDate),
            usageLimit: Number(usageLimit) || 0,
            usedCount: 0,
            perMemberLimit: Number(perMemberLimit) || 1,
            minimumMembershipAmount: Number(minimumMembershipAmount) || 0,
            newMemberOnly: Boolean(newMemberOnly),
            existingMemberOnly: Boolean(existingMemberOnly),
            gender: gender || 'Any',
            minAge: minAge ? Number(minAge) : undefined,
            maxAge: maxAge ? Number(maxAge) : undefined,
            maritalStatus: Array.isArray(maritalStatus) ? maritalStatus : maritalStatus ? [maritalStatus] : ['Any'],
            verificationStatus: Array.isArray(verificationStatus) ? verificationStatus : verificationStatus ? [verificationStatus] : ['Any'],
            location: location || {},
            qualification: Array.isArray(qualification) ? qualification : qualification ? [qualification] : ['Any'],
            campaignId: campaignId || undefined,
            allowStacking: Boolean(allowStacking),
            status: status || 'ACTIVE',
            createdBy: req.user?.userId,
        });
        await logAudit(req, 'COUPON_CREATED', String(coupon._id), `Created coupon '${coupon.couponCode}'`);
        res.status(201).json({
            success: true,
            message: `Coupon '${coupon.couponCode}' created successfully.`,
            data: coupon,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Update Coupon
 */
async function updateAdminCoupon(req, res, next) {
    try {
        const { id } = req.params;
        const coupon = await Coupon_1.Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }
        const oldStatus = coupon.status;
        const updates = req.body;
        if (updates.couponCode)
            updates.couponCode = String(updates.couponCode).trim().toUpperCase();
        if (updates.startDate)
            updates.startDate = new Date(updates.startDate);
        if (updates.expiryDate)
            updates.expiryDate = new Date(updates.expiryDate);
        Object.assign(coupon, updates);
        await coupon.save();
        await logAudit(req, 'COUPON_UPDATED', String(coupon._id), `Updated coupon '${coupon.couponCode}' (Status: ${oldStatus} -> ${coupon.status})`, { updates });
        res.json({
            success: true,
            message: `Coupon '${coupon.couponCode}' updated successfully.`,
            data: coupon,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Coupon Usage Details (GET /api/admin/coupons/:id/usage)
 */
async function getAdminCouponUsage(req, res, next) {
    try {
        const { id } = req.params;
        const coupon = await Coupon_1.Coupon.findById(id).populate('campaignId', 'campaignName');
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const statusFilter = req.query.status;
        const query = { couponId: coupon._id };
        if (statusFilter && statusFilter !== 'ALL') {
            query.status = statusFilter;
        }
        const totalRedemptions = await CouponRedemption_1.CouponRedemption.countDocuments(query);
        const redemptions = await CouponRedemption_1.CouponRedemption.find(query)
            .populate('userId', 'fullName email mobile')
            .sort({ redeemedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        // Compute total discount given
        const totalDiscountAgg = await CouponRedemption_1.CouponRedemption.aggregate([
            { $match: { couponId: coupon._id, status: 'SUCCESS' } },
            { $group: { _id: null, total: { $sum: '$discountAmount' } } },
        ]);
        const totalDiscountGiven = totalDiscountAgg[0]?.total || 0;
        const remainingUses = coupon.usageLimit > 0 ? Math.max(0, coupon.usageLimit - coupon.usedCount) : 'Unlimited';
        const usageTable = redemptions.map((r) => {
            const user = r.userId;
            return {
                id: r._id,
                memberName: user?.fullName || 'Doctor Candidate',
                candidateId: r.candidateId || 'WJ-Candidate',
                email: user?.email || '',
                planKey: r.planKey,
                originalPrice: r.originalAmount,
                discount: r.discountAmount,
                finalPrice: r.finalAmount,
                usedAt: r.redeemedAt,
                paymentId: r.paymentId || 'N/A (Free Claim)',
                orderId: r.orderId || 'N/A',
                status: r.status,
            };
        });
        res.json({
            success: true,
            data: {
                coupon: {
                    id: coupon._id,
                    code: coupon.couponCode,
                    name: coupon.name,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    usageLimit: coupon.usageLimit,
                    usedCount: coupon.usedCount,
                    remainingUses,
                    totalDiscountGiven,
                    createdDate: coupon.createdAt,
                    expiryDate: coupon.expiryDate,
                    status: coupon.status,
                    campaignName: coupon.campaignId?.campaignName || 'General Coupon',
                },
                usageTable,
                pagination: {
                    total: totalRedemptions,
                    page,
                    limit,
                    pages: Math.ceil(totalRedemptions / limit),
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * User: Redeem Coupon upon completed order/payment (POST /api/coupons/redeem)
 */
async function redeemCouponEndpoint(req, res, next) {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { couponCode, planKey, paymentId, orderId } = req.body;
        if (!couponCode || !planKey) {
            return res.status(400).json({ success: false, message: 'couponCode and planKey are required' });
        }
        const offerResult = await (0, offerEngine_1.calculateOffer)({
            userId,
            planKeyOrSlug: planKey,
            couponCode,
        });
        if (!offerResult.couponValidation?.valid || !offerResult.coupon) {
            return res.status(400).json({
                success: false,
                reasonCode: offerResult.couponValidation?.reasonCode || 'COUPON_INVALID',
                message: offerResult.couponValidation?.message || 'Coupon is not valid for redemption.',
            });
        }
        const redemption = await CouponRedemption_1.CouponRedemption.create({
            couponId: offerResult.coupon.id,
            couponCode: offerResult.coupon.code,
            userId,
            campaignId: offerResult.campaign?.id,
            planKey,
            originalAmount: offerResult.originalPrice,
            discountAmount: offerResult.discountAmount,
            finalAmount: offerResult.finalPrice,
            paymentId: paymentId || `pay_${Date.now()}`,
            orderId: orderId || `ord_${Date.now()}`,
            status: 'SUCCESS',
        });
        await Coupon_1.Coupon.findByIdAndUpdate(offerResult.coupon.id, { $inc: { usedCount: 1 } });
        res.json({
            success: true,
            message: 'Coupon redeemed successfully',
            data: redemption,
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Admin: Delete Coupon
 */
async function deleteAdminCoupon(req, res, next) {
    try {
        const { id } = req.params;
        const coupon = await Coupon_1.Coupon.findByIdAndDelete(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found.' });
        }
        await logAudit(req, 'COUPON_DELETED', String(id), `Deleted coupon '${coupon.couponCode}'`);
        res.json({ success: true, message: 'Coupon deleted successfully.' });
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=couponController.js.map