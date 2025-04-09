# TypeScript SDK: Advanced Usage

This document provides detailed documentation for advanced features of the NeuralLog Auth TypeScript SDK.

## Caching

The SDK implements caching to improve performance by reducing the number of requests to the auth service.

### Cache Configuration

You can configure the cache when initializing the AuthClient:

```typescript
import { AuthClient } from '@neurallog/auth-client';

const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme',
  cacheTtl: 600 // 10 minutes (default: 300 seconds)
});
```

### How Caching Works

1. When you call `check()`, the SDK first checks if the result is cached
2. If the result is cached and not expired, it returns the cached result
3. If the result is not cached or expired, it makes a request to the auth service
4. The result is then cached for future requests

### Cache Invalidation

The cache is automatically invalidated when:

- You call `grant()` or `revoke()` for a permission
- The cache TTL expires

```typescript
// Grant a permission (invalidates cache)
await authClient.grant({
  user: 'user:alice',
  permission: 'read',
  resource: 'log:system-logs'
});

// Revoke a permission (invalidates cache)
await authClient.revoke({
  user: 'user:alice',
  permission: 'read',
  resource: 'log:system-logs'
});
```

### Cache Implementation

The SDK uses [node-cache](https://www.npmjs.com/package/node-cache) for caching:

```typescript
// Create cache
this.cache = new NodeCache({
  stdTTL: options.cacheTtl || 300,
  checkperiod: (options.cacheTtl || 300) * 0.2
});
```

## Contextual Tuples

Contextual tuples allow you to include additional authorization information in a specific check without persisting it.

### Basic Usage

```typescript
const hasAccess = await authClient.check({
  user: 'user:alice',
  permission: 'read',
  resource: 'log:system-logs',
  contextualTuples: [
    {
      user: 'user:alice',
      relation: 'department',
      object: 'department:it'
    },
    {
      user: 'department:it',
      relation: 'reader',
      object: 'log:system-logs'
    }
  ]
});
```

### Use Cases

#### Group-Based Access Control

```typescript
// Check if user has access through group membership
const hasAccess = await authClient.check({
  user: 'user:bob',
  permission: 'read',
  resource: 'log:system-logs',
  contextualTuples: [
    {
      user: 'user:bob',
      relation: 'member',
      object: 'group:engineers'
    },
    {
      user: 'group:engineers',
      relation: 'reader',
      object: 'log:system-logs'
    }
  ]
});
```

#### Temporary Access

```typescript
// Grant temporary access for a specific check
const hasTemporaryAccess = await authClient.check({
  user: 'user:charlie',
  permission: 'read',
  resource: 'log:system-logs',
  contextualTuples: [
    {
      user: 'user:charlie',
      relation: 'reader',
      object: 'log:system-logs'
    }
  ]
});
```

#### Attribute-Based Access Control

```typescript
// Check access based on attributes
const hasAccess = await authClient.check({
  user: 'user:dave',
  permission: 'read',
  resource: 'log:system-logs',
  contextualTuples: [
    {
      user: 'user:dave',
      relation: 'level',
      object: 'level:senior'
    },
    {
      user: 'level:senior',
      relation: 'reader',
      object: 'log:system-logs'
    }
  ]
});
```

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

### Common Errors

#### Network Errors

```typescript
try {
  const hasAccess = await authClient.check({
    user: 'user:alice',
    permission: 'read',
    resource: 'log:system-logs'
  });
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('Could not connect to auth service');
  } else if (error.code === 'ETIMEDOUT') {
    console.error('Connection to auth service timed out');
  } else {
    console.error('Network error:', error);
  }
}
```

#### API Errors

```typescript
try {
  const hasAccess = await authClient.check({
    user: 'user:alice',
    permission: 'read',
    resource: 'log:system-logs'
  });
} catch (error) {
  if (error.response) {
    if (error.response.status === 400) {
      console.error('Bad request:', error.response.data);
    } else if (error.response.status === 401) {
      console.error('Unauthorized:', error.response.data);
    } else if (error.response.status === 403) {
      console.error('Forbidden:', error.response.data);
    } else {
      console.error('API error:', error.response.data);
    }
  } else {
    console.error('Error:', error);
  }
}
```

## Custom Headers

You can add custom headers to API requests:

```typescript
import axios from 'axios';
import { AuthClient } from '@neurallog/auth-client';

// Create a custom axios instance
const axiosInstance = axios.create({
  headers: {
    'Custom-Header': 'custom-value'
  }
});

// Create an auth client with the custom axios instance
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme'
});

// Replace the client's axios instance
authClient['client'] = axiosInstance;
```

## Batch Operations

For better performance, you can batch multiple operations:

```typescript
async function batchGrantPermissions(users, permissions, resources) {
  const promises = [];
  
  for (const user of users) {
    for (const permission of permissions) {
      for (const resource of resources) {
        promises.push(authClient.grant({
          user,
          permission,
          resource
        }));
      }
    }
  }
  
  return Promise.all(promises);
}

// Usage
const users = ['user:alice', 'user:bob', 'user:charlie'];
const permissions = ['read', 'write'];
const resources = ['log:system-logs', 'log:app-logs', 'log:audit-logs'];

await batchGrantPermissions(users, permissions, resources);
```

## Advanced Authorization Patterns

### Role-Based Access Control (RBAC)

```typescript
// Define roles
const roles = {
  admin: ['read', 'write', 'admin'],
  editor: ['read', 'write'],
  viewer: ['read']
};

// Assign role to user
async function assignRole(userId, role, resourceId) {
  const permissions = roles[role];
  
  if (!permissions) {
    throw new Error(`Invalid role: ${role}`);
  }
  
  const promises = permissions.map(permission => 
    authClient.grant({
      user: userId,
      permission,
      resource: resourceId
    })
  );
  
  return Promise.all(promises);
}

// Usage
await assignRole('user:alice', 'admin', 'log:system-logs');
await assignRole('user:bob', 'editor', 'log:app-logs');
await assignRole('user:charlie', 'viewer', 'log:audit-logs');
```

### Attribute-Based Access Control (ABAC)

```typescript
// Check access based on attributes
async function checkAttributeBasedAccess(userId, permission, resourceId, attributes) {
  const contextualTuples = [];
  
  // Add attribute tuples
  for (const [key, value] of Object.entries(attributes)) {
    contextualTuples.push({
      user: userId,
      relation: key,
      object: `${key}:${value}`
    });
    
    contextualTuples.push({
      user: `${key}:${value}`,
      relation: permission,
      object: resourceId
    });
  }
  
  return authClient.check({
    user: userId,
    permission,
    resource: resourceId,
    contextualTuples
  });
}

// Usage
const hasAccess = await checkAttributeBasedAccess(
  'user:dave',
  'read',
  'log:system-logs',
  {
    department: 'it',
    level: 'senior',
    location: 'hq'
  }
);
```

### Relationship-Based Access Control (ReBAC)

```typescript
// Check access based on relationships
async function checkRelationshipBasedAccess(userId, permission, resourceId) {
  // Get user's relationships
  const teams = await getUserTeams(userId);
  const projects = await getUserProjects(userId);
  
  const contextualTuples = [];
  
  // Add team relationships
  for (const team of teams) {
    contextualTuples.push({
      user: userId,
      relation: 'member',
      object: `team:${team.id}`
    });
    
    contextualTuples.push({
      user: `team:${team.id}`,
      relation: permission,
      object: resourceId
    });
  }
  
  // Add project relationships
  for (const project of projects) {
    contextualTuples.push({
      user: userId,
      relation: 'contributor',
      object: `project:${project.id}`
    });
    
    contextualTuples.push({
      user: `project:${project.id}`,
      relation: permission,
      object: resourceId
    });
  }
  
  return authClient.check({
    user: userId,
    permission,
    resource: resourceId,
    contextualTuples
  });
}

// Usage
const hasAccess = await checkRelationshipBasedAccess(
  'user:eve',
  'read',
  'log:system-logs'
);
```

## Performance Optimization

### Caching Strategies

```typescript
// Use a longer cache TTL for read-heavy workloads
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme',
  cacheTtl: 1800 // 30 minutes
});

// Implement a second-level cache for frequently accessed permissions
const permissionCache = new Map();

async function checkPermissionWithCache(user, permission, resource) {
  const cacheKey = `${user}:${permission}:${resource}`;
  
  // Check second-level cache
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey);
  }
  
  // Check with auth client (which has its own cache)
  const hasPermission = await authClient.check({
    user,
    permission,
    resource
  });
  
  // Update second-level cache
  permissionCache.set(cacheKey, hasPermission);
  
  return hasPermission;
}
```

### Batch Checking

```typescript
// Check multiple permissions in parallel
async function checkMultiplePermissions(user, permissions, resource) {
  const promises = permissions.map(permission => 
    authClient.check({
      user,
      permission,
      resource
    })
  );
  
  const results = await Promise.all(promises);
  
  return permissions.reduce((acc, permission, index) => {
    acc[permission] = results[index];
    return acc;
  }, {});
}

// Usage
const permissions = await checkMultiplePermissions(
  'user:alice',
  ['read', 'write', 'admin'],
  'log:system-logs'
);

console.log('Can read:', permissions.read);
console.log('Can write:', permissions.write);
console.log('Is admin:', permissions.admin);
```

## Next Steps

- [Core API Reference](./typescript-core.md): Learn about the basic permission management API
- [Tenant Management](./typescript-tenant.md): Learn how to manage tenants
- [User Management](./typescript-user.md): Learn how to manage users within tenants
- [Express Middleware](./typescript-middleware.md): Learn how to use the Express.js middleware
