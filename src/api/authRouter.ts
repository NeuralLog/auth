import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../services/logger';

export const authRouter = (authService: AuthService): Router => {
  const router = Router();
  
  /**
   * Check if a user has permission to access a resource
   * 
   * POST /api/auth/check
   */
  router.post('/check', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, relation, object, contextualTuples } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      
      // Validate request
      if (!user || !relation || !object) {
        throw new ApiError(400, 'Missing required parameters: user, relation, object');
      }
      
      // Check permission
      const allowed = await authService.check({
        user,
        relation,
        object,
        contextualTuples,
        tenantId
      });
      
      res.json({
        status: 'success',
        allowed
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Grant a permission to a user
   * 
   * POST /api/auth/grant
   */
  router.post('/grant', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, relation, object } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      
      // Validate request
      if (!user || !relation || !object) {
        throw new ApiError(400, 'Missing required parameters: user, relation, object');
      }
      
      // Grant permission
      const success = await authService.grant({
        user,
        relation,
        object,
        tenantId
      });
      
      if (success) {
        res.json({
          status: 'success',
          message: 'Permission granted'
        });
      } else {
        throw new ApiError(500, 'Failed to grant permission');
      }
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Revoke a permission from a user
   * 
   * POST /api/auth/revoke
   */
  router.post('/revoke', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, relation, object } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      
      // Validate request
      if (!user || !relation || !object) {
        throw new ApiError(400, 'Missing required parameters: user, relation, object');
      }
      
      // Revoke permission
      const success = await authService.revoke({
        user,
        relation,
        object,
        tenantId
      });
      
      if (success) {
        res.json({
          status: 'success',
          message: 'Permission revoked'
        });
      } else {
        throw new ApiError(500, 'Failed to revoke permission');
      }
    } catch (error) {
      next(error);
    }
  });
  
  return router;
};
