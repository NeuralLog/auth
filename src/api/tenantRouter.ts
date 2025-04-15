import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { ApiError, Tenant } from '@neurallog/client-sdk';

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
        // Return tenant using the shared Tenant type
        const tenant: Tenant = {
          tenantId,
          adminUserId
        };
        res.status(201).json(tenant);
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
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // List tenants
      const tenants = await authService.listTenants();

      // Return tenants list
      res.json({
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
        // Return success message
        res.json({
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
