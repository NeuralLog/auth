// API Key Service for managing API keys
import { logger } from './logger';
import { zkpApiKeyService } from './zkpApiKeyService';
import { db } from '../db';
import { UserService } from './UserService';
import { ApiKey } from '@neurallog/client-sdk';

/**
 * API Key Service
 *
 * This service handles the management of API keys.
 */
export class ApiKeyService {
  // Redis key prefixes
  private readonly API_KEY_PREFIX = 'apikeys:';
  private readonly USER_API_KEYS_PREFIX = 'users:';

  /**
   * Create a new API key
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param name API key name
   * @param scopes API key scopes
   * @returns API key
   */
  async createApiKey(userId: string, tenantId: string, name: string, scopes: string[] = ['logs:read', 'logs:write']): Promise<{ apiKey: string; keyData: ApiKey }> {
    try {
      // Generate a new API key
      const { apiKey, keyId, verificationHash, expiresAt } = zkpApiKeyService.generateApiKey(userId, tenantId, scopes);

      // Create the API key record
      const keyData: ApiKey = {
        id: keyId,
        userId,
        tenantId,
        name,
        scopes,
        verificationHash,
        createdAt: new Date(),
        expiresAt,
        revoked: false
      };

      // Save the API key to Redis
      await db.setJSON(`${this.API_KEY_PREFIX}${keyId}`, keyData);

      // Add the API key to the user's set of API keys
      await db.sadd(`${this.USER_API_KEYS_PREFIX}${userId}:apikeys`, keyId);

      return { apiKey, keyData };
    } catch (error) {
      logger.error('Error creating API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Get API keys for a user
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns API keys
   */
  async getApiKeys(userId: string, tenantId: string): Promise<ApiKey[]> {
    try {
      // Get all API key IDs for the user
      const keyIds = await db.smembers(`${this.USER_API_KEYS_PREFIX}${userId}:apikeys`);

      // Get API key details for each ID
      const apiKeys: ApiKey[] = [];

      for (const keyId of keyIds) {
        const apiKey = await db.getJSON<ApiKey>(`${this.API_KEY_PREFIX}${keyId}`);

        // Only include API keys for the specified tenant that are not revoked
        if (apiKey && apiKey.tenantId === tenantId && !apiKey.revoked) {
          apiKeys.push(apiKey);
        }
      }

      return apiKeys;
    } catch (error) {
      logger.error('Error getting API keys:', error);
      throw new Error('Failed to get API keys');
    }
  }

  /**
   * Get an API key by ID
   *
   * @param keyId API key ID
   * @returns API key
   */
  async getApiKeyById(keyId: string): Promise<ApiKey | null> {
    try {
      // Get the API key from Redis
      return await db.getJSON<ApiKey>(`${this.API_KEY_PREFIX}${keyId}`);
    } catch (error) {
      logger.error('Error getting API key:', error);
      throw new Error('Failed to get API key');
    }
  }

  /**
   * Revoke an API key
   *
   * @param keyId API key ID
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns Whether the API key was revoked
   */
  async revokeApiKey(keyId: string, userId: string, tenantId: string): Promise<boolean> {
    try {
      // Get the API key
      const apiKey = await this.getApiKeyById(keyId);

      // Check if the API key exists and belongs to the user and tenant
      if (!apiKey || apiKey.userId !== userId || apiKey.tenantId !== tenantId) {
        return false;
      }

      // Update the API key
      apiKey.revoked = true;
      apiKey.revokedAt = new Date();

      // Save the updated API key
      await db.setJSON(`${this.API_KEY_PREFIX}${keyId}`, apiKey);

      return true;
    } catch (error) {
      logger.error('Error revoking API key:', error);
      throw new Error('Failed to revoke API key');
    }
  }

  /**
   * Get all API keys for a tenant
   *
   * @param tenantId Tenant ID
   * @param userService User service to get users in the tenant
   * @returns API keys for the tenant
   */
  async getApiKeysForTenant(tenantId: string, userService: UserService): Promise<ApiKey[]> {
    try {
      // Get all users in the tenant
      const users = await userService.getUsers(tenantId);

      // Get API keys for each user
      const apiKeys: ApiKey[] = [];

      for (const user of users) {
        const userApiKeys = await this.getApiKeys(user.id, tenantId);
        apiKeys.push(...userApiKeys);
      }

      return apiKeys;
    } catch (error) {
      logger.error('Error getting API keys for tenant:', { error, tenantId });
      throw new Error('Failed to get API keys for tenant');
    }
  }

  /**
   * Revoke all API keys for a user
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns Whether any API keys were revoked
   */
  async revokeAllApiKeysForUser(userId: string, tenantId: string): Promise<boolean> {
    try {
      // Get all API keys for the user
      const apiKeys = await this.getApiKeys(userId, tenantId);

      // Revoke each API key
      let revokedCount = 0;

      for (const apiKey of apiKeys) {
        if (!apiKey.revoked) {
          apiKey.revoked = true;
          apiKey.revokedAt = new Date();

          // Save the updated API key
          await db.setJSON(`${this.API_KEY_PREFIX}${apiKey.id}`, apiKey);

          revokedCount++;
        }
      }

      return revokedCount > 0;
    } catch (error) {
      logger.error('Error revoking all API keys for user:', { error, userId, tenantId });
      throw new Error('Failed to revoke API keys for user');
    }
  }

  /**
   * Revoke all API keys for a tenant
   *
   * @param tenantId Tenant ID
   * @param userService User service to get users in the tenant
   * @returns Whether any API keys were revoked
   */
  async revokeAllApiKeysForTenant(tenantId: string, userService: UserService): Promise<boolean> {
    try {
      // Get all API keys for the tenant
      const apiKeys = await this.getApiKeysForTenant(tenantId, userService);

      // Revoke each API key
      let revokedCount = 0;

      for (const apiKey of apiKeys) {
        if (!apiKey.revoked) {
          apiKey.revoked = true;
          apiKey.revokedAt = new Date();

          // Save the updated API key
          await db.setJSON(`${this.API_KEY_PREFIX}${apiKey.id}`, apiKey);

          revokedCount++;
        }
      }

      return revokedCount > 0;
    } catch (error) {
      logger.error('Error revoking all API keys for tenant:', { error, tenantId });
      throw new Error('Failed to revoke API keys for tenant');
    }
  }

  /**
   * Verify an API key response to a challenge
   *
   * @param challenge Challenge
   * @param response Response
   * @param verificationHash Verification hash
   * @returns Whether the response is valid
   */
  async verifyApiKeyResponse(challenge: string, response: string, verificationHash: string): Promise<boolean> {
    try {
      // Extract the key ID and signature from the response
      const [keyId, signature] = response.split('.');
      if (!keyId || !signature) {
        return false;
      }

      // Verify the signature using the zkpApiKeyService
      return zkpApiKeyService.verifySignature(challenge, signature, verificationHash);
    } catch (error) {
      logger.error('Error verifying API key response:', error);
      return false;
    }
  }

  /**
   * Verify an API key
   *
   * @param apiKey API key
   * @returns User ID and tenant ID if the API key is valid
   */
  async verifyApiKey(apiKey: string): Promise<{ userId: string; tenantId: string; scopes: string[] } | null> {
    try {
      // Extract the key ID
      const keyParts = apiKey.split('.');
      if (keyParts.length !== 2) {
        return null;
      }

      const keyId = keyParts[0];

      // Get the API key from Redis
      const keyData = await this.getApiKeyById(keyId);

      // Check if the API key exists and is not revoked
      if (!keyData || keyData.revoked) {
        return null;
      }

      // Check if the API key has expired
      if (keyData.expiresAt < new Date()) {
        return null;
      }

      // Verify the API key
      const isValid = zkpApiKeyService.verifyApiKey(
        apiKey,
        keyData.verificationHash,
        keyData.userId,
        keyData.tenantId,
        keyData.scopes
      );

      if (!isValid) {
        return null;
      }

      // Update the last used timestamp
      keyData.lastUsedAt = new Date();
      await db.setJSON(`${this.API_KEY_PREFIX}${keyId}`, keyData);

      return {
        userId: keyData.userId,
        tenantId: keyData.tenantId,
        scopes: keyData.scopes
      };
    } catch (error) {
      logger.error('Error verifying API key:', error);
      return null;
    }
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();
