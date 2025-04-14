/**
 * API key routes for the NeuralLog auth service
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { ApiKeyService } from '../services/ApiKeyService';
import { UserService } from '../services/UserService';
import { logger } from '../utils/logger';

const router = express.Router();
const apiKeyService = new ApiKeyService();
const userService = new UserService();

/**
 * Create a new API key
 * 
 * POST /api-keys
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, keyId, verificationHash, scopes = ['logs:read', 'logs:write'] } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    
    // Validate input
    if (!name || !keyId || !verificationHash) {
      return res.status(400).json({
        error: 'Missing required fields: name, keyId, verificationHash'
      });
    }
    
    // Validate scopes
    const validScopes = ['logs:read', 'logs:write', 'logs:admin', 'users:read', 'users:write'];
    
    for (const scope of scopes) {
      if (!validScopes.includes(scope)) {
        return res.status(400).json({
          error: `Invalid scope: ${scope}`
        });
      }
    }
    
    // Check if user has permission to create API keys
    const canCreateApiKey = await authorize(userId, 'api_key', 'create');
    
    if (!canCreateApiKey) {
      return res.status(403).json({
        error: 'You do not have permission to create API keys'
      });
    }
    
    // Create API key
    const apiKey = await apiKeyService.createApiKey({
      id: keyId,
      userId,
      tenantId,
      name,
      verificationHash,
      scopes,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: null,
      revoked: false
    });
    
    // Return API key metadata
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt
    });
  } catch (error) {
    logger.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * List API keys
 * 
 * GET /api-keys
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user has permission to list API keys
    const canListApiKeys = await authorize(userId, 'api_key', 'list');
    
    if (!canListApiKeys) {
      return res.status(403).json({
        error: 'You do not have permission to list API keys'
      });
    }
    
    // Get API keys
    const apiKeys = await apiKeyService.getApiKeysByUserId(userId);
    
    // Return API key metadata
    res.json(apiKeys.map(apiKey => ({
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt
    })));
  } catch (error) {
    logger.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * Get API key
 * 
 * GET /api-keys/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.id;
    
    // Get API key
    const apiKey = await apiKeyService.getApiKeyById(keyId);
    
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    // Check if user owns the API key
    if (apiKey.userId !== userId) {
      // Check if user has permission to view other users' API keys
      const canViewOtherApiKeys = await authorize(userId, 'api_key', 'admin');
      
      if (!canViewOtherApiKeys) {
        return res.status(403).json({
          error: 'You do not have permission to view this API key'
        });
      }
    }
    
    // Return API key metadata
    res.json({
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt
    });
  } catch (error) {
    logger.error('Error getting API key:', error);
    res.status(500).json({ error: 'Failed to get API key' });
  }
});

/**
 * Revoke API key
 * 
 * DELETE /api-keys/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const keyId = req.params.id;
    
    // Get API key
    const apiKey = await apiKeyService.getApiKeyById(keyId);
    
    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    // Check if user owns the API key
    if (apiKey.userId !== userId) {
      // Check if user has permission to revoke other users' API keys
      const canRevokeOtherApiKeys = await authorize(userId, 'api_key', 'admin');
      
      if (!canRevokeOtherApiKeys) {
        return res.status(403).json({
          error: 'You do not have permission to revoke this API key'
        });
      }
    }
    
    // Revoke API key
    await apiKeyService.revokeApiKey(keyId);
    
    res.status(204).end();
  } catch (error) {
    logger.error('Error revoking API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * Verify API key
 * 
 * POST /api-keys/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'Missing API key' });
    }
    
    // Extract key ID from API key
    const keyId = apiKey.split('.')[0].replace(/^nl_/, '');
    
    // Get API key from database
    const apiKeyRecord = await apiKeyService.getApiKeyById(keyId);
    
    if (!apiKeyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (apiKeyRecord.revoked) {
      return res.status(401).json({ error: 'API key has been revoked' });
    }
    
    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'API key has expired' });
    }
    
    // Verify API key
    const isValid = await apiKeyService.verifyApiKey(apiKey, apiKeyRecord.verificationHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Update last used timestamp
    await apiKeyService.updateLastUsed(keyId);
    
    // Get user
    const user = await userService.getUserById(apiKeyRecord.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Return success
    res.json({
      valid: true,
      userId: user.id,
      tenantId: user.tenantId,
      scopes: apiKeyRecord.scopes
    });
  } catch (error) {
    logger.error('Error verifying API key:', error);
    res.status(500).json({ error: 'Failed to verify API key' });
  }
});

export default router;
