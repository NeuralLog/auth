

import { OpenFgaClient, TypeDefinition, AuthorizationModel } from '@openfga/sdk';
import NodeCache from 'node-cache';
import axios from 'axios';
import { logger } from './logger';
import { authorizationModel } from '../models/authorizationModel';
import { OpenFGAAdapter } from '../adapters/OpenFGAAdapter';
import { OpenFGAAdapterFactory, OpenFGAAdapterFactoryOptions } from '../adapters/OpenFGAAdapterFactory';
import { auth0Service } from './auth0Service';
import { apiKeyService } from './ApiKeyService';
import { userService } from './UserService';

export interface AuthServiceOptions {
  /**
   * OpenFGA adapter factory options
   */
  adapterOptions?: OpenFGAAdapterFactoryOptions;

  /**
   * Cache TTL in seconds
   * @default 300
   */
  cacheTtl?: number;

  /**
   * Cache check period in seconds
   * @default 60
   */
  cacheCheckPeriod?: number;
}

export class AuthService {
  private adapter: OpenFGAAdapter;
  private cache: NodeCache;

  constructor(options: AuthServiceOptions = {}) {
    // Create OpenFGA adapter
    this.adapter = OpenFGAAdapterFactory.createAdapter(options.adapterOptions);

    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: options.cacheTtl || 300,
      checkperiod: options.cacheCheckPeriod || 60
    });
  }

  /**
   * Initialize the auth service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize the adapter
      await this.adapter.initialize();

      // Create store if it doesn't exist
      const storeId = await this.adapter.createStoreIfNotExists('neurallog-store');

      // Create authorization model if it doesn't exist
      const modelId = await this.adapter.createAuthorizationModelIfNotExists({
        schema_version: '1.1', // Assuming schema version 1.1
        type_definitions: authorizationModel.type_definitions as unknown as TypeDefinition[]
      } as unknown as AuthorizationModel);

      // Initialize Auth0 service
      await auth0Service.initialize();

      logger.info(`Auth service initialized with store ID: ${storeId} and model ID: ${modelId}`);
    } catch (error) {
      logger.error('Failed to initialize auth service', error);
      throw error;
    }
  }

  /**
   * Authenticate a user with username and password
   */
  async authenticateUser(username: string, password: string, tenantId: string): Promise<{ token: string; expiresIn: number; user: any }> {
    try {
      // Authenticate with Auth0
      const { token, expiresIn } = await auth0Service.authenticateUser(username, password);

      // Validate token and get user info
      const userInfo = await auth0Service.validateToken(token);

      // Check if user has access to the tenant
      const hasAccess = await this.check({
        user: `user:${userInfo.sub}`,
        relation: 'member',
        object: `tenant:${tenantId}`,
        tenantId
      });

      if (!hasAccess) {
        throw new Error('User does not have access to this tenant');
      }

      return {
        token,
        expiresIn,
        user: userInfo
      };
    } catch (error) {
      logger.error('Error authenticating user', { error, username, tenantId });
      throw error;
    }
  }

  /**
   * Authenticate a machine-to-machine client
   */
  async authenticateM2M(clientId: string, clientSecret: string, tenantId: string): Promise<{ token: string; expiresIn: number }> {
    try {
      // Authenticate with Auth0
      const { token, expiresIn } = await auth0Service.getClientCredentialsToken(clientId, clientSecret);

      // TODO: Verify client has access to the tenant
      // This would typically involve checking a mapping of client IDs to tenants

      return {
        token,
        expiresIn
      };
    } catch (error) {
      logger.error('Error authenticating M2M client', { error, clientId, tenantId });
      throw error;
    }
  }

  /**
   * Validate a token and get user information
   */
  async validateToken(token: string, tenantId: string): Promise<{ valid: boolean; user: any }> {
    try {
      // Validate token with Auth0
      const userInfo = await auth0Service.validateToken(token);

      // Check if user has access to the tenant
      const hasAccess = await this.check({
        user: `user:${userInfo.sub}`,
        relation: 'member',
        object: `tenant:${tenantId}`,
        tenantId
      });

      if (!hasAccess) {
        return {
          valid: false,
          user: null
        };
      }

      return {
        valid: true,
        user: userInfo
      };
    } catch (error) {
      logger.error('Error validating token', { error, tenantId });
      return {
        valid: false,
        user: null
      };
    }
  }

  /**
   * Check if a user has permission to access a resource
   */
  async check(params: {
    user: string;
    relation: string;
    object: string;
    contextualTuples?: any[];
    tenantId: string;
  }): Promise<boolean> {
    const { user, relation, object, contextualTuples = [], tenantId } = params;

    // Generate cache key
    const cacheKey = this.getCacheKey(user, relation, object, tenantId);

    // Check cache first
    const cachedResult = this.cache.get<boolean>(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    try {
      // Set tenant ID in adapter
      this.adapter.setTenantId(tenantId);

      // Add tenant context to contextual tuples
      const tuples = [
        ...contextualTuples,
        {
          user,
          relation: 'member',
          object: `tenant:${tenantId}`,
        },
      ];

      // Get client from adapter
      const client = this.adapter.getClient();

      // Check permission
      const result = await client.check({
        user,
        relation,
        object,
        contextualTuples: tuples,
      }, {
        storeId: this.adapter.getStoreId(),
        authorizationModelId: this.adapter.getModelId()
      });

      // Cache the result
      this.cache.set(cacheKey, result.allowed);

      return result.allowed || false;
    } catch (error) {
      logger.error('Error checking permission', { error, user, relation, object, tenantId });
      return false;
    }
  }

  /**
   * Grant a permission to a user
   */
  async grant(params: {
    user: string;
    relation: string;
    object: string;
    tenantId: string;
  }): Promise<boolean> {
    const { user, relation, object, tenantId } = params;

    try {
      // Set tenant ID in adapter
      this.adapter.setTenantId(tenantId);

      // Get client from adapter
      const client = this.adapter.getClient();

      // Write tuple
      await client.write({
        writes: [
          {
            user,
            relation,
            object,
          },
        ],
      }, {
        storeId: this.adapter.getStoreId()
      });

      // Invalidate cache
      this.invalidateCache(user, relation, object, tenantId);

      return true;
    } catch (error) {
      logger.error('Error granting permission', { error, user, relation, object, tenantId });
      return false;
    }
  }

  /**
   * Revoke a permission from a user
   */
  async revoke(params: {
    user: string;
    relation: string;
    object: string;
    tenantId: string;
  }): Promise<boolean> {
    const { user, relation, object, tenantId } = params;

    try {
      // Set tenant ID in adapter
      this.adapter.setTenantId(tenantId);

      // Get client from adapter
      const client = this.adapter.getClient();

      // Delete tuple
      await client.write({
        deletes: [
          {
            user,
            relation,
            object,
          },
        ],
      }, {
        storeId: this.adapter.getStoreId()
      });

      // Invalidate cache
      this.invalidateCache(user, relation, object, tenantId);

      return true;
    } catch (error) {
      logger.error('Error revoking permission', { error, user, relation, object, tenantId });
      return false;
    }
  }

  /**
   * Create a new tenant
   */
  async createTenant(tenantId: string, adminUserId: string): Promise<boolean> {
    try {
      // Set tenant ID in adapter
      this.adapter.setTenantId(tenantId);

      // Get client from adapter
      const client = this.adapter.getClient();

      // Create tenant
      await client.write({
        writes: [
          {
            user: `tenant:${tenantId}`,
            relation: 'exists',
            object: 'system:tenants',
          },
          {
            user: adminUserId,
            relation: 'admin',
            object: `tenant:${tenantId}`,
          },
          {
            user: adminUserId,
            relation: 'member',
            object: `tenant:${tenantId}`,
          },
        ],
      }, {
        storeId: this.adapter.getStoreId()
      });

      return true;
    } catch (error) {
      logger.error('Error creating tenant', { error, tenantId, adminUserId });
      return false;
    }
  }

  /**
   * Delete a tenant
   */
  async deleteTenant(tenantId: string): Promise<boolean> {
    try {
      // Set tenant ID in adapter
      this.adapter.setTenantId(tenantId);

      // Get client from adapter
      const client = this.adapter.getClient();

      // List all tuples related to this tenant
      const tuples = await client.read({
        object: `tenant:${tenantId}`,
      }, {
        storeId: this.adapter.getStoreId()
      });

      // Delete all tuples
      if (tuples.tuples && tuples.tuples.length > 0) {
        await client.write({
          deletes: tuples.tuples.map(tuple => ({
            user: tuple.key.user,
            relation: tuple.key.relation,
            object: tuple.key.object,
          })),
        }, {
          storeId: this.adapter.getStoreId()
        });
      }

      // Delete tenant itself
      await client.write({
        deletes: [
          {
            user: `tenant:${tenantId}`,
            relation: 'exists',
            object: 'system:tenants',
          },
        ],
      }, {
        storeId: this.adapter.getStoreId()
      });

      return true;
    } catch (error) {
      logger.error('Error deleting tenant', { error, tenantId });
      return false;
    }
  }

  /**
   * List all tenants
   */
  async listTenants(): Promise<string[]> {
    try {
      // Get client from adapter
      const client = this.adapter.getClient();

      const result = await client.read({
        object: 'system:tenants',
        relation: 'exists',
      }, {
        storeId: this.adapter.getStoreId()
      });

      if (!result.tuples) {
        return [];
      }

      return result.tuples.map(tuple => {
        const [_, tenantId] = tuple.key.user.split(':');
        return tenantId;
      });
    } catch (error) {
      logger.error('Error listing tenants', error);
      return [];
    }
  }

  /**
   * Authenticate a user with an API key
   */
  async authenticateWithApiKey(apiKey: string, tenantId: string): Promise<{ token: string; expiresIn: number; user: any }> {
    try {
      // Verify the API key
      const result = await apiKeyService.verifyApiKey(apiKey);

      if (!result) {
        throw new Error('Invalid API key');
      }

      // Check if the API key is for the requested tenant
      if (result.tenantId !== tenantId) {
        throw new Error('API key does not have access to this tenant');
      }

      // Get user info
      const user = await userService.getUserById(result.userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Generate a token
      const { token, expiresIn } = await auth0Service.createApiKeyToken(result.userId, tenantId, result.scopes);

      return {
        token,
        expiresIn,
        user
      };
    } catch (error) {
      logger.error('Error authenticating with API key', { error, tenantId });
      throw error;
    }
  }

  /**
   * Logout a user
   */
  async logout(userId: string): Promise<boolean> {
    try {
      // In a real implementation, you might invalidate tokens or perform other cleanup
      // For now, we'll just log the logout
      logger.info(`User ${userId} logged out`);
      return true;
    } catch (error) {
      logger.error('Error during logout', { error, userId });
      return false;
    }
  }

  /**
   * Close the auth service
   */
  async close(): Promise<void> {
    // Clear cache
    this.cache.flushAll();
    logger.info('Auth service closed');
  }

  /**
   * Change a user's password
   */
  async changePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const managementToken = await auth0Service.getManagementToken();

      await axios.patch(
        `https://${auth0Service.getDomain()}/api/v2/users/${userId}`,
        {
          password: newPassword,
          connection: 'Username-Password-Authentication'
        },
        {
          headers: {
            Authorization: `Bearer ${managementToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`Password changed for user ${userId}`);
    } catch (error) {
      logger.error('Error changing password', { error, userId });
      throw new Error('Failed to change password');
    }
  }

  /**
   * Generate a cache key
   */
  private getCacheKey(user: string, relation: string, object: string, tenantId: string): string {
    return `${tenantId}:${user}:${relation}:${object}`;
  }

  /**
   * Invalidate cache for a specific permission
   */
  private invalidateCache(user: string, relation: string, object: string, tenantId: string): void {
    const cacheKey = this.getCacheKey(user, relation, object, tenantId);
    this.cache.del(cacheKey);
  }
}

export const authService = new AuthService();
