import { OpenFgaClient } from '@openfga/sdk';
import NodeCache from 'node-cache';
import { logger } from './logger';
import { authorizationModel } from '../models/authorizationModel';

export class AuthService {
  private client: OpenFgaClient;
  private storeId: string = '';
  private modelId: string = '';
  private cache: NodeCache;
  
  constructor() {
    // Initialize OpenFGA client
    this.client = new OpenFgaClient({
      apiUrl: `http://${process.env.OPENFGA_HOST || 'localhost'}:${process.env.OPENFGA_PORT || '8080'}`,
    });
    
    // Initialize cache with 5-minute TTL
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
  }
  
  /**
   * Initialize the auth service
   */
  async initialize(): Promise<void> {
    try {
      // Create store if it doesn't exist
      const stores = await this.client.listStores();
      
      if (!stores.stores || stores.stores.length === 0) {
        logger.info('Creating new OpenFGA store');
        const store = await this.client.createStore({
          name: 'neurallog-store',
        });
        this.storeId = store.id;
        
        // Create authorization model
        logger.info('Creating authorization model');
        const model = await this.client.writeAuthorizationModel({
          store_id: this.storeId,
          schema_version: '1.1',
          type_definitions: authorizationModel.type_definitions,
        });
        this.modelId = model.authorization_model_id;
      } else {
        logger.info('Using existing OpenFGA store');
        this.storeId = stores.stores[0].id;
        
        // Get latest authorization model
        const models = await this.client.readAuthorizationModels({
          store_id: this.storeId,
        });
        
        if (models.authorization_models && models.authorization_models.length > 0) {
          this.modelId = models.authorization_models[0].id;
        } else {
          // Create authorization model if it doesn't exist
          logger.info('Creating authorization model');
          const model = await this.client.writeAuthorizationModel({
            store_id: this.storeId,
            schema_version: '1.1',
            type_definitions: authorizationModel.type_definitions,
          });
          this.modelId = model.authorization_model_id;
        }
      }
      
      logger.info(`Auth service initialized with store ID: ${this.storeId} and model ID: ${this.modelId}`);
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
      // Add tenant context to contextual tuples
      const tuples = [
        ...contextualTuples,
        {
          user,
          relation: 'member',
          object: `tenant:${tenantId}`,
        },
      ];
      
      // Check permission
      const result = await this.client.check({
        store_id: this.storeId,
        authorization_model_id: this.modelId,
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
      // Write tuple
      await this.client.write({
        store_id: this.storeId,
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
      // Delete tuple
      await this.client.write({
        store_id: this.storeId,
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
      // Create tenant
      await this.client.write({
        store_id: this.storeId,
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
      // List all tuples related to this tenant
      const tuples = await this.client.read({
        store_id: this.storeId,
        tuple_key: {
          object: `tenant:${tenantId}`,
        },
      });
      
      // Delete all tuples
      if (tuples.tuples && tuples.tuples.length > 0) {
        await this.client.write({
          store_id: this.storeId,
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
      await this.client.write({
        store_id: this.storeId,
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
      const result = await this.client.read({
        store_id: this.storeId,
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
