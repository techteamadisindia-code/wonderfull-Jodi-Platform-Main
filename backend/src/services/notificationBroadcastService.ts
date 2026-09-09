import mongoose from 'mongoose';
import { Broadcast, BroadcastType, BroadcastTargetType, IBroadcast } from '../models/Broadcast';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { AuditLog } from '../models/AuditLog';
import { isValidObjectId } from '../utils/securityUtils';

/**
 * Validates and sanitizes internal or relative action URLs
 */
export function sanitizeActionUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Reject unsafe schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return undefined;
  }

  // Allow relative URLs starting with / or safe https URLs
  if (trimmed.startsWith('/') || trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed.slice(0, 500);
  }

  // Default to relative path
  return `/${trimmed}`.slice(0, 500);
}

/**
 * Calculates target recipient count using efficient MongoDB count queries
 */
export async function getRecipientCount(
  targetType: BroadcastTargetType,
  targetUserIds?: string[]
): Promise<number> {
  switch (targetType) {
    case 'ALL_USERS':
      return await User.countDocuments({ role: 'user' });

    case 'ACTIVE_USERS':
      return await User.countDocuments({ role: 'user', isActive: true });

    case 'INACTIVE_USERS':
      return await User.countDocuments({ role: 'user', isActive: false });

    case 'VERIFIED_USERS':
      return await User.countDocuments({
        role: 'user',
        isActive: true,
        $or: [{ verified: true }, { verificationStatus: 'VERIFIED' }],
      });

    case 'PREMIUM_USERS': {
      const activeUsers = await User.find({ role: 'user', isActive: true }).select('_id');
      const activeIds = activeUsers.map((u) => u._id);
      if (!activeIds.length) return 0;

      const subscribedUsers = await Subscription.distinct('user', {
        user: { $in: activeIds },
        status: 'ACTIVE',
        $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
      });
      return subscribedUsers.length;
    }

    case 'SELECTED_USERS': {
      if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        return 0;
      }
      const validIds = targetUserIds.filter((id) => isValidObjectId(id));
      if (!validIds.length) return 0;
      return await User.countDocuments({ _id: { $in: validIds }, role: 'user' });
    }

    default:
      return await User.countDocuments({ role: 'user', isActive: true });
  }
}

/**
 * Resolves recipient user IDs based on targeting criteria
 */
export async function resolveRecipientIds(
  targetType: BroadcastTargetType,
  targetUserIds?: string[]
): Promise<mongoose.Types.ObjectId[]> {
  switch (targetType) {
    case 'ALL_USERS': {
      const users = await User.find({ role: 'user' }).select('_id');
      return users.map((u) => u._id);
    }

    case 'ACTIVE_USERS': {
      const users = await User.find({ role: 'user', isActive: true }).select('_id');
      return users.map((u) => u._id);
    }

    case 'INACTIVE_USERS': {
      const users = await User.find({ role: 'user', isActive: false }).select('_id');
      return users.map((u) => u._id);
    }

    case 'VERIFIED_USERS': {
      const users = await User.find({
        role: 'user',
        isActive: true,
        $or: [{ verified: true }, { verificationStatus: 'VERIFIED' }],
      }).select('_id');
      return users.map((u) => u._id);
    }

    case 'PREMIUM_USERS': {
      const activeUsers = await User.find({ role: 'user', isActive: true }).select('_id');
      const activeIds = activeUsers.map((u) => u._id);
      if (!activeIds.length) return [];

      const subscribedUserIds = await Subscription.distinct('user', {
        user: { $in: activeIds },
        status: 'ACTIVE',
        $or: [{ expiryDate: { $gt: new Date() } }, { expiryDate: null }],
      });
      return subscribedUserIds as mongoose.Types.ObjectId[];
    }

    case 'SELECTED_USERS': {
      if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
        return [];
      }
      const validIds = targetUserIds.filter((id) => isValidObjectId(id));
      if (!validIds.length) return [];
      const users = await User.find({ _id: { $in: validIds }, role: 'user' }).select('_id');
      return users.map((u) => u._id);
    }

    default: {
      const users = await User.find({ role: 'user', isActive: true }).select('_id');
      return users.map((u) => u._id);
    }
  }
}

/**
 * Creates and dispatches a broadcast notification to target users with chunked bulk insertions
 */
export async function createAndDispatchBroadcast(params: {
  adminId: string;
  adminEmail: string;
  title: string;
  message: string;
  type: BroadcastType;
  targetType: BroadcastTargetType;
  targetUserIds?: string[];
  actionUrl?: string;
  io?: any;
}): Promise<IBroadcast> {
  const { adminId, adminEmail, title, message, type, targetType, targetUserIds, actionUrl, io } = params;

  const sanitizedUrl = sanitizeActionUrl(actionUrl);
  const recipientIds = await resolveRecipientIds(targetType, targetUserIds);

  const broadcast = await Broadcast.create({
    title,
    message,
    type,
    targetType,
    targetUserIds:
      targetType === 'SELECTED_USERS'
        ? recipientIds
        : undefined,
    actionUrl: sanitizedUrl,
    createdBy: new mongoose.Types.ObjectId(adminId),
    status: 'SENT',
    totalRecipients: recipientIds.length,
    deliveredCount: recipientIds.length,
    readCount: 0,
    sentAt: new Date(),
  });

  // Perform bulk insertion in chunks of 500 to maintain high performance and low memory
  if (recipientIds.length > 0) {
    const CHUNK_SIZE = 500;
    for (let i = 0; i < recipientIds.length; i += CHUNK_SIZE) {
      const chunk = recipientIds.slice(i, i + CHUNK_SIZE);
      const notificationsToInsert = chunk.map((userId) => ({
        user: userId,
        broadcast: broadcast._id,
        type,
        title,
        message,
        actionUrl: sanitizedUrl,
        link: sanitizedUrl,
        read: false,
      }));
      await Notification.insertMany(notificationsToInsert, { ordered: false });
    }
  }

  // Audit Logging
  try {
    await AuditLog.create({
      adminEmail: adminEmail || 'admin@wonderfuljodi.com',
      action: 'BROADCAST_SENT',
      details: `Sent ${type} broadcast "${title}" to ${recipientIds.length} recipients (${targetType})`,
      targetModel: 'Broadcast',
      targetId: String(broadcast._id),
      status: 'SUCCESS',
    });
  } catch (err) {
    console.error('Failed to log admin action for broadcast:', err);
  }

  // Real-time emission via Socket.IO if available
  if (io) {
    try {
      io.emit('new_notification', {
        broadcastId: broadcast._id,
        title,
        message,
        type,
        actionUrl: sanitizedUrl,
        createdAt: new Date().toISOString(),
      });
    } catch (socketErr) {
      console.warn('Socket.IO notification broadcast emit skipped:', socketErr);
    }
  }

  return broadcast;
}
