import express from 'express';
import { authService } from '../services/AuthService';
import { authMiddleware, permissionMiddleware } from '../middleware/AuthMiddleware';
import { ApiError } from '../utils/errors';

const router = express.Router();

/**
 * Create a new tenant
 *
 * POST /api/tenants
 */
router.post('/', authMiddleware, permissionMiddleware('admin', 'system:tenants'), async (req, res, next) => {
  try {
    const { id, name } = req.body;
    const adminUserId = req.user?.id;

    if (!id || !name || !adminUserId) {
      throw new ApiError(400, 'Missing required fields');
    }

    const success = await authService.createTenant(id, adminUserId);

    if (!success) {
      throw new ApiError(400, 'Failed to create tenant');
    }

    res.status(201).json({
      status: 'success',
      data: {
        id,
        name
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all tenants
 *
 * GET /api/tenants
 */
router.get('/', authMiddleware, permissionMiddleware('admin', 'system:tenants'), async (req, res, next) => {
  try {
    const tenants = await authService.listTenants();

    res.json({
      status: 'success',
      data: tenants
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a tenant
 *
 * DELETE /api/tenants/:id
 */
router.delete('/:id', authMiddleware, permissionMiddleware('admin', 'system:tenants'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const success = await authService.deleteTenant(id);

    if (!success) {
      throw new ApiError(400, 'Failed to delete tenant');
    }

    res.json({
      status: 'success'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
