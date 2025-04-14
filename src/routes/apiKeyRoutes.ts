import { Router, Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/apiKeyService';
import { roleService } from '../services/roleService';
import { authMiddleware } from '../middleware/authMiddleware';
import { ApiError } from '../utils/errors';

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

    res.status(201).json({
      status: 'success',
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

    res.json({
      status: 'success',
      apiKeys
    });
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

    res.json({
      status: 'success'
    });
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

    res.json({
      status: 'success',
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

    res.json({
      status: 'success',
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

    res.json({
      status: 'success',
      keyId: verificationData.keyId,
      verificationHash: verificationData.verificationHash
    });
  } catch (error) {
    next(error);
  }
});

export default router;
