/**
 * KubernetesOpenFGAAdapter
 *
 * This adapter connects to an OpenFGA instance managed by Kubernetes.
 * It's suitable for production multi-tenant deployments.
 *
 * By default, it uses a single global OpenFGA instance for all tenants.
 * Tenant isolation is maintained through the authorization model.
 *
 * If needed, it can be configured to use tenant-specific OpenFGA instances
 * by setting the useTenantSpecificInstances option to true.
 */

import { OpenFgaClient } from '@openfga/sdk';
import { OpenFGAClient } from '../services/OpenFGAClient';
import { AuthorizationModel } from '@openfga/sdk';
import { OpenFGAAdapter } from './OpenFGAAdapter';
import { logger } from '../services/logger';

export interface KubernetesOpenFGAAdapterOptions {
  /**
   * Global OpenFGA API URL
   * @default http://openfga.openfga-system.svc.cluster.local:8080
   */
  globalApiUrl?: string;

  /**
   * Tenant ID
   * @default default
   */
  tenantId?: string;

  /**
   * Whether to use tenant-specific OpenFGA instances
   * @default false
   */
  useTenantSpecificInstances?: boolean;

  /**
   * Tenant namespace format
   * @default tenant-{tenantId}
   */
  tenantNamespaceFormat?: string;

  /**
   * OpenFGA service name in tenant namespace
   * @default openfga
   */
  openfgaServiceName?: string;

  /**
   * OpenFGA service port in tenant namespace
   * @default 8080
   */
  openfgaServicePort?: number;
}

export class KubernetesOpenFGAAdapter implements OpenFGAAdapter {
  private client: OpenFGAClient;
  private storeId: string = '';
  private modelId: string = '';
  private tenantId: string;
  private globalApiUrl: string;
  private useTenantSpecificInstances: boolean;
  private tenantNamespaceFormat: string;
  private openfgaServiceName: string;
  private openfgaServicePort: number;
  private currentApiUrl: string;

  constructor(options: KubernetesOpenFGAAdapterOptions = {}) {
    this.globalApiUrl = options.globalApiUrl || 'http://openfga.openfga-system.svc.cluster.local:8080';
    this.tenantId = options.tenantId || 'default';
    // Default to using a single global OpenFGA instance
    this.useTenantSpecificInstances = options.useTenantSpecificInstances === true;
    this.tenantNamespaceFormat = options.tenantNamespaceFormat || 'tenant-{tenantId}';
    this.openfgaServiceName = options.openfgaServiceName || 'openfga';
    this.openfgaServicePort = options.openfgaServicePort || 8080;

    // Set initial API URL
    this.currentApiUrl = this.useTenantSpecificInstances
      ? this.getTenantSpecificApiUrl(this.tenantId)
      : this.globalApiUrl;

    // Initialize OpenFGA client
    this.client = new OpenFGAClient({
      apiUrl: this.currentApiUrl,
    });
  }

  /**
   * Initialize the adapter
   */
  public async initialize(): Promise<void> {
    logger.info(`Initializing KubernetesOpenFGAAdapter with API URL: ${this.currentApiUrl}`);
    logger.info(`Using tenant-specific instances: ${this.useTenantSpecificInstances}`);
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
        apiUrl: this.currentApiUrl,
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

    if (this.useTenantSpecificInstances) {
      // Update API URL for tenant-specific instance
      this.currentApiUrl = this.getTenantSpecificApiUrl(tenantId);

      // Recreate client with new API URL
      this.client = new OpenFGAClient({
        apiUrl: this.currentApiUrl,
        storeId: this.storeId || undefined,
      });

      logger.info(`Switched to tenant-specific OpenFGA instance: ${this.currentApiUrl}`);
    }
  }

  /**
   * Get the tenant ID
   */
  public getTenantId(): string {
    return this.tenantId;
  }

  /**
   * Get the tenant-specific API URL
   * @param tenantId Tenant ID
   */
  private getTenantSpecificApiUrl(tenantId: string): string {
    const namespace = this.tenantNamespaceFormat.replace('{tenantId}', tenantId);
    return `http://${this.openfgaServiceName}.${namespace}.svc.cluster.local:${this.openfgaServicePort}`;
  }
}
