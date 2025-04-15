/**
 * OpenFGAAdapter interface
 *
 * This interface defines the contract for OpenFGA adapters.
 * Implementations can connect to different OpenFGA instances (local, Kubernetes, etc.)
 */

import { OpenFgaClient } from '@openfga/sdk';
import { AuthorizationModel } from '@openfga/sdk';

export interface OpenFGAAdapter {
  /**
   * Initialize the adapter
   */
  initialize(): Promise<void>;

  /**
   * Get the OpenFGA client
   */
  getClient(): OpenFgaClient;

  /**
   * Get the store ID
   */
  getStoreId(): string;

  /**
   * Get the model ID
   */
  getModelId(): string;

  /**
   * Create a store if it doesn't exist
   * @param name Store name
   */
  createStoreIfNotExists(name: string): Promise<string>;

  /**
   * Create an authorization model if it doesn't exist
   * @param model Authorization model
   */
  createAuthorizationModelIfNotExists(model: AuthorizationModel): Promise<string>;

  /**
   * Set the tenant ID for the adapter
   * @param tenantId Tenant ID
   */
  setTenantId(tenantId: string): void;

  /**
   * Get the tenant ID
   */
  getTenantId(): string;
}
