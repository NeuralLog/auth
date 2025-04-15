import { Router, Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/ApiKeyService';
import { ApiError } from '@neurallog/client-sdk';
import { logger } from '../services/logger';
import { userService } from '../services/UserService';
import { randomBytes } from 'crypto';

// Store challenges in memory (in a real implementation, use Redis or another distributed cache)
const challenges: Map<string, { challenge: string, expiresAt: number }> = new Map();

// Clean up expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of challenges.entries()) {
    if (value.expiresAt < now) {
      challenges.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const apiKeyRouter = (apiKeyService: ApiKeyService): Router => {
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
      res.json({ 
        message: 'API key revoked successfully' 
      });
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

  /**
   * Get a challenge for API key authentication
   *
   * GET /api/apikeys/challenge
   */
  router.get('/challenge', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate a random challenge
      const challenge = randomBytes(32).toString('base64');

      // Set expiration time (5 minutes)
      const expiresAt = Date.now() + (5 * 60 * 1000);

      // Store the challenge
      challenges.set(challenge, { challenge, expiresAt });

      // Return the challenge
      res.json({
        challenge,
        expiresIn: 300 // 5 minutes in seconds
      });
    } catch (error) {
      logger.error('Error generating API key challenge', error);
      next(new ApiError(500, 'Failed to generate challenge'));
    }
  });

  /**
   * Verify a challenge response for API key authentication
   *
   * POST /api/apikeys/verify-challenge
   */
  router.post('/verify-challenge', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { challenge, response } = req.body;
      // Get tenant ID from headers (not used in this endpoint but kept for consistency)

      // Validate request
      if (!challenge || !response) {
        throw new ApiError(400, 'Missing required parameters: challenge, response');
      }

      // Check if the challenge exists and is not expired
      const challengeData = challenges.get(challenge);
      if (!challengeData || challengeData.expiresAt < Date.now()) {
        throw new ApiError(400, 'Invalid or expired challenge');
      }

      // Extract the key ID from the response
      const [keyId] = response.split('.');
      if (!keyId) {
        throw new ApiError(400, 'Invalid response format');
      }

      // Get the API key data
      const keyData = await apiKeyService.getApiKeyById(keyId);
      if (!keyData || keyData.revoked) {
        throw new ApiError(401, 'Invalid API key');
      }

      // Verify the response
      const isValid = await apiKeyService.verifyApiKeyResponse(challenge, response, keyData.verificationHash);

      if (!isValid) {
        throw new ApiError(401, 'Invalid API key');
      }

      // Get user info
      const user = await userService.getUserById(keyData.userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Delete the challenge
      challenges.delete(challenge);

      // Return the verification result
      res.json({
        valid: true,
        userId: keyData.userId,
        tenantId: keyData.tenantId,
        scopes: keyData.scopes
      });
    } catch (error) {
      logger.error('Error verifying API key challenge', error);
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError(500, 'Failed to verify challenge'));
      }
    }
  });

  /**
   * Get user profile
   *
   * GET /api/apikeys/users/:userId/profile
   */
  router.get('/users/:userId/profile', async (req: Request, res: Response, next: NextFunction) => {
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

      // Return the user profile
      res.json({
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        name: user.name || ''
      });
    } catch (error) {
      logger.error('Error getting user profile', error);
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError(500, 'Failed to get user profile'));
      }
    }
  });

  return router;
};
