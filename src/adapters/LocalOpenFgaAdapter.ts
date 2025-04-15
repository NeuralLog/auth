/**
 * LocalOpenFGAAdapter
 *
 * This adapter connects to a local OpenFGA instance.
 * It's suitable for development and self-hosted deployments.
 */

import { OpenFgaClient } from '@openfga/sdk';
import { OpenFGAClient } from '../services/OpenFGAClient';
import { AuthorizationModel } from '@openfga/sdk';
import { OpenFGAAdapter } from './OpenFGAAdapter';
import { logger } from '../services/logger';

export interface LocalOpenFGAAdapterOptions {
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

export class LocalOpenFGAAdapter implements OpenFGAAdapter {
  private client: OpenFGAClient;
  private storeId: string = '';
  private modelId: string = '';
  private tenantId: string;
  private apiUrl: string;

  constructor(options: LocalOpenFGAAdapterOptions = {}) {
    // Ensure the URL has a proper protocol prefix
    let apiUrl = options.apiUrl || process.env.OPENFGA_API_URL || `http://${process.env.OPENFGA_HOST || 'localhost'}:${process.env.OPENFGA_PORT || '8080'}`;

    // Make sure the URL has a protocol
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `http://${apiUrl}`;
    }

    this.apiUrl = apiUrl;
    this.tenantId = options.tenantId || 'default';

    // Initialize OpenFGA client
    this.client = new OpenFGAClient({
      apiUrl: this.apiUrl,
    });
  }

  /**
   * Initialize the adapter
   */
  public async initialize(): Promise<void> {
    logger.info(`Initializing LocalOpenFGAAdapter with API URL: ${this.apiUrl}`);
  }

  /**
   * Get the OpenFGA client
   */
  public getClient(): OpenFGAClient {
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
      this.client = new OpenFGAClient({
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
        storeId: this.storeId
      });

      if (models.authorization_models && models.authorization_models.length > 0) {
        this.modelId = models.authorization_models[0].id;
      } else {
        // Create authorization model if it doesn't exist
        logger.info('Creating authorization model');
        const result = await this.client.writeAuthorizationModel({
          schema_version: '1.1',
          type_definitions: model.type_definitions,
        }, { storeId: this.storeId });
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
