import { Request, Response, NextFunction } from 'express';
import { AuthClient, TenantRole } from './index';

// Extend Express Request interface to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Express middleware for authorization
 */
export const authMiddleware = (authClient: AuthClient) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user from request (e.g., from JWT token)
      const userId = extractUserId(req);

      // Determine the resource and action
      const { resource, action } = determineResourceAndAction(req);

      // Check if user has permission
      const hasPermission = await authClient.check({
        user: userId,
        permission: action,
        resource
      });

      if (hasPermission) {
        next();
      } else {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden'
        });
      }
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Extract user ID from request
 */
function extractUserId(req: Request): string {
  // Extract from JWT token or session
  // This is a placeholder implementation
  return (req.headers['x-user-id'] as string) || 'anonymous';
}

/**
 * Determine resource and action from request
 */
function determineResourceAndAction(req: Request): { resource: string, action: string } {
  // Parse path and method to determine resource and action
  const path = req.path;
  const method = req.method;

  // Example: /api/logs/test-log
  const matches = path.match(/\/api\/logs\/([^\/]+)(?:\/([^\/]+))?/);
  if (matches) {
    const logName = matches[1];
    const logId = matches[2];

    if (logId) {
      return {
        resource: `log_entry:${logId}`,
        action: mapMethodToAction(method)
      };
    } else {
      return {
        resource: `log:${logName}`,
        action: mapMethodToAction(method)
      };
    }
  }

  // Default
  return {
    resource: path,
    action: mapMethodToAction(method)
  };
}

/**
 * Map HTTP method to action
 */
function mapMethodToAction(method: string): string {
  switch (method) {
    case 'GET':
      return 'read';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return 'write';
    case 'DELETE':
      return 'admin';
    default:
      return 'read';
  }
}
