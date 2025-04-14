/**
 * Authorization middleware for the NeuralLog auth service
 */

import { Request, Response, NextFunction } from 'express';
import { OpenFgaClient } from '../services/OpenFgaClient';
import { logger } from '../utils/logger';

const openFgaClient = new OpenFgaClient();

/**
 * Authorize a user for a resource and action
 * 
 * @param userId User ID
 * @param resource Resource type
 * @param action Action
 * @returns Whether the user is authorized
 */
export async function authorize(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    return await openFgaClient.check(userId, resource, action);
  } catch (error) {
    logger.error('Error in authorize function:', error);
    return false;
  }
}

/**
 * Authorization middleware
 * 
 * @param resource Resource type
 * @param action Action
 * @returns Middleware function
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      
      const userId = req.user.id;
      
      // Check if user has permission
      const hasPermission = await authorize(userId, resource, action);
      
      if (!hasPermission) {
        res.status(403).json({
          error: `You do not have permission to ${action} ${resource}`
        });
        return;
      }
      
      next();
    } catch (error) {
      logger.error('Error in requirePermission middleware:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
