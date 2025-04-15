/**
 * Authorization middleware for the NeuralLog auth service
 */

import { Request, Response, NextFunction } from 'express';
import { OpenFGAClient } from '../services/OpenFGAClient';
import { logger } from '../utils/logger';

const openFgaService = new OpenFGAClient();

/**
 * Authorize a user for a resource and action
 *
 * @param userId User ID
 * @param resource Resource type
 * @param action Action to perform
 * @returns Whether the user is authorized
 */
export async function authorize(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    logger.debug('Authorizing user', { userId, resource, action });
    
    // Check if user has permission to perform action on resource
    const result = await openFgaService.checkPermission(userId, resource, action);
    return result;
  } catch (error) {
    logger.error('Error authorizing user', { error, userId, resource, action });
    return false;
  }
}

/**
 * Authorize middleware
 *
 * @param role Role required to access the resource
 * @param resource Resource to check access for
 * @returns Express middleware
 */
export function authorizeMiddleware(role: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from request
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Check if user has permission to perform action on resource
      const hasPermission = await authorize(userId, resource, role);
      
      if (!hasPermission) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Error in authorize middleware', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
