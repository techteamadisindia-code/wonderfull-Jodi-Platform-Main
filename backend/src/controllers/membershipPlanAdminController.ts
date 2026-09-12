import { Response, NextFunction } from 'express';
import mongoose from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { MembershipPlan, IMembershipPlan } from '../models/MembershipPlan';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * 1. GET /api/admin/memberships
 * Get all membership plans (both active and inactive) for admin management
 */
export async function getAllPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plans = await MembershipPlan.find().sort({ displayOrder: 1, createdAt: 1 });
    res.json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. GET /api/admin/memberships/:id
 * Get a single membership plan by ID or slug
 */
export async function getPlanById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    let plan = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      plan = await MembershipPlan.findById(id);
    }
    if (!plan) {
      plan = await MembershipPlan.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. POST /api/admin/memberships
 * Create a new membership plan
 */
export async function createPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const {
      name,
      slug: customSlug,
      description,
      originalPrice,
      discountedPrice,
      currency,
      billingPeriod,
      durationDays,
      features,
      isActive,
      isPopular,
      displayOrder,
      seasonalLabel,
      seasonalDiscount,
      isSeasonalOffer,
      badge,
      bestFor,
      contactRequestLimit,
      isUnlimitedContact,
      profileViewLimit,
      ctaText,
      ctaAction,
      disclaimer,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Plan name is required.',
      });
    }

    let slug = (customSlug || generateSlug(name)).toLowerCase().trim();
    if (!slug) {
      slug = `plan-${Date.now()}`;
    }

    // Check slug collision
    const existingSlug = await MembershipPlan.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    const regPrice = Number(originalPrice) >= 0 ? Number(originalPrice) : 0;
    const discPrice = Number(discountedPrice) >= 0 ? Number(discountedPrice) : regPrice;

    const parsedDurationDays = Number(durationDays) > 0 ? Number(durationDays) : 30;
    const parsedFeatures = Array.isArray(features)
      ? features.map((f: any) => String(f).trim()).filter(Boolean)
      : [];

    const plan = new MembershipPlan({
      name: name.trim(),
      slug,
      key: slug.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase(),
      planId: `plan_${slug.replace(/[^a-zA-Z0-9]/g, '_')}`,
      description: (description || '').trim(),
      originalPrice: regPrice,
      discountedPrice: discPrice,
      price: discPrice,
      currency: (currency || 'INR').toUpperCase().trim(),
      billingPeriod: (billingPeriod || 'Monthly').trim(),
      durationDays: parsedDurationDays,
      durationMonths: Math.round(parsedDurationDays / 30) || null,
      features: parsedFeatures,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isPopular: Boolean(isPopular),
      displayOrder: Number(displayOrder) || 1,
      seasonalLabel: (seasonalLabel || '').trim(),
      seasonalDiscount: Number(seasonalDiscount) || 0,
      isSeasonalOffer: Boolean(isSeasonalOffer || seasonalLabel),
      badge: (badge || '').trim(),
      bestFor: (bestFor || '').trim(),
      contactRequestLimit: Number(contactRequestLimit) || 0,
      isUnlimitedContact: Boolean(isUnlimitedContact),
      profileViewLimit: profileViewLimit === 'unlimited' ? 'unlimited' : 'limited',
      ctaText: (ctaText || 'Select Plan').trim(),
      ctaAction: ['register', 'order', 'contact'].includes(ctaAction) ? ctaAction : 'order',
      disclaimer: (disclaimer || '').trim(),
    });

    await plan.save();

    res.status(201).json({
      success: true,
      message: `Membership plan "${plan.name}" created successfully.`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. PUT /api/admin/memberships/:id
 * Update an existing membership plan
 */
export async function updatePlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    let plan = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      plan = await MembershipPlan.findById(id);
    }
    if (!plan) {
      plan = await MembershipPlan.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found.',
      });
    }

    const {
      name,
      slug: customSlug,
      description,
      originalPrice,
      discountedPrice,
      currency,
      billingPeriod,
      durationDays,
      features,
      isActive,
      isPopular,
      displayOrder,
      seasonalLabel,
      seasonalDiscount,
      isSeasonalOffer,
      badge,
      bestFor,
      contactRequestLimit,
      isUnlimitedContact,
      profileViewLimit,
      ctaText,
      ctaAction,
      disclaimer,
    } = req.body;

    if (name !== undefined) plan.name = String(name).trim();

    if (customSlug !== undefined && customSlug.trim() !== '') {
      const targetSlug = customSlug.toLowerCase().trim();
      if (targetSlug !== plan.slug) {
        const slugExists = await MembershipPlan.findOne({
          slug: targetSlug,
          _id: { $ne: plan._id },
        });
        if (slugExists) {
          return res.status(400).json({
            success: false,
            message: `A plan with slug "${targetSlug}" already exists.`,
          });
        }
        plan.slug = targetSlug;
        plan.key = targetSlug.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      }
    }

    if (description !== undefined) plan.description = String(description).trim();

    if (originalPrice !== undefined) {
      plan.originalPrice = Math.max(0, Number(originalPrice) || 0);
    }

    if (discountedPrice !== undefined) {
      plan.discountedPrice = Math.max(0, Number(discountedPrice) || 0);
      plan.price = plan.discountedPrice;
    } else if (originalPrice !== undefined && plan.discountedPrice === undefined) {
      plan.discountedPrice = plan.originalPrice;
      plan.price = plan.originalPrice;
    }

    if (currency !== undefined) plan.currency = String(currency).toUpperCase().trim();
    if (billingPeriod !== undefined) plan.billingPeriod = String(billingPeriod).trim();

    if (durationDays !== undefined) {
      const days = Number(durationDays);
      plan.durationDays = days > 0 ? days : 30;
      plan.durationMonths = Math.round(plan.durationDays / 30) || null;
    }

    if (features !== undefined && Array.isArray(features)) {
      plan.features = features.map((f: any) => String(f).trim()).filter(Boolean);
    }

    if (isActive !== undefined) plan.isActive = Boolean(isActive);
    if (isPopular !== undefined) plan.isPopular = Boolean(isPopular);
    if (displayOrder !== undefined) plan.displayOrder = Number(displayOrder) || 1;

    if (seasonalLabel !== undefined) plan.seasonalLabel = String(seasonalLabel).trim();
    if (seasonalDiscount !== undefined) plan.seasonalDiscount = Number(seasonalDiscount) || 0;
    if (isSeasonalOffer !== undefined) {
      plan.isSeasonalOffer = Boolean(isSeasonalOffer);
    } else if (seasonalLabel !== undefined) {
      plan.isSeasonalOffer = Boolean(String(seasonalLabel).trim().length > 0);
    }

    if (badge !== undefined) plan.badge = String(badge).trim();
    if (bestFor !== undefined) plan.bestFor = String(bestFor).trim();
    if (contactRequestLimit !== undefined) plan.contactRequestLimit = Number(contactRequestLimit) || 0;
    if (isUnlimitedContact !== undefined) plan.isUnlimitedContact = Boolean(isUnlimitedContact);
    if (profileViewLimit !== undefined) {
      plan.profileViewLimit = profileViewLimit === 'unlimited' ? 'unlimited' : 'limited';
    }
    if (ctaText !== undefined) plan.ctaText = String(ctaText).trim();
    if (ctaAction !== undefined && ['register', 'order', 'contact'].includes(ctaAction)) {
      plan.ctaAction = ctaAction;
    }
    if (disclaimer !== undefined) plan.disclaimer = String(disclaimer).trim();

    await plan.save();

    res.json({
      success: true,
      message: `Plan "${plan.name}" updated successfully.`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. DELETE /api/admin/memberships/:id
 * Delete a membership plan
 */
export async function deletePlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    let plan = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      plan = await MembershipPlan.findById(id);
    }
    if (!plan) {
      plan = await MembershipPlan.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found.',
      });
    }

    const planName = plan.name;
    await MembershipPlan.findByIdAndDelete(plan._id);

    res.json({
      success: true,
      message: `Membership plan "${planName}" deleted successfully.`,
      data: { id: plan._id, name: planName },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. PATCH /api/admin/memberships/:id/status
 * Toggle active status of a plan
 */
export async function togglePlanStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    let plan = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      plan = await MembershipPlan.findById(id);
    }
    if (!plan) {
      plan = await MembershipPlan.findOne({ slug: id.toLowerCase().trim() });
    }

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Membership plan not found.',
      });
    }

    if (req.body && req.body.isActive !== undefined) {
      plan.isActive = Boolean(req.body.isActive);
    } else {
      plan.isActive = !plan.isActive;
    }

    await plan.save();

    res.json({
      success: true,
      message: `Plan "${plan.name}" is now ${plan.isActive ? 'Active' : 'Inactive'}.`,
      data: {
        _id: plan._id,
        slug: plan.slug,
        name: plan.name,
        isActive: plan.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
}
