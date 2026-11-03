"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const maintenanceMiddleware_1 = require("../middleware/maintenanceMiddleware");
const router = (0, express_1.Router)();
/**
 * Public lightweight endpoint to fetch platform maintenance status.
 * Safe for public consumption - does NOT expose sensitive admin or database information.
 */
router.get('/maintenance', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    try {
        const config = await (0, maintenanceMiddleware_1.getCachedMaintenanceConfig)();
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
    }
    catch (error) {
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
exports.default = router;
//# sourceMappingURL=configRoutes.js.map