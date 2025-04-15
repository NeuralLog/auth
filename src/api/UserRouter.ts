import { Router, Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { ApiError } from '@neurallog/client-sdk';
import { logger } from '../services/logger';

export const userRouter = (userService: UserService): Router => {
  const router = Router();

  /**
   * Get user profile
   * 
   * GET /api/users/:userId/profile
   */
  router.get('/:userId/profile', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Get user
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Check if the user belongs to the tenant
      if (user.tenantId !== tenantId) {
        throw new ApiError(403, 'User does not belong to this tenant');
      }

      // Return the user profile (without status field)
      res.json({
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        name: user.name || undefined
      });
    } catch (error) {
      logger.error('Error getting user profile', error);
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError(500, 'Failed to get user profile'));
      }
    }
  });

  return router;
};
