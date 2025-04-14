import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
 * User role in a tenant
 */
export enum TenantRole {
  ADMIN = 'admin',
  MEMBER = 'member'
}

/**
 * Tenant user information
 */
export interface TenantUser {
  /**
   * User identifier
   */
  userId: string;

  /**
   * User role in the tenant
   */
  role: TenantRole;
}

/**
 * Tenant information
 */
export interface Tenant {
  /**
   * Tenant identifier
   */
  id: string;

  /**
   * Tenant name
   */
  name?: string;

  /**
   * Custom domain for the tenant
   */
  domain?: string;

  /**
   * Additional tenant metadata
   */
  metadata?: Record<string, any>;
}



/**
 * Add user to tenant parameters
 */
export interface AddUserToTenantParams {
  /**
   * User identifier
   */
  userId: string;

  /**
   * User role in the tenant
   */
  role?: TenantRole;
}

/**
 * Update user role parameters
 */
export interface UpdateUserRoleParams {
  /**
   * User identifier
   */
  userId: string;

  /**
   * New role for the user
   */
  role: TenantRole;
}

/**
 * Tenant migration parameters
 */
export interface MigrateTenantParams {
  /**
   * Source tenant ID
   */
  sourceTenantId: string;

  /**
   * Destination tenant ID
   */
  destinationTenantId: string;

  /**
   * Whether to delete the source tenant after migration
   */
  deleteSourceAfterMigration?: boolean;
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
   * Create a new tenant
   * @param tenantId Tenant identifier
   * @param adminUserId User ID to set as admin
   * @param metadata Optional tenant metadata
   */
  async createTenant(tenantId: string, adminUserId: string, metadata?: Record<string, any>): Promise<boolean> {
    try {
      const response = await this.client.post('/api/tenants', {
        tenantId,
        adminUserId,
        metadata
      });

      return response.data.status === 'success';
    } catch (error) {
      console.error('Error creating tenant', error);
      return false;
    }
  }

  /**
   * Delete a tenant
   * @param tenantId Tenant identifier
   */
  async deleteTenant(tenantId: string): Promise<boolean> {
    try {
      const response = await this.client.delete(`/api/tenants/${tenantId}`);

      return response.data.status === 'success';
    } catch (error) {
      console.error('Error deleting tenant', error);
      return false;
    }
  }

  /**
   * Get tenant information
   * @param tenantId Tenant identifier
   */
  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const response = await this.client.get(`/api/tenants/${tenantId}`);

      return response.data.tenant;
    } catch (error) {
      console.error('Error getting tenant', error);
      return null;
    }
  }

  /**
   * List all tenants
   */
  async listTenants(): Promise<Tenant[]> {
    try {
      const response = await this.client.get('/api/tenants');

      return response.data.tenants || [];
    } catch (error) {
      console.error('Error listing tenants', error);
      return [];
    }
  }

  /**
   * Update tenant information
   * @param tenantId Tenant identifier
   * @param updates Tenant updates
   */
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<boolean> {
    try {
      const response = await this.client.patch(`/api/tenants/${tenantId}`, updates);

      return response.data.status === 'success';
    } catch (error) {
      console.error('Error updating tenant', error);
      return false;
    }
  }

  /**
   * Add a user to a tenant
   * @param tenantId Tenant identifier
   * @param params User and role information
   */
  async addUserToTenant(tenantId: string, params: AddUserToTenantParams): Promise<boolean> {
    const { userId, role = TenantRole.MEMBER } = params;

    try {
      const response = await this.client.post(`/api/tenants/${tenantId}/users`, {
        userId,
        role
      });

      return response.data.status === 'success';
    } catch (error) {
      console.error('Error adding user to tenant', error);
      return false;
    }
  }

  /**
   * Remove a user from a tenant
   * @param tenantId Tenant identifier
   * @param userId User identifier
   */
  async removeUserFromTenant(tenantId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.client.delete(`/api/tenants/${tenantId}/users/${userId}`);

      return response.data.status === 'success';
    } catch (error) {
      console.error('Error removing user from tenant', error);
      return false;
    }
  }

  /**
   * Update a user's role in a tenant
   * @param tenantId Tenant identifier
   * @param params User and role information
   */
  async updateUserRole(tenantId: string, params: UpdateUserRoleParams): Promise<boolean> {
    const { userId, role } = params;

    try {
      const response = await this.client.patch(`/api/tenants/${tenantId}/users/${userId}`, {
        role
      });

      return response.data.status === 'success';
    } catch (error) {
      console.error('Error updating user role', error);
      return false;
    }
  }

  /**
   * List users in a tenant
   * @param tenantId Tenant identifier
   */
  async listTenantUsers(tenantId: string): Promise<TenantUser[]> {
    try {
      const response = await this.client.get(`/api/tenants/${tenantId}/users`);

      return response.data.users || [];
    } catch (error) {
      console.error('Error listing tenant users', error);
      return [];
    }
  }

  /**
   * Check if a user is a member of a tenant
   * @param tenantId Tenant identifier
   * @param userId User identifier
   */
  async isUserInTenant(tenantId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.client.get(`/api/tenants/${tenantId}/users/${userId}`);

      return response.data.exists === true;
    } catch (error) {
      console.error('Error checking if user is in tenant', error);
      return false;
    }
  }

  /**
   * Get a user's role in a tenant
   * @param tenantId Tenant identifier
   * @param userId User identifier
   */
  async getUserRole(tenantId: string, userId: string): Promise<TenantRole | null> {
    try {
      const response = await this.client.get(`/api/tenants/${tenantId}/users/${userId}`);

      return response.data.role || null;
    } catch (error) {
      console.error('Error getting user role', error);
      return null;
    }
  }

  /**
   * Migrate a tenant to a new ID
   * @param params Migration parameters
   */
  async migrateTenant(params: MigrateTenantParams): Promise<boolean> {
    try {
      const response = await this.client.post('/api/tenants/migrate', params);

      return response.data.status === 'success';
    } catch (error) {
      console.error('Error migrating tenant', error);
      return false;
    }
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

/**
 * NextJS integration
 */
export * from './nextjs';
