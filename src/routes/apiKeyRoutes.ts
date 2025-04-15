import { Router, Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/ApiKeyService';
import { roleService } from '../services/roleService';
import { userService } from '../services/UserService';
import { authMiddleware } from '../middleware/AuthMiddleware';
import { ApiError } from '../utils/errors';
import { randomBytes } from 'crypto';
import { UserProfile } from '@neurallog/client-sdk';

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

const router = Router();

/**
 * Create a new API key
 *
 * POST /api/apikeys
 */
router.post('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, scopes, userId: targetUserId } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Validate input
    if (!name || !Array.isArray(scopes)) {
      throw new ApiError(400, 'Invalid input: name and scopes array are required');
    }

    // Get the user ID from the authenticated user
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Determine the user ID for the API key
    // If targetUserId is provided, check if the requesting user has permission to create API keys for other users
    let userId = requestingUserId;

    if (targetUserId && targetUserId !== requestingUserId) {
      const hasPermission = await roleService.hasPermission(
        requestingUserId,
        'apikeys:manage',
        tenantId
      );

      if (!hasPermission) {
        throw new ApiError(403, 'Forbidden: You do not have permission to create API keys for other users');
      }

      userId = targetUserId;
    }

    // Create the API key
    const { apiKey, keyData } = await apiKeyService.createApiKey(userId, tenantId, name, scopes);

    // Return the created API key
    res.status(201).json({
      apiKey,
      keyData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all API keys for the current user or a specific user
 *
 * GET /api/apikeys
 * GET /api/apikeys?userId=<userId>
 */
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: targetUserId } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Get the user ID from the authenticated user
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Determine the user ID for the API keys
    // If targetUserId is provided, check if the requesting user has permission to view API keys for other users
    let userId = requestingUserId;

    if (targetUserId && targetUserId !== requestingUserId) {
      const hasPermission = await roleService.hasPermission(
        requestingUserId,
        'apikeys:manage',
        tenantId
      );

      if (!hasPermission) {
        throw new ApiError(403, 'Forbidden: You do not have permission to view API keys for other users');
      }

      userId = targetUserId as string;
    }

    // Get the API keys
    const apiKeys = await apiKeyService.getApiKeys(userId, tenantId);

    // Return the API keys
    res.json(apiKeys);
  } catch (error) {
    next(error);
  }
});

/**
 * Revoke an API key
 *
 * DELETE /api/apikeys/:keyId
 */
router.delete('/:keyId', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Get the user ID from the authenticated user
    const requestingUserId = req.user?.id;

    if (!requestingUserId) {
      throw new ApiError(401, 'Unauthorized');
    }

    // Get the API key to check ownership
    const apiKey = await apiKeyService.getApiKeyById(keyId);

    if (!apiKey) {
      throw new ApiError(404, 'API key not found');
    }

    // Check if the user is the owner or has admin permission
    const isOwner = apiKey.userId === requestingUserId;
    const hasAdminPermission = await roleService.hasPermission(
      requestingUserId,
      'apikeys:manage',
      tenantId
    );

    if (!isOwner && !hasAdminPermission) {
      throw new ApiError(403, 'Forbidden: You do not have permission to revoke this API key');
    }

    // Revoke the API key
    const success = await apiKeyService.revokeApiKey(keyId, apiKey.userId, tenantId);

    if (!success) {
      throw new ApiError(404, 'API key not found');
    }

    // Return 204 No Content for successful deletion
    res.status(204).end();
  } catch (error) {
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

    // Validate input
    if (!apiKey) {
      throw new ApiError(400, 'Invalid input: apiKey is required');
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
      scopes: result.scopes
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify an API key using zero-knowledge proof
 *
 * POST /api/apikeys/verify-zk
 */
router.post('/verify-zk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apiKey, verificationHash } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    // Validate input
    if (!apiKey || !verificationHash) {
      throw new ApiError(400, 'Invalid input: apiKey and verificationHash are required');
    }

    // Import the ZKP API key service
    const { zkpApiKeyService } = await import('../services/zkpApiKeyService');

    // Verify the API key using zero-knowledge proof
    const valid = await zkpApiKeyService.verifyApiKeyZK(apiKey, verificationHash);

    // Extract key ID from the API key
    const keyId = apiKey.split('.')[0];

    // If valid, get the API key metadata from the database
    let userId = null;
    let scopes: string[] = [];

    if (valid) {
      try {
        const apiKeyData = await apiKeyService.getApiKeyById(keyId);
        if (apiKeyData) {
          userId = apiKeyData.userId;
          scopes = apiKeyData.scopes;
        }
      } catch (error) {
        // If we can't get the API key metadata, just continue with the verification result
        console.error('Error getting API key metadata:', error);
      }
    }

    // Return the verification result
    res.json({
      valid,
      userId,
      tenantId,
      scopes
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate zero-knowledge verification data for an API key
 *
 * POST /api/apikeys/generate-zk-verification
 */
router.post('/generate-zk-verification', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apiKey } = req.body;

    // Validate input
    if (!apiKey) {
      throw new ApiError(400, 'Invalid input: apiKey is required');
    }

    // Import the ZKP API key service
    const { zkpApiKeyService } = await import('../services/zkpApiKeyService');

    // Generate verification data
    const verificationData = await zkpApiKeyService.generateZKVerificationData(apiKey);

    // Return the verification data
    res.json({
      keyId: verificationData.keyId,
      verificationHash: verificationData.verificationHash
    });
  } catch (error) {
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
    // Return the challenge
    res.json({
      challenge,
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (error) {
    next(error);
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
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

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

    // Import the ZKP API key service
    const { zkpApiKeyService } = await import('../services/zkpApiKeyService');

    // Verify the response
    const isValid = zkpApiKeyService.verifySignature(challenge, response.split('.')[1], keyData.verificationHash);

    if (!isValid) {
      throw new ApiError(401, 'Invalid API key');
    }

    // Delete the challenge
    challenges.delete(challenge);

    // Return the verification result
    // Return the verification result
    res.json({
      valid: true,
      userId: keyData.userId,
      tenantId: keyData.tenantId,
      scopes: keyData.scopes
    });
  } catch (error) {
    next(error);
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

    // Return the user profile using the UserProfile type
    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      name: user.name || undefined
    };
    res.json(userProfile);
  } catch (error) {
    next(error);
  }
});

export default router;
