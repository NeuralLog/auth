import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { logger } from '../services/logger';

/**
 * Middleware to check if a user has permission to access a resource
 *
 * @param relation The relation to check (e.g., 'admin', 'member', 'read', 'write')
 * @param objectType The type of object (e.g., 'tenant', 'log', 'apikey')
 * @param objectIdGetter Function to get the object ID from the request
 * @returns Express middleware
 */
export function checkPermission(
  relation: string,
  objectType: string,
  objectIdGetter: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from the authenticated user
      const userId = req.user?.id;

      if (!userId) {
        logger.warn('Authorization check failed: No user ID in request');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Get object ID from request
      const objectId = objectIdGetter(req);
      const object = `${objectType}:${objectId}`;

      logger.debug('Checking permission', { userId, relation, object, tenantId });

      // Check if the user has permission
      const allowed = await authService.check({
        user: `user:${userId}`,
        relation,
        object,
        tenantId
      });

      if (!allowed) {
        logger.warn('Permission denied', { userId, relation, object, tenantId });
        return res.status(403).json({ error: 'Forbidden' });
      }

      // User has permission, proceed to the next middleware
      next();
    } catch (error) {
      logger.error('Error checking permission', { error });
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to check if a user is a tenant admin
 *
 * @returns Express middleware
 */
export function checkTenantAdmin() {
  return checkPermission(
    'admin',
    'tenant',
    (req: Request) => req.headers['x-tenant-id'] as string || 'default'
  );
}

/**
 * Middleware to check if a user is a tenant member
 *
 * @returns Express middleware
 */
export function checkTenantMember() {
  return checkPermission(
    'member',
    'tenant',
    (req: Request) => req.headers['x-tenant-id'] as string || 'default'
  );
}

/**
 * Middleware to check if a user owns an API key
 *
 * @returns Express middleware
 */
export function checkApiKeyOwner() {
  return checkPermission(
    'owner',
    'apikey',
    (req: Request) => req.params.keyId || req.body.keyId
  );
}

/**
 * Middleware to check if a user has read access to a log
 *
 * @returns Express middleware
 */
export function checkLogReadAccess() {
  return checkPermission(
    'read',
    'log',
    (req: Request) => req.params.logSlug || req.body.logSlug
  );
}

/**
 * Middleware to check if a user has write access to a log
 *
 * @returns Express middleware
 */
export function checkLogWriteAccess() {
  return checkPermission(
    'write',
    'log',
    (req: Request) => req.params.logSlug || req.body.logSlug
  );
}
