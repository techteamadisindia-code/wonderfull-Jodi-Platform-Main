import { Router, Request, Response } from 'express';
import { getCachedMaintenanceConfig } from '../middleware/maintenanceMiddleware';

const router = Router();

/**
 * Public lightweight endpoint to fetch platform maintenance status.
 * Safe for public consumption - does NOT expose sensitive admin or database information.
 */
router.get('/maintenance', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const config = await getCachedMaintenanceConfig();
    return res.json({
      success: true,
      data: {
        enabled: config.enabled,
        banner: config.banner,
        title: config.title,
        message: config.message,
        estimatedEndTime: config.estimatedEndTime,
        allowAdminAccess: config.allowAdminAccess,
        allowNewRegistrations: config.allowNewRegistrations,
      },
    });
  } catch (error) {
    return res.json({
      success: true,
      data: {
        enabled: false,
        banner: false,
        title: "We'll Be Back Soon",
        message: 'Wonderful Jodi is currently undergoing scheduled maintenance. Please check back shortly.',
        estimatedEndTime: null,
        allowAdminAccess: true,
        allowNewRegistrations: true,
      },
    });
  }
});

export default router;
