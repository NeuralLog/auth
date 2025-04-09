/**
 * LocalOpenFgaAdapter
 * 
 * This adapter connects to a local OpenFGA instance.
 * It's suitable for development and self-hosted deployments.
 */

import { OpenFgaClient } from '@openfga/sdk';
import { AuthorizationModel } from '@openfga/sdk/dist/types';
import { OpenFgaAdapter } from './OpenFgaAdapter';
import { logger } from '../services/logger';

export interface LocalOpenFgaAdapterOptions {
  /**
   * OpenFGA API URL
   * @default http://localhost:8080
   */
  apiUrl?: string;
  
  /**
   * Tenant ID
   * @default default
   */
  tenantId?: string;
}

export class LocalOpenFgaAdapter implements OpenFgaAdapter {
  private client: OpenFgaClient;
  private storeId: string = '';
  private modelId: string = '';
  private tenantId: string;
  private apiUrl: string;
  
  constructor(options: LocalOpenFgaAdapterOptions = {}) {
    this.apiUrl = options.apiUrl || `http://${process.env.OPENFGA_HOST || 'localhost'}:${process.env.OPENFGA_PORT || '8080'}`;
    this.tenantId = options.tenantId || 'default';
    
    // Initialize OpenFGA client
    this.client = new OpenFgaClient({
      apiUrl: this.apiUrl,
    });
  }
  
  /**
   * Initialize the adapter
   */
  public async initialize(): Promise<void> {
    logger.info(`Initializing LocalOpenFgaAdapter with API URL: ${this.apiUrl}`);
  }
  
  /**
   * Get the OpenFGA client
   */
  public getClient(): OpenFgaClient {
    return this.client;
  }
  
  /**
   * Get the store ID
   */
  public getStoreId(): string {
    return this.storeId;
  }
  
  /**
   * Get the model ID
   */
  public getModelId(): string {
    return this.modelId;
  }
  
  /**
   * Create a store if it doesn't exist
   * @param name Store name
   */
  public async createStoreIfNotExists(name: string): Promise<string> {
    try {
      // List stores
      const stores = await this.client.listStores();
      
      if (!stores.stores || stores.stores.length === 0) {
        logger.info(`Creating new OpenFGA store: ${name}`);
        const store = await this.client.createStore({
          name,
        });
        this.storeId = store.id;
      } else {
        logger.info('Using existing OpenFGA store');
        this.storeId = stores.stores[0].id;
      }
      
      // Update client with store ID
      this.client = new OpenFgaClient({
        apiUrl: this.apiUrl,
        storeId: this.storeId,
      });
      
      return this.storeId;
    } catch (error) {
      logger.error('Failed to create store', error);
      throw error;
    }
  }
  
  /**
   * Create an authorization model if it doesn't exist
   * @param model Authorization model
   */
  public async createAuthorizationModelIfNotExists(model: AuthorizationModel): Promise<string> {
    try {
      if (!this.storeId) {
        throw new Error('Store ID not set. Call createStoreIfNotExists first.');
      }
      
      // Get latest authorization model
      const models = await this.client.readAuthorizationModels({
        store_id: this.storeId,
      });
      
      if (models.authorization_models && models.authorization_models.length > 0) {
        this.modelId = models.authorization_models[0].id;
      } else {
        // Create authorization model if it doesn't exist
        logger.info('Creating authorization model');
        const result = await this.client.writeAuthorizationModel({
          store_id: this.storeId,
          schema_version: '1.1',
          type_definitions: model.type_definitions,
        });
        this.modelId = result.authorization_model_id;
      }
      
      return this.modelId;
    } catch (error) {
      logger.error('Failed to create authorization model', error);
      throw error;
    }
  }
  
  /**
   * Set the tenant ID for the adapter
   * @param tenantId Tenant ID
   */
  public setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }
  
  /**
   * Get the tenant ID
   */
  public getTenantId(): string {
    return this.tenantId;
  }
}
