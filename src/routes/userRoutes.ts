import { Router, Request, Response, NextFunction } from 'express';
import { userService } from '../services/UserService';
import { apiKeyService } from '../services/ApiKeyService';
import { roleService } from '../services/roleService';
import { authMiddleware } from '../middleware/AuthMiddleware';
import { ApiError } from '../utils/errors';
import type { UserProfile } from '@neurallog/client-sdk';

const router = Router();

/**
 * Get all users
 *
 * GET /api/users
 */
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Check if the user has permission to list users
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const hasPermission = await roleService.hasPermission(
      userId,
      'users:read',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to list users');
    }

    // Get all users
    const users = await userService.getUsers(tenantId);

    res.json(users);
  } catch (error) {
    next(error);
  }
});

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

    // Return the user profile using the shared UserProfile type
    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      name: user.name || ''
    };
    res.json(userProfile);
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific user
 *
 * GET /api/users/:userId
 */
router.get('/:userId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Check if the user has permission to read users
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Users can view their own profile, or admins can view any user
    const isSelf = requestingUserId === userId;
    const hasPermission = isSelf || await roleService.hasPermission(
      requestingUserId,
      'users:read',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to view this user');
    }

    // Get the user
    const user = await userService.getUser(userId, tenantId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a user
 *
 * DELETE /api/users/:userId
 */
router.delete('/:userId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Check if the user has permission to delete users
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Users cannot delete themselves, only admins can delete users
    const isSelf = requestingUserId === userId;

    if (isSelf) {
      throw new ApiError(403, 'Forbidden: You cannot delete your own account');
    }

    const hasPermission = await roleService.hasPermission(
      requestingUserId,
      'users:delete',
      tenantId
    );

    if (!hasPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to delete users');
    }

    // Get the user to check if they exist
    const user = await userService.getUser(userId, tenantId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Delete the user
    await userService.deleteUser(userId, tenantId);

    // Revoke all API keys for the user
    await apiKeyService.revokeAllApiKeysForUser(userId, tenantId);

    // Remove all role assignments for the user
    const roleIds = await roleService.getUserRoles(userId, tenantId);

    for (const roleId of roleIds) {
      await roleService.revokeRole(userId, roleId, tenantId);
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Update a user's roles
 *
 * PUT /api/users/:userId/roles
 */
router.put('/:userId/roles', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { roles, organizationId } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Validate input
    if (!Array.isArray(roles)) {
      throw new ApiError(400, 'Invalid input: roles array is required');
    }

    // Check if the user has permission to manage roles
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
      throw new ApiError(403, 'Forbidden: You do not have permission to manage user roles');
    }

    // Get the user to check if they exist
    const user = await userService.getUser(userId, tenantId);

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Get current roles
    const currentRoleIds = await roleService.getUserRoles(userId, tenantId, organizationId);

    // Calculate roles to add and remove
    const rolesToAdd = roles.filter(r => !currentRoleIds.includes(r));
    const rolesToRemove = currentRoleIds.filter(r => !roles.includes(r));

    // Add new roles
    for (const roleId of rolesToAdd) {
      await roleService.assignRole(userId, roleId, tenantId, organizationId);
    }

    // Remove old roles
    for (const roleId of rolesToRemove) {
      await roleService.revokeRole(userId, roleId, tenantId, organizationId);
    }

    res.json({ message: 'User roles updated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
