/**
 * OpenFGA client for the NeuralLog auth service
 */

import { OpenFgaClient } from '@openfga/sdk';
import { logger } from '../utils/logger';

/**
 * OpenFGA client
 */
export class OpenFGAClient extends OpenFgaClient {
  /**
   * Store ID
   */
  public storeId: string;

  /**
   * Authorization model ID
   */
  public authorizationModelId: string;

  /**
   * Constructor
   *
   * @param options Options for the OpenFGA client
   */
  constructor(options?: { apiUrl?: string; storeId?: string; authorizationModelId?: string }) {
    const apiUrl = options?.apiUrl || process.env.OPENFGA_API_URL || 'http://localhost:8080';
    super({ apiUrl });

    this.storeId = options?.storeId || process.env.OPENFGA_STORE_ID || '';
    this.authorizationModelId = options?.authorizationModelId || process.env.OPENFGA_AUTHORIZATION_MODEL_ID || '';
  }

  /**
   * Get the store ID
   */
  getStoreId(): string {
    return this.storeId;
  }

  /**
   * Get the authorization model ID
   */
  getAuthorizationModelId(): string {
    return this.authorizationModelId;
  }

  /**
   * Check if a user has permission to perform an action on a resource
   *
   * @param userId User ID
   * @param resource Resource type
   * @param action Action
   * @returns Whether the user has permission
   */
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const response = await super.check({
        user: `user:${userId}`,
        relation: action,
        object: `${resource}:*`
      });

      return response.allowed || false;
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if a user has permission to perform an action on a specific resource
   *
   * @param userId User ID
   * @param resource Resource type
   * @param resourceId Resource ID
   * @param action Action
   * @returns Whether the user has permission
   */
  async checkSpecificPermission(
    userId: string,
    resource: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    try {
      const response = await super.check({
        user: `user:${userId}`,
        relation: action,
        object: `${resource}:${resourceId}`
      });

      return response.allowed || false;
    } catch (error) {
      logger.error('Error checking specific permission:', error);
      return false;
    }
  }

  /**
   * Add a relationship
   *
   * @param userId User ID
   * @param resource Resource type
   * @param resourceId Resource ID
   * @param relation Relation
   */
  async addRelationship(
    userId: string,
    resource: string,
    resourceId: string,
    relation: string
  ): Promise<void> {
    try {
      await super.write({
        writes: [
          {
            user: `user:${userId}`,
            relation,
            object: `${resource}:${resourceId}`
          }
        ]
      });
    } catch (error) {
      logger.error('Error adding relationship:', error);
      throw new Error('Failed to add relationship');
    }
  }

  /**
   * Remove a relationship
   *
   * @param userId User ID
   * @param resource Resource type
   * @param resourceId Resource ID
   * @param relation Relation
   */
  async removeRelationship(
    userId: string,
    resource: string,
    resourceId: string,
    relation: string
  ): Promise<void> {
    try {
      await super.write({
        deletes: [
          {
            user: `user:${userId}`,
            relation,
            object: `${resource}:${resourceId}`
          }
        ]
      });
    } catch (error) {
      logger.error('Error removing relationship:', error);
      throw new Error('Failed to remove relationship');
    }
  }

  /**
   * List relationships
   *
   * @param userId User ID
   * @returns Relationships
   */
  async listRelationships(userId: string): Promise<any[]> {
    try {
      const response = await super.read({
        user: `user:${userId}`
      });

      return response.tuples;
    } catch (error) {
      logger.error('Error listing relationships:', error);
      throw new Error('Failed to list relationships');
    }
  }

  /**
   * Delete a relationship
   *
   * @param tenantId Tenant ID
   * @param user User
   * @param relation Relation
   * @param object Object
   */
  async delete(tenantId: string, user: string, relation: string, object: string): Promise<void> {
    try {
      await this.removeRelationship(user, object.split(':')[0], object.split(':')[1], relation);
    } catch (error) {
      logger.error('Error deleting relationship:', error);
      throw new Error('Failed to delete relationship');
    }
  }
}
