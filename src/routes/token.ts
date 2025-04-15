/**
 * Resource token routes for the NeuralLog auth service
 */

import express from 'express';
import { authenticate } from '../middleware/Authenticate';
import { authorize } from '../middleware/Authorize';
import { TokenService } from '../services/TokenService';
import { logger } from '../utils/logger';

const router = express.Router();
const tokenService = new TokenService();

/**
 * Create a resource token
 *
 * POST /token
 */
router.post('/', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const { resource } = req.body;

    // Validate input
    if (!resource) {
      return res.status(400).json({
        error: 'Missing required field: resource'
      });
    }

    // Parse resource
    const [resourceType, resourceId] = resource.split('/');

    // Check if user has permission to access the resource
    const canAccess = await authorize(userId, resourceType, 'read');

    if (!canAccess) {
      return res.status(403).json({
        error: 'You do not have permission to access this resource'
      });
    }

    // Create resource token
    const token = await tokenService.createResourceToken(userId, tenantId, resource);

    res.json({
      token: token.token,
      expiresAt: token.expiresAt
    });
  } catch (error) {
    logger.error('Error creating resource token:', error);
    res.status(500).json({ error: 'Failed to create resource token' });
  }
});

/**
 * Verify a resource token
 *
 * POST /token/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { token, resource } = req.body;

    // Validate input
    if (!token || !resource) {
      return res.status(400).json({
        error: 'Missing required fields: token, resource'
      });
    }

    // Verify token
    const tokenData = await tokenService.verifyResourceToken(token, resource);

    if (!tokenData) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    res.json({
      valid: true,
      userId: tokenData.userId,
      tenantId: tokenData.tenantId,
      resource: tokenData.resource,
      expiresAt: tokenData.expiresAt
    });
  } catch (error) {
    logger.error('Error verifying resource token:', error);
    res.status(500).json({ error: 'Failed to verify resource token' });
  }
});

/**
 * Revoke a resource token
 *
 * DELETE /token/:token
 */
router.delete('/:token', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const token = req.params.token;

    // Get token data
    const tokenData = await tokenService.getResourceToken(token);

    if (!tokenData) {
      return res.status(404).json({
        error: 'Token not found'
      });
    }

    // Check if user owns the token
    if (tokenData.userId !== userId) {
      // Check if user has permission to revoke other users' tokens
      const canRevokeOtherTokens = await authorize(userId, 'token', 'admin');

      if (!canRevokeOtherTokens) {
        return res.status(403).json({
          error: 'You do not have permission to revoke this token'
        });
      }
    }

    // Revoke token
    await tokenService.revokeResourceToken(token);

    res.status(204).end();
  } catch (error) {
    logger.error('Error revoking resource token:', error);
    res.status(500).json({ error: 'Failed to revoke resource token' });
  }
});

export default router;
