"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateObjectIdParam = validateObjectIdParam;
const securityUtils_1 = require("../utils/securityUtils");
/**
 * Middleware to validate that a URL parameter is a valid MongoDB ObjectId
 */
function validateObjectIdParam(paramName = 'id') {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!id || !(0, securityUtils_1.isValidObjectId)(id)) {
            return res.status(400).json({
                success: false,
                message: `Invalid ID parameter format for '${paramName}'`,
            });
        }
        next();
    };
}
//# sourceMappingURL=validationMiddleware.js.map