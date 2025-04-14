import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../services/logger';

export const tenantRouter = (authService: AuthService): Router => {
  const router = Router();
  
  /**
   * Create a new tenant
   * 
   * POST /api/tenants
   */
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, adminUserId } = req.body;
      
      // Validate request
      if (!tenantId || !adminUserId) {
        throw new ApiError(400, 'Missing required parameters: tenantId, adminUserId');
      }
      
      // Create tenant
      const success = await authService.createTenant(tenantId, adminUserId);
      
      if (success) {
        res.status(201).json({
          status: 'success',
          message: 'Tenant created successfully',
          tenantId,
          adminUserId
        });
      } else {
        throw new ApiError(500, 'Failed to create tenant');
      }
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * List all tenants
   * 
   * GET /api/tenants
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // List tenants
      const tenants = await authService.listTenants();
      
      res.json({
        status: 'success',
        tenants
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Delete a tenant
   * 
   * DELETE /api/tenants/:tenantId
   */
  router.delete('/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.params;
      
      // Delete tenant
      const success = await authService.deleteTenant(tenantId);
      
      if (success) {
        res.json({
          status: 'success',
          message: 'Tenant deleted successfully',
          tenantId
        });
      } else {
        throw new ApiError(500, 'Failed to delete tenant');
      }
    } catch (error) {
      next(error);
    }
  });
  
  return router;
};
