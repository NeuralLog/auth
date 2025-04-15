import { authService } from './AuthService';
import { logger } from './logger';
import { db } from '../db';
import { User } from '@neurallog/client-sdk/dist/types/api';

/**
 * User service
 */
export class UserService {
  // Redis key prefixes
  private readonly USER_KEY_PREFIX = 'users:';
  private readonly USER_EMAIL_INDEX_PREFIX = 'users:email:';
  private readonly TENANT_USERS_PREFIX = 'tenants:';

  /**
   * Get all users for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Array of users
   */
  async getUsers(tenantId: string): Promise<User[]> {
    try {
      // Get all user IDs for the tenant
      const userIds = await db.smembers(`${this.TENANT_USERS_PREFIX}${tenantId}:users`);

      // Get user details for each ID
      const users: User[] = [];

      for (const userId of userIds) {
        const user = await this.getUser(userId, tenantId);
        if (user) {
          users.push(user);
        }
      }

      return users;
    } catch (error) {
      logger.error('Error getting users', { error, tenantId });
      return [];
    }
  }

  /**
   * Get a user by ID
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns User or null if not found
   */
  async getUser(userId: string, tenantId: string): Promise<User | null> {
    try {
      // Get user from Redis
      const user = await db.getJSON<User>(`${this.USER_KEY_PREFIX}${userId}`);

      if (!user || user.tenantId !== tenantId) {
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Error getting user', { error, userId, tenantId });
      return null;
    }
  }

  /**
   * Get a user by ID
   *
   * @param userId User ID
   * @returns User or null if not found
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      // Get user from Redis
      return await db.getJSON<User>(`${this.USER_KEY_PREFIX}${userId}`);
    } catch (error) {
      logger.error('Error getting user by ID', { error, userId });
      return null;
    }
  }

  /**
   * Get a user by email
   *
   * @param email User email
   * @returns User or null if not found
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      // Get user ID from email index
      const userId = await db.get(`${this.USER_EMAIL_INDEX_PREFIX}${email}`);

      if (!userId) {
        return null;
      }

      // Get user details
      return await db.getJSON<User>(`${this.USER_KEY_PREFIX}${userId}`);
    } catch (error) {
      logger.error('Error getting user by email', { error, email });
      return null;
    }
  }

  /**
   * Create a user
   *
   * @param user User data
   * @returns Created user ID or null if failed
   */
  async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<string | null> {
    try {
      // Check if email already exists
      const existingUser = await this.getUserByEmail(user.email);

      if (existingUser) {
        logger.error('User with this email already exists', { email: user.email });
        return null;
      }

      // Create user object
      const now = new Date().toISOString();
      const newUser: User = {
        ...user,
        createdAt: now,
        updatedAt: now
      };

      // Store user in Redis
      await db.setJSON(`${this.USER_KEY_PREFIX}${user.id}`, newUser);

      // Create email index
      await db.set(`${this.USER_EMAIL_INDEX_PREFIX}${user.email}`, user.id);

      // Add user to tenant
      await db.sadd(`${this.TENANT_USERS_PREFIX}${user.tenantId}:users`, user.id);

      return user.id;
    } catch (error) {
      logger.error('Error creating user', { error, user });
      return null;
    }
  }

  /**
   * Delete a user
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns True if successful
   */
  async deleteUser(userId: string, tenantId: string): Promise<boolean> {
    try {
      // Get user
      const user = await this.getUser(userId, tenantId);

      if (!user || user.tenantId !== tenantId) {
        return false;
      }

      // Remove user from Redis
      await db.del(`${this.USER_KEY_PREFIX}${userId}`);

      // Remove email index
      await db.del(`${this.USER_EMAIL_INDEX_PREFIX}${user.email}`);

      // Remove user from tenant
      await db.srem(`${this.TENANT_USERS_PREFIX}${tenantId}:users`, userId);

      return true;
    } catch (error) {
      logger.error('Error deleting user', { error, userId, tenantId });
      return false;
    }
  }

  /**
   * Add a user to a tenant
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param role User role (admin or member)
   * @returns True if successful
   */
  async addUserToTenant(userId: string, tenantId: string, role: 'admin' | 'member'): Promise<boolean> {
    try {
      // Add user to OpenFGA
      const success = await authService.grant({
        user: `user:${userId}`,
        relation: role,
        object: `tenant:${tenantId}`,
        tenantId
      });

      if (!success) {
        return false;
      }

      // Add user to Redis tenant set
      await db.sadd(`${this.TENANT_USERS_PREFIX}${tenantId}:users`, userId);

      // Update user's tenant and role if the user exists
      const user = await db.getJSON<User>(`${this.USER_KEY_PREFIX}${userId}`);
      if (user) {
        user.tenantId = tenantId;
        user.role = role;
        user.updatedAt = new Date().toISOString();
        await db.setJSON(`${this.USER_KEY_PREFIX}${userId}`, user);
      }

      return true;
    } catch (error) {
      logger.error('Error adding user to tenant', { error, userId, tenantId, role });
      return false;
    }
  }

  /**
   * Update a user
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param updates User updates
   * @returns True if successful
   */
  async updateUser(userId: string, tenantId: string, updates: Partial<Omit<User, 'id' | 'email' | 'tenantId' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    try {
      // Get user
      const user = await this.getUser(userId, tenantId);

      if (!user || user.tenantId !== tenantId) {
        return false;
      }

      // Update user
      const updatedUser: User = {
        ...user,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Store updated user
      await db.setJSON(`${this.USER_KEY_PREFIX}${userId}`, updatedUser);

      return true;
    } catch (error) {
      logger.error('Error updating user', { error, userId, tenantId, updates });
      return false;
    }
  }

  /**
   * Update user role in tenant
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param role New role
   * @returns True if successful
   */
  async updateUserRole(userId: string, tenantId: string, role: 'admin' | 'member'): Promise<boolean> {
    try {
      // Remove old role
      await authService.revoke({
        user: `user:${userId}`,
        relation: 'admin',
        object: `tenant:${tenantId}`,
        tenantId
      });

      await authService.revoke({
        user: `user:${userId}`,
        relation: 'member',
        object: `tenant:${tenantId}`,
        tenantId
      });

      // Add new role
      const success = await authService.grant({
        user: `user:${userId}`,
        relation: role,
        object: `tenant:${tenantId}`,
        tenantId
      });

      if (!success) {
        return false;
      }

      // Update user's role if the user exists
      const user = await db.getJSON<User>(`${this.USER_KEY_PREFIX}${userId}`);
      if (user && user.tenantId === tenantId) {
        user.role = role;
        user.updatedAt = new Date().toISOString();
        await db.setJSON(`${this.USER_KEY_PREFIX}${userId}`, user);
      }

      return true;
    } catch (error) {
      logger.error('Error updating user role', { error, userId, tenantId, role });
      return false;
    }
  }

  /**
   * Remove a user from a tenant
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns True if successful
   */
  async removeUserFromTenant(userId: string, tenantId: string): Promise<boolean> {
    try {
      // Remove user from OpenFGA
      await authService.revoke({
        user: `user:${userId}`,
        relation: 'admin',
        object: `tenant:${tenantId}`,
        tenantId
      });

      await authService.revoke({
        user: `user:${userId}`,
        relation: 'member',
        object: `tenant:${tenantId}`,
        tenantId
      });

      // Remove user from Redis tenant set
      await db.srem(`${this.TENANT_USERS_PREFIX}${tenantId}:users`, userId);

      return true;
    } catch (error) {
      logger.error('Error removing user from tenant', { error, userId, tenantId });
      return false;
    }
  }

  // Duplicate method removed

  /**
   * Check if a user is a member of a tenant
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns True if the user is a member
   */
  async isUserInTenant(userId: string, tenantId: string): Promise<boolean> {
    try {
      return await authService.check({
        user: `user:${userId}`,
        relation: 'member',
        object: `tenant:${tenantId}`,
        tenantId
      });
    } catch (error) {
      logger.error('Error checking if user is in tenant', { error, userId, tenantId });
      return false;
    }
  }

  /**
   * Check if a user is an admin of a tenant
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns True if the user is an admin
   */
  async isUserTenantAdmin(userId: string, tenantId: string): Promise<boolean> {
    try {
      return await authService.check({
        user: `user:${userId}`,
        relation: 'admin',
        object: `tenant:${tenantId}`,
        tenantId
      });
    } catch (error) {
      logger.error('Error checking if user is tenant admin', { error, userId, tenantId });
      return false;
    }
  }
}

export const userService = new UserService();
