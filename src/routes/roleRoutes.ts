import { Router, Request, Response, NextFunction } from 'express';
import { roleService } from '../services/roleService';
import { authMiddleware } from '../middleware/AuthMiddleware';
import { ApiError, Role } from '@neurallog/client-sdk';

const router = Router();

/**
 * Create a new role
 *
 * POST /api/roles
 */
router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissions, inherits } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Validate input
    if (!name || !Array.isArray(permissions)) {
      throw new ApiError(400, 'Invalid input: name and permissions array are required');
    }

    // Check if the user has permission to create roles
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const hasPermission = await roleService.hasPermission(
      userId,
      'roles:create',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to create roles');
    }

    // Create the role
    const roleId = await roleService.createRole({
      name,
      description: description || '',
      permissions,
      inherits: inherits || [],
      tenantId
    });

    // Return role ID
    res.status(201).json({
      message: 'Role created successfully',
      roleId
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all roles
 *
 * GET /api/roles
 */
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Check if the user has permission to list roles
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const hasPermission = await roleService.hasPermission(
      userId,
      'roles:read',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to list roles');
    }

    // Get all roles
    const roles = await roleService.getRoles(tenantId);

    // Return roles list
    res.json({
      roles
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific role
 *
 * GET /api/roles/:roleId
 */
router.get('/:roleId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Check if the user has permission to read roles
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const hasPermission = await roleService.hasPermission(
      userId,
      'roles:read',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to read roles');
    }

    // Get the role
    const role = await roleService.getRole(roleId, tenantId);

    if (!role) {
      throw new ApiError(404, 'Role not found');
    }

    // Return role
    res.json({
      role
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update a role
 *
 * PUT /api/roles/:roleId
 */
router.put('/:roleId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId } = req.params;
    const { name, description, permissions, inherits } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Check if the user has permission to update roles
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const hasPermission = await roleService.hasPermission(
      userId,
      'roles:update',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to update roles');
    }

    // Update the role
    const updates: any = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (permissions !== undefined) updates.permissions = permissions;
    if (inherits !== undefined) updates.inherits = inherits;

    const success = await roleService.updateRole(roleId, updates, tenantId);

    if (!success) {
      throw new ApiError(404, 'Role not found');
    }

    // Return success message
    res.json({
      message: 'Role updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a role
 *
 * DELETE /api/roles/:roleId
 */
router.delete('/:roleId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Check if the user has permission to delete roles
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const hasPermission = await roleService.hasPermission(
      userId,
      'roles:delete',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to delete roles');
    }

    // Delete the role
    const success = await roleService.deleteRole(roleId, tenantId);

    if (!success) {
      throw new ApiError(404, 'Role not found');
    }

    // Return success message
    res.json({
      message: 'Role deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Assign a role to a user
 *
 * POST /api/roles/:roleId/assign
 */
router.post('/:roleId/assign', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId } = req.params;
    const { userId, organizationId } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Validate input
    if (!userId) {
      throw new ApiError(400, 'Invalid input: userId is required');
    }

    // Check if the user has permission to assign roles
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const hasPermission = await roleService.hasPermission(
      requestingUserId,
      'roles:assign',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to assign roles');
    }

    // Assign the role
    const success = await roleService.assignRole(userId, roleId, tenantId, organizationId);

    if (!success) {
      throw new ApiError(404, 'Role not found');
    }

    // Return success message
    res.json({
      message: 'Role assigned successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Revoke a role from a user
 *
 * POST /api/roles/:roleId/revoke
 */
router.post('/:roleId/revoke', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roleId } = req.params;
    const { userId, organizationId } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Validate input
    if (!userId) {
      throw new ApiError(400, 'Invalid input: userId is required');
    }

    // Check if the user has permission to revoke roles
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const hasPermission = await roleService.hasPermission(
      requestingUserId,
      'roles:revoke',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to revoke roles');
    }

    // Revoke the role
    const success = await roleService.revokeRole(userId, roleId, tenantId, organizationId);

    if (!success) {
      throw new ApiError(404, 'Role assignment not found');
    }

    // Return success message
    res.json({
      message: 'Role revoked successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all roles for a user
 *
 * GET /api/roles/user/:userId
 */
router.get('/user/:userId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { organizationId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Check if the user has permission to read roles
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Users can view their own roles, or admins can view any user's roles
    const isSelf = requestingUserId === userId;
    const hasPermission = isSelf || await roleService.hasPermission(
      requestingUserId,
      'roles:read',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to view roles');
    }

    // Get the roles
    const roleIds = await roleService.getUserRoles(
      userId,
      tenantId,
      organizationId as string | undefined
    );

    // Get the role details
    const roles = [];

    for (const roleId of roleIds) {
      const role = await roleService.getRole(roleId, tenantId);
      if (role) {
        roles.push(role);
      }
    }

    // Return roles list
    res.json({
      roles
    });
  } catch (error) {
    next(error);
  }
});

export default router;
