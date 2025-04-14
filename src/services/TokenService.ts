/**
 * Token service for the NeuralLog auth service
 */

import { RedisClient } from '../utils/redis';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

/**
 * Resource token
 */
export interface ResourceToken {
  /**
   * Token ID
   */
  id: string;
  
  /**
   * Token value
   */
  token: string;
  
  /**
   * User ID
   */
  userId: string;
  
  /**
   * Tenant ID
   */
  tenantId: string;
  
  /**
   * Resource path
   */
  resource: string;
  
  /**
   * When the token was created
   */
  createdAt: Date;
  
  /**
   * When the token expires
   */
  expiresAt: Date;
  
  /**
   * Whether the token has been revoked
   */
  revoked: boolean;
}

/**
 * Token service
 */
export class TokenService {
  /**
   * Redis client
   */
  private readonly redis: RedisClient;
  
  /**
   * JWT secret
   */
  private readonly jwtSecret: string;
  
  /**
   * Token expiration time in seconds
   */
  private readonly tokenExpiration: number;
  
  /**
   * Constructor
   */
  constructor() {
    this.redis = new RedisClient();
    this.jwtSecret = process.env.JWT_SECRET || 'neurallog-secret';
    this.tokenExpiration = parseInt(process.env.TOKEN_EXPIRATION || '3600', 10);
  }
  
  /**
   * Create a resource token
   * 
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param resource Resource path
   * @returns Resource token
   */
  async createResourceToken(
    userId: string,
    tenantId: string,
    resource: string
  ): Promise<ResourceToken> {
    try {
      // Generate token ID
      const id = uuidv4();
      
      // Calculate expiration time
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + this.tokenExpiration * 1000);
      
      // Generate JWT
      const token = jwt.sign(
        {
          id,
          userId,
          tenantId,
          resource,
          exp: Math.floor(expiresAt.getTime() / 1000)
        },
        this.jwtSecret
      );
      
      // Create token object
      const resourceToken: ResourceToken = {
        id,
        token,
        userId,
        tenantId,
        resource,
        createdAt,
        expiresAt,
        revoked: false
      };
      
      // Store token
      await this.redis.setJSON(`tokens:${id}`, resourceToken);
      
      // Add to user's tokens
      await this.redis.sadd(`users:${userId}:tokens`, id);
      
      // Set expiration
      await this.redis.expire(
        `tokens:${id}`,
        Math.floor(this.tokenExpiration * 1.1) // Add 10% buffer
      );
      
      return resourceToken;
    } catch (error) {
      logger.error('Error creating resource token:', error);
      throw new Error('Failed to create resource token');
    }
  }
  
  /**
   * Get resource token
   * 
   * @param token Token value
   * @returns Resource token or null if not found
   */
  async getResourceToken(token: string): Promise<ResourceToken | null> {
    try {
      // Decode JWT
      let decoded;
      
      try {
        decoded = jwt.verify(token, this.jwtSecret) as {
          id: string;
          userId: string;
          tenantId: string;
          resource: string;
          exp: number;
        };
      } catch (error) {
        return null;
      }
      
      // Get token from Redis
      const resourceToken = await this.redis.getJSON<ResourceToken>(`tokens:${decoded.id}`);
      
      if (!resourceToken) {
        return null;
      }
      
      // Check if token is revoked
      if (resourceToken.revoked) {
        return null;
      }
      
      // Check if token has expired
      const now = new Date();
      const expiresAt = new Date(resourceToken.expiresAt);
      
      if (expiresAt < now) {
        return null;
      }
      
      return {
        ...resourceToken,
        createdAt: new Date(resourceToken.createdAt),
        expiresAt: new Date(resourceToken.expiresAt)
      };
    } catch (error) {
      logger.error('Error getting resource token:', error);
      throw new Error('Failed to get resource token');
    }
  }
  
  /**
   * Verify resource token
   * 
   * @param token Token value
   * @param resource Resource path
   * @returns Resource token or null if invalid
   */
  async verifyResourceToken(token: string, resource: string): Promise<ResourceToken | null> {
    try {
      // Get token
      const resourceToken = await this.getResourceToken(token);
      
      if (!resourceToken) {
        return null;
      }
      
      // Check if token is for the requested resource
      if (resourceToken.resource !== resource) {
        return null;
      }
      
      return resourceToken;
    } catch (error) {
      logger.error('Error verifying resource token:', error);
      throw new Error('Failed to verify resource token');
    }
  }
  
  /**
   * Revoke resource token
   * 
   * @param token Token value
   * @returns Whether the token was revoked
   */
  async revokeResourceToken(token: string): Promise<boolean> {
    try {
      // Decode JWT
      let decoded;
      
      try {
        decoded = jwt.verify(token, this.jwtSecret) as {
          id: string;
          userId: string;
          tenantId: string;
          resource: string;
          exp: number;
        };
      } catch (error) {
        return false;
      }
      
      // Get token from Redis
      const resourceToken = await this.redis.getJSON<ResourceToken>(`tokens:${decoded.id}`);
      
      if (!resourceToken) {
        return false;
      }
      
      // Update token
      resourceToken.revoked = true;
      
      // Store updated token
      await this.redis.setJSON(`tokens:${decoded.id}`, resourceToken);
      
      return true;
    } catch (error) {
      logger.error('Error revoking resource token:', error);
      throw new Error('Failed to revoke resource token');
    }
  }
}
