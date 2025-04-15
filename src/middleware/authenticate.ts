/**
 * Authentication middleware for the NeuralLog auth service
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        tenantId: string;
        roles: string[];
      };
    }
  }
}

const userService = new UserService();

/**
 * Authenticate middleware
 *
 * @param req Request
 * @param res Response
 * @param next Next function
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header' });
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'neurallog-secret';

    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        userId: string;
        exp: number;
      };

      // Check if token has expired
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp < now) {
        res.status(401).json({ error: 'Token has expired' });
        return;
      }

      // Get user
      const user = await userService.getUserById(decoded.userId);

      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Set user on request
      req.user = {
        id: user.id,
        username: user.name || '',
        email: user.email,
        tenantId: user.tenantId,
        roles: user.role ? [user.role] : []
      };

      next();
    } catch (error) {
      logger.error('Error verifying token:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Error in authenticate middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
