import { Router, Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKeyService';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../services/logger';
import { AuthService } from '../services/authService';

export const apiKeyRouter = (authService: AuthService, apiKeyService: ApiKeyService): Router => {
  const router = Router();

  /**
   * Create a new API key
   *
   * POST /api/apikeys
   */
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, scopes } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Get the user ID from the authenticated user
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Validate request
      if (!name) {
        throw new ApiError(400, 'Name is required');
      }

      // Create the API key
      const { apiKey, keyData } = await apiKeyService.createApiKey(userId, tenantId, name, scopes);

      // Return the API key
      res.json({
        apiKey,
        id: keyData.id,
        name: keyData.name,
        scopes: keyData.scopes,
        createdAt: keyData.createdAt,
        expiresAt: keyData.expiresAt
      });
    } catch (error) {
      logger.error('Error creating API key:', error);
      next(error);
    }
  });

  /**
   * Get API keys for the authenticated user
   *
   * GET /api/apikeys
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Get the user ID from the authenticated user
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Get the API keys
      const apiKeys = await apiKeyService.getApiKeys(userId, tenantId);

      // Return the API keys
      res.json({
        apiKeys: apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          scopes: key.scopes,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          lastUsedAt: key.lastUsedAt
        }))
      });
    } catch (error) {
      logger.error('Error getting API keys:', error);
      next(error);
    }
  });

  /**
   * Revoke an API key
   *
   * DELETE /api/apikeys/:id
   */
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Get the user ID from the authenticated user
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Revoke the API key
      const success = await apiKeyService.revokeApiKey(id, userId, tenantId);

      if (!success) {
        throw new ApiError(404, 'API key not found');
      }

      // Return success
      res.json({ success: true });
    } catch (error) {
      logger.error('Error revoking API key:', error);
      next(error);
    }
  });

  /**
   * Verify an API key
   *
   * POST /api/apikeys/verify
   */
  router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { apiKey } = req.body;

      // Validate request
      if (!apiKey) {
        throw new ApiError(400, 'API key is required');
      }

      // Verify the API key
      const result = await apiKeyService.verifyApiKey(apiKey);

      if (!result) {
        throw new ApiError(401, 'Invalid API key');
      }

      // Return the verification result
      res.json({
        valid: true,
        userId: result.userId,
        tenantId: result.tenantId,
        scopes: result.scopes
      });
    } catch (error) {
      logger.error('Error verifying API key:', error);
      next(error);
    }
  });

  return router;
};
