/**
 * OpenFGA client for the NeuralLog auth service
 */

import { OpenFgaApi } from '@openfga/sdk';
import { logger } from '../utils/logger';

/**
 * OpenFGA client
 */
export class OpenFgaClient {
  /**
   * OpenFGA API client
   */
  private readonly client: OpenFgaApi;
  
  /**
   * Store ID
   */
  private readonly storeId: string;
  
  /**
   * Authorization model ID
   */
  private readonly authorizationModelId: string;
  
  /**
   * Constructor
   */
  constructor() {
    const apiUrl = process.env.OPENFGA_API_URL || 'http://localhost:8080';
    this.storeId = process.env.OPENFGA_STORE_ID || '';
    this.authorizationModelId = process.env.OPENFGA_AUTHORIZATION_MODEL_ID || '';
    
    this.client = new OpenFgaApi({
      apiUrl,
      storeId: this.storeId,
      authorizationModelId: this.authorizationModelId
    });
  }
  
  /**
   * Check if a user has permission to perform an action on a resource
   * 
   * @param userId User ID
   * @param resource Resource type
   * @param action Action
   * @returns Whether the user has permission
   */
  async check(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const response = await this.client.check({
        user: `user:${userId}`,
        relation: action,
        object: `${resource}:*`
      });
      
      return response.allowed;
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
  async checkSpecific(
    userId: string,
    resource: string,
    resourceId: string,
    action: string
  ): Promise<boolean> {
    try {
      const response = await this.client.check({
        user: `user:${userId}`,
        relation: action,
        object: `${resource}:${resourceId}`
      });
      
      return response.allowed;
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
      await this.client.write({
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
      await this.client.write({
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
      const response = await this.client.read({
        user: `user:${userId}`
      });
      
      return response.tuples;
    } catch (error) {
      logger.error('Error listing relationships:', error);
      throw new Error('Failed to list relationships');
    }
  }
}
