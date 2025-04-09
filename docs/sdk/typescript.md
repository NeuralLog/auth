# TypeScript SDK Documentation

This document provides detailed documentation for the NeuralLog Auth TypeScript SDK.

## Installation

Install the SDK using npm:

```bash
npm install @neurallog/auth-client
```

Or using yarn:

```bash
yarn add @neurallog/auth-client
```

## Basic Usage

```typescript
import { AuthClient } from '@neurallog/auth-client';

// Initialize the client
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme',
  token: 'your-jwt-token', // Optional
  cacheTtl: 300 // Optional, default: 300 seconds
});

// Check if a user has permission
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

## API Reference

### AuthClient

The main class for interacting with the NeuralLog Auth service.

#### Constructor

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

#### Methods

##### check

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
```

##### grant

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
```

##### revoke

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
```

##### getAuthHeaders

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
```

## Express Middleware

The SDK includes middleware for Express.js applications.

```typescript
import express from 'express';
import { authMiddleware } from '@neurallog/auth-client/middleware';
import { AuthClient } from '@neurallog/auth-client';

const app = express();
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme'
});

// Protect routes with the auth middleware
app.use('/api', authMiddleware(authClient));

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
```

### authMiddleware

Creates middleware for Express.js applications.

```typescript
function authMiddleware(authClient: AuthClient): (req: Request, res: Response, next: NextFunction) => Promise<void>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| authClient | AuthClient | An instance of AuthClient |

**Returns:**

Express middleware function.

## Advanced Usage

### Caching

The SDK implements caching to improve performance:

```typescript
// Configure cache TTL (in seconds)
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme',
  cacheTtl: 600 // 10 minutes
});
```

### Contextual Tuples

You can include contextual tuples in authorization checks:

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

### Error Handling

The SDK includes error handling:

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

### Custom Middleware

You can create custom middleware:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthClient } from '@neurallog/auth-client';

function customAuthMiddleware(authClient: AuthClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user from request
      const userId = req.headers['x-user-id'] as string;
      
      // Determine resource and action
      const resource = `log:${req.params.logId}`;
      const permission = req.method === 'GET' ? 'read' : 'write';
      
      // Check permission
      const hasPermission = await authClient.check({
        user: userId,
        permission,
        resource
      });
      
      if (hasPermission) {
        next();
      } else {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden'
        });
      }
    } catch (error) {
      next(error);
    }
  };
}
```

## Examples

### Basic Permission Check

```typescript
import { AuthClient } from '@neurallog/auth-client';

async function checkAccess() {
  const authClient = new AuthClient({
    authServiceUrl: 'http://localhost:3040',
    tenantId: 'acme'
  });
  
  const hasAccess = await authClient.check({
    user: 'user:alice',
    permission: 'read',
    resource: 'log:system-logs'
  });
  
  console.log('Has access:', hasAccess);
}

checkAccess();
```

### Managing Permissions

```typescript
import { AuthClient } from '@neurallog/auth-client';

async function managePermissions() {
  const authClient = new AuthClient({
    authServiceUrl: 'http://localhost:3040',
    tenantId: 'acme',
    token: 'your-jwt-token'
  });
  
  // Grant permission
  await authClient.grant({
    user: 'user:alice',
    permission: 'read',
    resource: 'log:system-logs'
  });
  
  // Check permission
  const hasAccess = await authClient.check({
    user: 'user:alice',
    permission: 'read',
    resource: 'log:system-logs'
  });
  
  console.log('Has access:', hasAccess);
  
  // Revoke permission
  await authClient.revoke({
    user: 'user:alice',
    permission: 'read',
    resource: 'log:system-logs'
  });
  
  // Check permission again
  const hasAccessAfterRevoke = await authClient.check({
    user: 'user:alice',
    permission: 'read',
    resource: 'log:system-logs'
  });
  
  console.log('Has access after revoke:', hasAccessAfterRevoke);
}

managePermissions();
```

### Express Integration

```typescript
import express from 'express';
import { authMiddleware } from '@neurallog/auth-client/middleware';
import { AuthClient } from '@neurallog/auth-client';

const app = express();
app.use(express.json());

const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme'
});

// Public routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Protected routes
app.use('/api', authMiddleware(authClient));

app.get('/api/logs', (req, res) => {
  res.json({ logs: ['system-logs', 'app-logs'] });
});

app.get('/api/logs/:logId', (req, res) => {
  res.json({ log: { id: req.params.logId, entries: [] } });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
```

## Next Steps

- [Python SDK](./python.md): Documentation for the Python SDK
- [Unity SDK](./unity.md): Documentation for the Unity SDK
- [API Reference](../api/auth-api.md): Complete API documentation
