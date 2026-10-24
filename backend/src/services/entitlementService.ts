import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { findPlanDynamic } from '../controllers/membershipController';
import mongoose from '../db/prismaBridge';

/**
 * Server-authoritative check for whether a user has an active, non-expired, paid membership.
 *
 * Requirements:
 * 1. Checks authenticated user ID.
 * 2. Checks active subscription in the database (status === 'ACTIVE').
 * 3. Checks expiry (expiryDate > now or expiryDate is null).
 * 4. Checks plan is NOT the Free plan (case-insensitive, planId, slug, key, price > 0).
 * 5. Honors admin role if user is an administrator.
 */
export async function hasActivePaidMembership(
  userId: string | mongoose.Types.ObjectId,
  userRole?: string
): Promise<boolean> {
  if (!userId) return false;
  const uid = typeof userId === 'object' ? String((userId as any)._id || (userId as any).id || userId) : String(userId);
  if (!uid || uid === 'undefined' || uid === 'null') return false;

  // Admin users have platform privileges ONLY IF verified as active admin in database
  if (userRole === 'admin') {
    try {
      const u = await User.findById(uid).select('role isActive isDeleted status');
      if (u && u.role === 'admin' && u.isActive !== false && !u.isDeleted && u.status !== 'Deleted' && u.status !== 'Suspended') {
        return true;
      }
      return false; // Fail closed if not a verified active admin
    } catch {
      // Fail closed on database error or lookup failure
      return false;
    }
  }

  try {
    const now = new Date();
    // Query active subscriptions for this user
    const subscription = await Subscription.findOne({
      user: uid,
      status: 'ACTIVE',
      $or: [{ expiryDate: { $gt: now } }, { expiryDate: null }],
    }).sort({ createdAt: -1 });

    if (!subscription) {
      // Check if user is admin in database if role was not provided
      if (!userRole) {
        try {
          const u = await User.findById(uid).select('role isActive isDeleted status');
          if (u && u.role === 'admin' && u.isActive !== false && !u.isDeleted && u.status !== 'Deleted' && u.status !== 'Suspended') {
            return true;
          }
        } catch {
          return false;
        }
      }
      return false;
    }

    if (subscription.status !== 'ACTIVE') return false;
    const effectiveExpiry = subscription.expiryDate ?? (subscription as any).endDate;
    if (effectiveExpiry && new Date(effectiveExpiry) <= now) return false;

    // Check plan identifier
    const planIdentifier = (subscription.plan || subscription.planId || '').trim();
    if (!planIdentifier) return false;

    // Reject free plan variants and zero-cost aliases
    const lower = planIdentifier.toLowerCase();
    const freePlanAliases = [
      'free',
      'plan_free',
      'plan-free',
      'free_membership',
      'free-plan',
      'trial_free',
      'free_trial',
      '0',
      'none',
    ];
    if (freePlanAliases.includes(lower)) {
      return false;
    }

    // Verify against dynamic plan configuration
    const dynamicPlan = await findPlanDynamic(planIdentifier).catch(() => null);
    if (dynamicPlan) {
      if (dynamicPlan.slug === 'free' || dynamicPlan.key === 'FREE') return false;
      const amount =
        dynamicPlan.discountedPrice ??
        dynamicPlan.originalPrice ??
        dynamicPlan.amount ??
        dynamicPlan.price ??
        0;
      // Any plan with 0 or negative price is not a paid membership
      if (typeof amount === 'number' && amount <= 0) {
        return false;
      }
      return true;
    }

    // Check known paid plan keys
    const knownPaidKeys = [
      'DOCTOR_CONNECT',
      'PREMIUM_MATCH',
      'PRIORITY_MATCHMAKING',
      'EXCLUSIVE_CONCIERGE',
      'PREMIUM',
      'PREMIUM_VIP',
      'GOLD',
      'PLATINUM',
      'DIAMOND',
      'VVIP',
    ];
    if (knownPaidKeys.includes(subscription.plan?.toUpperCase())) {
      return true;
    }

    // Default to false if unrecognized
    return false;
  } catch (error) {
    console.error('[EntitlementService] Error checking paid membership entitlement:', error);
    return false;
  }
}
