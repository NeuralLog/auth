# TypeScript SDK: User Management

This document provides detailed documentation for the user management API of the NeuralLog Auth TypeScript SDK.

## User Management

The SDK provides methods for managing users within tenants, including adding, removing, and updating users.

## User Types

```typescript
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
```

## Adding Users to Tenants

### addUserToTenant

Adds a user to a tenant.

```typescript
async addUserToTenant(tenantId: string, params: AddUserToTenantParams): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |
| params | AddUserToTenantParams | User and role information | Yes |

**AddUserToTenantParams:**

| Property | Type | Description | Required | Default |
|----------|------|-------------|----------|---------|
| userId | string | User identifier | Yes | - |
| role | TenantRole | User role in the tenant | No | TenantRole.MEMBER |

**Returns:**

A Promise that resolves to a boolean indicating whether the user was added to the tenant.

**Example:**

```typescript
// Add a user as a member (default role)
const added = await authClient.addUserToTenant('acme', {
  userId: 'user:bob'
});

// Add a user as an admin
const addedAsAdmin = await authClient.addUserToTenant('acme', {
  userId: 'user:alice',
  role: TenantRole.ADMIN
});
```

## Retrieving Users in Tenants

### listTenantUsers

Lists all users in a tenant.

```typescript
async listTenantUsers(tenantId: string): Promise<TenantUser[]>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |

**Returns:**

A Promise that resolves to an array of TenantUser objects.

**Example:**

```typescript
const users = await authClient.listTenantUsers('acme');

console.log('Number of users:', users.length);

users.forEach(user => {
  console.log('User ID:', user.userId);
  console.log('User role:', user.role);
});
```

### isUserInTenant

Checks if a user is a member of a tenant.

```typescript
async isUserInTenant(tenantId: string, userId: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |
| userId | string | User identifier | Yes |

**Returns:**

A Promise that resolves to a boolean indicating whether the user is a member of the tenant.

**Example:**

```typescript
const isMember = await authClient.isUserInTenant('acme', 'user:bob');

if (isMember) {
  console.log('User is a member of the tenant');
} else {
  console.log('User is not a member of the tenant');
}
```

### getUserRole

Gets a user's role in a tenant.

```typescript
async getUserRole(tenantId: string, userId: string): Promise<TenantRole | null>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |
| userId | string | User identifier | Yes |

**Returns:**

A Promise that resolves to the user's role in the tenant, or null if the user is not a member of the tenant.

**Example:**

```typescript
const role = await authClient.getUserRole('acme', 'user:bob');

if (role === TenantRole.ADMIN) {
  console.log('User is an admin');
} else if (role === TenantRole.MEMBER) {
  console.log('User is a member');
} else {
  console.log('User is not a member of the tenant');
}
```

## Updating User Roles

### updateUserRole

Updates a user's role in a tenant.

```typescript
async updateUserRole(tenantId: string, params: UpdateUserRoleParams): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |
| params | UpdateUserRoleParams | User and role information | Yes |

**UpdateUserRoleParams:**

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| userId | string | User identifier | Yes |
| role | TenantRole | New role for the user | Yes |

**Returns:**

A Promise that resolves to a boolean indicating whether the user's role was updated.

**Example:**

```typescript
// Promote a user to admin
const promoted = await authClient.updateUserRole('acme', {
  userId: 'user:bob',
  role: TenantRole.ADMIN
});

// Demote a user to member
const demoted = await authClient.updateUserRole('acme', {
  userId: 'user:charlie',
  role: TenantRole.MEMBER
});
```

## Removing Users from Tenants

### removeUserFromTenant

Removes a user from a tenant.

```typescript
async removeUserFromTenant(tenantId: string, userId: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |
| userId | string | User identifier | Yes |

**Returns:**

A Promise that resolves to a boolean indicating whether the user was removed from the tenant.

**Example:**

```typescript
const removed = await authClient.removeUserFromTenant('acme', 'user:bob');

if (removed) {
  console.log('User removed from tenant');
} else {
  console.log('Failed to remove user from tenant');
}
```

## Complete Example

```typescript
import { AuthClient, TenantRole } from '@neurallog/auth-client';

async function manageUsers() {
  // Initialize client
  const authClient = new AuthClient({
    authServiceUrl: 'http://localhost:3040',
    tenantId: 'acme',
    token: 'your-admin-token'
  });
  
  try {
    // Add users to the tenant
    await authClient.addUserToTenant('acme', {
      userId: 'user:alice',
      role: TenantRole.ADMIN
    });
    
    await authClient.addUserToTenant('acme', {
      userId: 'user:bob',
      role: TenantRole.MEMBER
    });
    
    // List all users in the tenant
    const users = await authClient.listTenantUsers('acme');
    console.log('Users in tenant:', users);
    
    // Check if a user is in the tenant
    const isBobMember = await authClient.isUserInTenant('acme', 'user:bob');
    console.log('Is Bob a member?', isBobMember);
    
    // Get a user's role
    const aliceRole = await authClient.getUserRole('acme', 'user:alice');
    console.log('Alice\'s role:', aliceRole);
    
    // Update a user's role
    const updated = await authClient.updateUserRole('acme', {
      userId: 'user:bob',
      role: TenantRole.ADMIN
    });
    console.log('Bob\'s role updated:', updated);
    
    // Get Bob's new role
    const bobNewRole = await authClient.getUserRole('acme', 'user:bob');
    console.log('Bob\'s new role:', bobNewRole);
    
    // Remove a user from the tenant
    const removed = await authClient.removeUserFromTenant('acme', 'user:bob');
    console.log('Bob removed from tenant:', removed);
    
    // Verify Bob is no longer in the tenant
    const isBobStillMember = await authClient.isUserInTenant('acme', 'user:bob');
    console.log('Is Bob still a member?', isBobStillMember);
  } catch (error) {
    console.error('Error managing users:', error);
  }
}

manageUsers();
```

## Role-Based Access Control

User roles in tenants are the foundation for role-based access control (RBAC) in NeuralLog Auth:

```typescript
// Check if user is an admin
const isAdmin = await authClient.check({
  user: 'user:alice',
  permission: 'admin',
  resource: `tenant:acme`
});

// Check if user is a member
const isMember = await authClient.check({
  user: 'user:bob',
  permission: 'member',
  resource: `tenant:acme`
});

// Grant resource access based on role
if (isAdmin) {
  // Grant admin access to all logs
  const logs = await getLogs('acme');
  
  for (const log of logs) {
    await authClient.grant({
      user: 'user:alice',
      permission: 'admin',
      resource: `log:${log.id}`
    });
  }
} else if (isMember) {
  // Grant read access to specific logs
  await authClient.grant({
    user: 'user:bob',
    permission: 'read',
    resource: 'log:system-logs'
  });
}
```

## Best Practices

1. **Limit Admin Users**: Keep the number of admin users to a minimum
2. **Role Separation**: Use different roles for different levels of access
3. **Regular Audits**: Regularly audit user roles and permissions
4. **Role Transitions**: Have a process for transitioning roles when users change positions
5. **Default to Least Privilege**: Default to the lowest level of access needed

## Next Steps

- [Tenant Management](./typescript-tenant.md): Learn how to manage tenants
- [Core API Reference](./typescript-core.md): Learn about the basic permission management API
- [Express Middleware](./typescript-middleware.md): Learn how to use the Express.js middleware
- [Advanced Usage](./typescript-advanced.md): Learn about advanced SDK features
