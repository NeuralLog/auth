import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

/**
 * Role Service
 *
 * Manages roles and role assignments in the system.
 */

// Define the Role interface based on usage
interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  inherits?: string[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RoleService {
  // In-memory role storage for demo purposes
  private roles: Map<string, Role> = new Map();
  private roleAssignments: Map<string, any[]> = new Map();

  /**
   * Create a new role
   *
   * @param role Role data
   * @returns The created role ID
   */
  async createRole(role: {
    name: string;
    description?: string;
    permissions: string[];
    inherits?: string[];
    tenantId: string;
  }): Promise<string> {
    try {
      // Generate a unique ID for the role
      const roleId = uuidv4();

      // Create the role
      const newRole = {
        id: roleId,
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || [],
        inherits: role.inherits || [],
        tenantId: role.tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store the role
      this.roles.set(roleId, newRole);

      return roleId;
    } catch (error) {
      logger.error('Error creating role', { error, role });
      throw error;
    }
  }

  /**
   * Get a role by ID
   *
   * @param roleId Role ID
   * @param tenantId Tenant ID
   * @returns The role or null if not found
   */
  async getRole(roleId: string, tenantId: string): Promise<any | null> {
    try {
      const role = this.roles.get(roleId);

      if (!role || role.tenantId !== tenantId) {
        return null;
      }

      return role;
    } catch (error) {
      logger.error('Error getting role', { error, roleId, tenantId });
      return null;
    }
  }

  /**
   * Get all roles for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Array of roles
   */
  async getRoles(tenantId: string): Promise<any[]> {
    try {
      const roles: any[] = [];

      for (const role of this.roles.values()) {
        if (role.tenantId === tenantId) {
          roles.push(role);
        }
      }

      return roles;
    } catch (error) {
      logger.error('Error getting roles', { error, tenantId });
      return [];
    }
  }

  /**
   * Update a role
   *
   * @param roleId Role ID
   * @param updates Updates to apply
   * @param tenantId Tenant ID
   * @returns True if successful
   */
  async updateRole(
    roleId: string,
    updates: {
      name?: string;
      description?: string;
      permissions?: string[];
      inherits?: string[];
    },
    tenantId: string
  ): Promise<boolean> {
    try {
      const role = await this.getRole(roleId, tenantId);

      if (!role) {
        return false;
      }

      // Update the role
      const updatedRole = {
        ...role,
        ...updates,
        updatedAt: new Date()
      };

      // Store the updated role
      this.roles.set(roleId, updatedRole);

      return true;
    } catch (error) {
      logger.error('Error updating role', { error, roleId, updates, tenantId });
      return false;
    }
  }

  /**
   * Delete a role
   *
   * @param roleId Role ID
   * @param tenantId Tenant ID
   * @returns True if successful
   */
  async deleteRole(roleId: string, tenantId: string): Promise<boolean> {
    try {
      // Get the role to check if it exists
      const role = await this.getRole(roleId, tenantId);

      if (!role) {
        return false;
      }

      // Delete the role
      this.roles.delete(roleId);

      // Delete all role assignments for this role
      const assignmentKey = `${tenantId}:${roleId}`;
      this.roleAssignments.delete(assignmentKey);

      return true;
    } catch (error) {
      logger.error('Error deleting role', { error, roleId, tenantId });
      return false;
    }
  }

  /**
   * Assign a role to a user
   *
   * @param userId User ID
   * @param roleId Role ID
   * @param tenantId Tenant ID
   * @param organizationId Optional organization ID for organization-scoped roles
   * @returns True if successful
   */
  async assignRole(
    userId: string,
    roleId: string,
    tenantId: string,
    organizationId?: string
  ): Promise<boolean> {
    try {
      // Check if the role exists
      const role = await this.getRole(roleId, tenantId);

      if (!role) {
        return false;
      }

      // Create the role assignment
      const assignment = {
        userId,
        roleId,
        tenantId,
        organizationId,
        createdAt: new Date()
      };

      // Store the assignment
      const assignmentKey = `${tenantId}:${roleId}`;
      const assignments = this.roleAssignments.get(assignmentKey) || [];
      assignments.push(assignment);
      this.roleAssignments.set(assignmentKey, assignments);

      return true;
    } catch (error) {
      logger.error('Error assigning role', { error, userId, roleId, tenantId, organizationId });
      return false;
    }
  }

  /**
   * Revoke a role from a user
   *
   * @param userId User ID
   * @param roleId Role ID
   * @param tenantId Tenant ID
   * @param organizationId Optional organization ID for organization-scoped roles
   * @returns True if successful
   */
  async revokeRole(
    userId: string,
    roleId: string,
    tenantId: string,
    organizationId?: string
  ): Promise<boolean> {
    try {
      // Get the role assignments
      const assignmentKey = `${tenantId}:${roleId}`;
      const assignments = this.roleAssignments.get(assignmentKey) || [];

      // Find the assignment to remove
      const index = assignments.findIndex(a =>
        a.userId === userId &&
        a.tenantId === tenantId &&
        (organizationId ? a.organizationId === organizationId : true)
      );

      if (index === -1) {
        return false;
      }

      // Remove the assignment
      assignments.splice(index, 1);
      this.roleAssignments.set(assignmentKey, assignments);

      return true;
    } catch (error) {
      logger.error('Error revoking role', { error, userId, roleId, tenantId, organizationId });
      return false;
    }
  }

  /**
   * Get all roles assigned to a user
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param organizationId Optional organization ID to filter by
   * @returns Array of role IDs
   */
  async getUserRoles(
    userId: string,
    tenantId: string,
    organizationId?: string
  ): Promise<string[]> {
    try {
      const roleIds: string[] = [];

      // Iterate through all role assignments
      for (const [key, assignments] of this.roleAssignments.entries()) {
        // Check if this is for the right tenant
        if (!key.startsWith(`${tenantId}:`)) {
          continue;
        }

        // Find assignments for this user
        for (const assignment of assignments) {
          if (assignment.userId === userId &&
              (organizationId ? assignment.organizationId === organizationId : true)) {
            roleIds.push(assignment.roleId);
          }
        }
      }

      return roleIds;
    } catch (error) {
      logger.error('Error getting user roles', { error, userId, tenantId, organizationId });
      return [];
    }
  }

  /**
   * Get all permissions for a set of roles
   *
   * @param roleIds Array of role IDs
   * @param tenantId Tenant ID
   * @returns Array of permissions
   */
  async getRolePermissions(
    roleIds: string[],
    tenantId: string
  ): Promise<string[]> {
    try {
      if (roleIds.length === 0) {
        return [];
      }

      // Get the roles
      const roles = [];
      for (const roleId of roleIds) {
        const role = await this.getRole(roleId, tenantId);
        if (role) {
          roles.push(role);
        }
      }

      // Get direct permissions
      const directPermissions = roles.flatMap((r: Role) => r.permissions || []);

      // Get inherited roles
      const inheritedRoleIds = roles.flatMap((r: Role) => r.inherits || []);

      // If there are inherited roles, get their permissions recursively
      if (inheritedRoleIds.length > 0) {
        const inheritedPermissions = await this.getRolePermissions(inheritedRoleIds, tenantId);
        return [...new Set([...directPermissions, ...inheritedPermissions])];
      }

      return [...new Set(directPermissions)];
    } catch (error) {
      logger.error('Error getting role permissions', { error, roleIds, tenantId });
      return [];
    }
  }

  /**
   * Check if a user has a specific permission
   *
   * @param userId User ID
   * @param permission Permission to check
   * @param tenantId Tenant ID
   * @param organizationId Optional organization ID
   * @returns True if the user has the permission
   */
  async hasPermission(
    userId: string,
    permission: string,
    tenantId: string,
    organizationId?: string
  ): Promise<boolean> {
    try {
      // Get all roles for the user
      const roleIds = await this.getUserRoles(userId, tenantId, organizationId);

      // Get all permissions for these roles
      const permissions = await this.getRolePermissions(roleIds, tenantId);

      // Check for wildcard permission
      if (permissions.includes('*:*')) {
        return true;
      }

      // Check for resource wildcard
      const [resource, action] = permission.split(':');
      if (permissions.includes(`${resource}:*`)) {
        return true;
      }

      // Check for specific permission
      return permissions.includes(permission);
    } catch (error) {
      logger.error('Error checking permission', { error, userId, permission, tenantId, organizationId });
      return false;
    }
  }
}

export const roleService = new RoleService();
