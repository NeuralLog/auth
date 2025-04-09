import { OpenFgaClient } from '@openfga/sdk';
import NodeCache from 'node-cache';
import { logger } from './logger';
import { authorizationModel } from '../models/authorizationModel';
import { OpenFgaAdapter } from '../adapters/OpenFgaAdapter';
import { OpenFgaAdapterFactory, OpenFgaAdapterFactoryOptions } from '../adapters/OpenFgaAdapterFactory';

export interface AuthServiceOptions {
  /**
   * OpenFGA adapter factory options
   */
  adapterOptions?: OpenFgaAdapterFactoryOptions;

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
  private adapter: OpenFgaAdapter;
  private cache: NodeCache;

  constructor(options: AuthServiceOptions = {}) {
    // Create OpenFGA adapter
    this.adapter = OpenFgaAdapterFactory.createAdapter(options.adapterOptions);

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
      const modelId = await this.adapter.createAuthorizationModelIfNotExists(authorizationModel);

      logger.info(`Auth service initialized with store ID: ${storeId} and model ID: ${modelId}`);
    } catch (error) {
      logger.error('Failed to initialize auth service', error);
      throw error;
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
        store_id: this.adapter.getStoreId(),
        authorization_model_id: this.adapter.getModelId(),
        tuple_key: {
          user,
          relation,
          object,
        },
        contextual_tuples: {
          tuple_keys: tuples,
        },
      });

      // Cache the result
      this.cache.set(cacheKey, result.allowed);

      return result.allowed;
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
        store_id: this.adapter.getStoreId(),
        writes: {
          tuple_keys: [
            {
              user,
              relation,
              object,
            },
          ],
        },
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
        store_id: this.adapter.getStoreId(),
        deletes: {
          tuple_keys: [
            {
              user,
              relation,
              object,
            },
          ],
        },
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
        store_id: this.adapter.getStoreId(),
        writes: {
          tuple_keys: [
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
        },
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
        store_id: this.adapter.getStoreId(),
        tuple_key: {
          object: `tenant:${tenantId}`,
        },
      });

      // Delete all tuples
      if (tuples.tuples && tuples.tuples.length > 0) {
        await client.write({
          store_id: this.adapter.getStoreId(),
          deletes: {
            tuple_keys: tuples.tuples.map(tuple => ({
              user: tuple.key.user,
              relation: tuple.key.relation,
              object: tuple.key.object,
            })),
          },
        });
      }

      // Delete tenant itself
      await client.write({
        store_id: this.adapter.getStoreId(),
        deletes: {
          tuple_keys: [
            {
              user: `tenant:${tenantId}`,
              relation: 'exists',
              object: 'system:tenants',
            },
          ],
        },
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
        store_id: this.adapter.getStoreId(),
        tuple_key: {
          object: 'system:tenants',
          relation: 'exists',
        },
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
   * Close the auth service
   */
  async close(): Promise<void> {
    // Clear cache
    this.cache.flushAll();
    logger.info('Auth service closed');
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
