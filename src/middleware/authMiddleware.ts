import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { authService } from '../services/AuthService';
import { logger } from '../services/logger';

/**
 * Middleware to authenticate requests
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    if (!authHeader) {
      throw new ApiError(401, 'Authorization header is required');
    }

    // Extract the token
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new ApiError(401, 'Invalid authorization header');
    }

    // Validate the token
    const { valid, user } = await authService.validateToken(token, tenantId);

    if (!valid || !user) {
      throw new ApiError(401, 'Invalid token');
    }

    // Attach the user to the request
    req.user = user;

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }

    logger.error('Authentication error', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to check if the user has a specific permission
 */
export const permissionMiddleware = (permission: string, resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      if (!user) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Check if the user has the permission
      const hasPermission = await authService.check({
        user: `user:${user.id}`,
        relation: permission,
        object: resource,
        tenantId
      });

      if (!hasPermission) {
        throw new ApiError(403, 'Forbidden');
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          status: 'error',
          message: error.message
        });
      }

      logger.error('Permission check error', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  };
};
