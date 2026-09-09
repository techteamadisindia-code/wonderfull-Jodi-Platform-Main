import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from '../utils/securityUtils';

/**
 * Middleware to validate that a URL parameter is a valid MongoDB ObjectId
 */
export function validateObjectIdParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ID parameter format for '${paramName}'`,
      });
    }
    next();
  };
}
