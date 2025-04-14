# TypeScript SDK: Core API Reference

This document provides detailed documentation for the core permission management API of the NeuralLog Auth TypeScript SDK.

## AuthClient Class

The `AuthClient` class is the main entry point for interacting with the NeuralLog Auth service.

### Constructor

```typescript
constructor(options: AuthClientOptions)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| options | AuthClientOptions | Configuration options |

**AuthClientOptions:**

| Property | Type | Description | Required | Default |
|----------|------|-------------|----------|---------|
| authServiceUrl | string | URL of the auth service | Yes | - |
| tenantId | string | Tenant ID | Yes | - |
| token | string | JWT token for authentication | No | undefined |
| cacheTtl | number | Cache TTL in seconds | No | 300 |

**Example:**

```typescript
import { AuthClient } from '@neurallog/auth-client';

const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme',
  token: 'your-jwt-token',
  cacheTtl: 300
});
```

## Permission Management

### check

Checks if a user has permission to access a resource.

```typescript
async check(params: CheckParams): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| params | CheckParams | Check parameters |

**CheckParams:**

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| user | string | User identifier | Yes |
| permission | string | Permission to check | Yes |
| resource | string | Resource identifier | Yes |
| contextualTuples | any[] | Contextual tuples | No |

**Returns:**

A Promise that resolves to a boolean indicating whether the user has permission.

**Example:**

```typescript
const hasAccess = await authClient.check({
  user: 'user:alice',
  permission: 'read',
  resource: 'log:system-logs'
});

if (hasAccess) {
  console.log('Access granted');
} else {
  console.log('Access denied');
}
```

### grant

Grants a permission to a user.

```typescript
async grant(params: GrantParams): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| params | GrantParams | Grant parameters |

**GrantParams:**

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| user | string | User identifier | Yes |
| permission | string | Permission to grant | Yes |
| resource | string | Resource identifier | Yes |

**Returns:**

A Promise that resolves to a boolean indicating whether the permission was granted.

**Example:**

```typescript
const granted = await authClient.grant({
  user: 'user:alice',
  permission: 'read',
  resource: 'log:system-logs'
});

if (granted) {
  console.log('Permission granted');
} else {
  console.log('Failed to grant permission');
}
```

### revoke

Revokes a permission from a user.

```typescript
async revoke(params: RevokeParams): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| params | RevokeParams | Revoke parameters |

**RevokeParams:**

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| user | string | User identifier | Yes |
| permission | string | Permission to revoke | Yes |
| resource | string | Resource identifier | Yes |

**Returns:**

A Promise that resolves to a boolean indicating whether the permission was revoked.

**Example:**

```typescript
const revoked = await authClient.revoke({
  user: 'user:alice',
  permission: 'read',
  resource: 'log:system-logs'
});

if (revoked) {
  console.log('Permission revoked');
} else {
  console.log('Failed to revoke permission');
}
```

### getAuthHeaders

Gets auth headers for API requests.

```typescript
getAuthHeaders(): Record<string, string>
```

**Returns:**

An object containing auth headers.

**Example:**

```typescript
const headers = authClient.getAuthHeaders();
// { 'X-Tenant-ID': 'acme' }

// Use with fetch
fetch('https://api.example.com/data', {
  headers: {
    ...authClient.getAuthHeaders(),
    'Content-Type': 'application/json'
  }
});
```

## Permission Types

NeuralLog Auth supports several standard permission types:

| Permission | Relation | Description |
|------------|----------|-------------|
| read | reader | Ability to view a resource |
| write | writer | Ability to modify a resource |
| admin | admin | Full control over a resource |
| owner | owner | Ownership of a resource |

The SDK automatically maps between permission names and relation names:

```typescript
// These are equivalent
await authClient.check({
  user: 'user:alice',
  permission: 'read',
  resource: 'log:system-logs'
});

await authClient.check({
  user: 'user:alice',
  permission: 'reader', // Using relation name directly
  resource: 'log:system-logs'
});
```

## Resource Naming

Resources should be named using a type prefix:

| Resource Type | Naming Convention | Example |
|---------------|-------------------|---------|
| Tenant | tenant:{id} | tenant:acme |
| Log | log:{id} | log:system-logs |
| Log Entry | log_entry:{id} | log_entry:12345 |
| User | user:{id} | user:alice |
| Group | group:{id} | group:engineers |

## Error Handling

The SDK includes error handling for all methods:

```typescript
try {
  const hasAccess = await authClient.check({
    user: 'user:alice',
    permission: 'read',
    resource: 'log:system-logs'
  });
  
  // Handle result
} catch (error) {
  console.error('Error checking permission:', error);
  // Handle error
}
```

## Complete Example

```typescript
import { AuthClient } from '@neurallog/auth-client';

async function managePermissions() {
  // Initialize client
  const authClient = new AuthClient({
    authServiceUrl: 'http://localhost:3040',
    tenantId: 'acme',
    token: 'your-jwt-token'
  });
  
  try {
    // Grant permission
    const granted = await authClient.grant({
      user: 'user:alice',
      permission: 'read',
      resource: 'log:system-logs'
    });
    
    console.log('Permission granted:', granted);
    
    // Check permission
    const hasAccess = await authClient.check({
      user: 'user:alice',
      permission: 'read',
      resource: 'log:system-logs'
    });
    
    console.log('Has access:', hasAccess);
    
    // Revoke permission
    const revoked = await authClient.revoke({
      user: 'user:alice',
      permission: 'read',
      resource: 'log:system-logs'
    });
    
    console.log('Permission revoked:', revoked);
    
    // Check permission again
    const hasAccessAfterRevoke = await authClient.check({
      user: 'user:alice',
      permission: 'read',
      resource: 'log:system-logs'
    });
    
    console.log('Has access after revoke:', hasAccessAfterRevoke);
  } catch (error) {
    console.error('Error managing permissions:', error);
  }
}

managePermissions();
```

## Next Steps

- [Tenant Management](./typescript-tenant.md): Learn how to manage tenants
- [User Management](./typescript-user.md): Learn how to manage users within tenants
- [Express Middleware](./typescript-middleware.md): Learn how to use the Express.js middleware
- [Advanced Usage](./typescript-advanced.md): Learn about advanced SDK features
