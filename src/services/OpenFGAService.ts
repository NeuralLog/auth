/**
 * OpenFGA service for the NeuralLog auth service
 */

import { OpenFGAClient } from './OpenFGAClient';
import { logger } from '../utils/logger';

/**
 * OpenFGA service
 */
export class OpenFGAService {
  private client: OpenFGAClient;

  /**
   * Constructor
   *
   * @param client OpenFGA client
   */
  constructor(client: OpenFGAClient) {
    this.client = client;
  }

  /**
   * Check if a user has permission to perform an action on a resource
   *
   * @param tenantId Tenant ID
   * @param user User
   * @param relation Relation
   * @param object Object
   * @param contextualTuples Contextual tuples
   * @returns Whether the user has permission
   */
  async check(
    tenantId: string,
    user: string,
    relation: string,
    object: string,
    // contextualTuples parameter is not used in this implementation
  ): Promise<boolean> {
    try {
      const response = await this.client.check({
        user,
        relation,
        object
      });

      return response.allowed || false;
    } catch (error) {
      logger.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Write a relationship
   *
   * @param tenantId Tenant ID
   * @param user User
   * @param relation Relation
   * @param object Object
   */
  async write(
    _tenantId: string, // Not used in this implementation
    user: string,
    relation: string,
    object: string
  ): Promise<void> {
    try {
      const [resourceType, resourceId] = object.split(':');
      await this.client.addRelationship(user, resourceType, resourceId, relation);
    } catch (error) {
      logger.error('Error writing relationship:', error);
      throw new Error('Failed to write relationship');
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
  async delete(
    tenantId: string,
    user: string,
    relation: string,
    object: string
  ): Promise<void> {
    try {
      await this.client.delete(tenantId, user, relation, object);
    } catch (error) {
      logger.error('Error deleting relationship:', error);
      throw new Error('Failed to delete relationship');
    }
  }

  /**
   * List objects for a user
   *
   * @param tenantId Tenant ID
   * @param user User
   * @param relation Relation
   * @param objectType Object type
   * @returns Objects
   */
  async listObjects(
    _tenantId: string, // Not used in this implementation
    user: string,
    relation?: string,
    objectType?: string
  ): Promise<any[]> {
    try {
      const relationships = await this.client.listRelationships(user);

      // Filter by relation and object type if provided
      return relationships.filter(rel => {
        if (relation && rel.relation !== relation) {
          return false;
        }

        if (objectType && !rel.object.startsWith(`${objectType}:`)) {
          return false;
        }

        return true;
      });
    } catch (error) {
      logger.error('Error listing objects:', error);
      throw new Error('Failed to list objects');
    }
  }

  /**
   * List users for an object
   *
   * @param tenantId Tenant ID
   * @param object Object
   * @param relation Relation
   * @param userType User type
   * @returns Users
   */
  async listUsers(
    _tenantId: string, // Not used in this implementation
    _object: string, // Not used in this implementation
    _relation?: string, // Not used in this implementation
    _userType?: string // Not used in this implementation
  ): Promise<any[]> {
    try {
      // This is a simplified implementation
      // In a real implementation, you would use the OpenFGA API to list users
      return [];
    } catch (error) {
      logger.error('Error listing users:', error);
      throw new Error('Failed to list users');
    }
  }
}
