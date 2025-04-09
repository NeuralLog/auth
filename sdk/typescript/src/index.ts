import axios, { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';

/**
 * Configuration options for the AuthClient
 */
export interface AuthClientOptions {
  /**
   * URL of the auth service
   */
  authServiceUrl: string;
  
  /**
   * Tenant ID
   */
  tenantId: string;
  
  /**
   * Cache TTL in seconds (default: 300)
   */
  cacheTtl?: number;
  
  /**
   * Authorization token
   */
  token?: string;
}

/**
 * Check permission parameters
 */
export interface CheckParams {
  /**
   * User identifier
   */
  user: string;
  
  /**
   * Permission to check
   */
  permission: string;
  
  /**
   * Resource identifier
   */
  resource: string;
  
  /**
   * Contextual tuples
   */
  contextualTuples?: any[];
}

/**
 * Grant permission parameters
 */
export interface GrantParams {
  /**
   * User identifier
   */
  user: string;
  
  /**
   * Permission to grant
   */
  permission: string;
  
  /**
   * Resource identifier
   */
  resource: string;
}

/**
 * Revoke permission parameters
 */
export interface RevokeParams {
  /**
   * User identifier
   */
  user: string;
  
  /**
   * Permission to revoke
   */
  permission: string;
  
  /**
   * Resource identifier
   */
  resource: string;
}

/**
 * Client SDK for NeuralLog Auth Service
 */
export class AuthClient {
  private client: AxiosInstance;
  private cache: NodeCache;
  private tenantId: string;
  
  /**
   * Create a new AuthClient
   */
  constructor(options: AuthClientOptions) {
    this.tenantId = options.tenantId;
    
    // Create HTTP client
    this.client = axios.create({
      baseURL: options.authServiceUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': options.tenantId,
        ...(options.token ? { 'Authorization': `Bearer ${options.token}` } : {})
      }
    });
    
    // Create cache
    this.cache = new NodeCache({
      stdTTL: options.cacheTtl || 300,
      checkperiod: (options.cacheTtl || 300) * 0.2
    });
  }
  
  /**
   * Check if a user has permission to access a resource
   */
  async check(params: CheckParams): Promise<boolean> {
    const { user, permission, resource, contextualTuples } = params;
    
    // Map permission to relation
    const relation = this.mapPermissionToRelation(permission);
    
    // Generate cache key
    const cacheKey = this.getCacheKey(user, relation, resource);
    
    // Check cache first
    const cachedResult = this.cache.get<boolean>(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    
    try {
      // Call auth service
      const response = await this.client.post('/api/auth/check', {
        user,
        relation,
        object: resource,
        contextualTuples
      });
      
      // Cache the result
      const allowed = response.data.allowed;
      this.cache.set(cacheKey, allowed);
      
      return allowed;
    } catch (error) {
      console.error('Error checking permission', error);
      return false;
    }
  }
  
  /**
   * Grant a permission to a user
   */
  async grant(params: GrantParams): Promise<boolean> {
    const { user, permission, resource } = params;
    
    // Map permission to relation
    const relation = this.mapPermissionToRelation(permission);
    
    try {
      // Call auth service
      const response = await this.client.post('/api/auth/grant', {
        user,
        relation,
        object: resource
      });
      
      // Invalidate cache
      this.invalidateCache(user, relation, resource);
      
      return response.data.status === 'success';
    } catch (error) {
      console.error('Error granting permission', error);
      return false;
    }
  }
  
  /**
   * Revoke a permission from a user
   */
  async revoke(params: RevokeParams): Promise<boolean> {
    const { user, permission, resource } = params;
    
    // Map permission to relation
    const relation = this.mapPermissionToRelation(permission);
    
    try {
      // Call auth service
      const response = await this.client.post('/api/auth/revoke', {
        user,
        relation,
        object: resource
      });
      
      // Invalidate cache
      this.invalidateCache(user, relation, resource);
      
      return response.data.status === 'success';
    } catch (error) {
      console.error('Error revoking permission', error);
      return false;
    }
  }
  
  /**
   * Get auth headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    return {
      'X-Tenant-ID': this.tenantId
    };
  }
  
  /**
   * Map permission to relation
   */
  private mapPermissionToRelation(permission: string): string {
    switch (permission) {
      case 'read':
        return 'reader';
      case 'write':
        return 'writer';
      case 'admin':
        return 'admin';
      case 'owner':
        return 'owner';
      default:
        return permission;
    }
  }
  
  /**
   * Generate a cache key
   */
  private getCacheKey(user: string, relation: string, resource: string): string {
    return `${this.tenantId}:${user}:${relation}:${resource}`;
  }
  
  /**
   * Invalidate cache for a specific permission
   */
  private invalidateCache(user: string, relation: string, resource: string): void {
    const cacheKey = this.getCacheKey(user, relation, resource);
    this.cache.del(cacheKey);
  }
}

/**
 * Middleware for Express.js
 */
export * from './middleware';
