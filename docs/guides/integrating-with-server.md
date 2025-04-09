# Integrating with NeuralLog Server

This guide explains how to integrate NeuralLog Auth with the NeuralLog Server to implement authorization for API endpoints.

## Overview

NeuralLog Server needs to check permissions before allowing access to resources like logs and log entries. By integrating with NeuralLog Auth, the server can ensure that users only access resources they're authorized to access.

## Integration Steps

### Step 1: Install the TypeScript SDK

In your NeuralLog Server project, install the NeuralLog Auth client SDK:

```bash
npm install @neurallog/auth-client
```

### Step 2: Initialize the Auth Client

Create an auth client instance in your server code:

```typescript
// src/services/authClient.ts
import { AuthClient } from '@neurallog/auth-client';

// Create a singleton instance
let authClientInstance: AuthClient | null = null;

export function getAuthClient(tenantId: string = 'default'): AuthClient {
  if (!authClientInstance) {
    authClientInstance = new AuthClient({
      authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3040',
      tenantId,
      cacheTtl: parseInt(process.env.AUTH_CACHE_TTL || '300')
    });
  }
  
  return authClientInstance;
}
```

### Step 3: Create Auth Middleware

Create middleware to check permissions for API requests:

```typescript
// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { getAuthClient } from '../services/authClient';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extract tenant ID from request
  const tenantId = req.headers['x-tenant-id'] as string || 'default';
  
  // Extract user ID from request (e.g., from JWT token)
  const userId = extractUserId(req);
  
  // Get auth client for this tenant
  const authClient = getAuthClient(tenantId);
  
  // Determine resource and permission based on the request
  const { resource, permission } = getResourceAndPermission(req);
  
  // Check permission
  authClient.check({
    user: userId,
    permission,
    resource
  })
    .then(allowed => {
      if (allowed) {
        // Store tenant ID in request for downstream handlers
        req.tenantId = tenantId;
        next();
      } else {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden'
        });
      }
    })
    .catch(error => {
      console.error('Error checking permission:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    });
}

// Helper function to extract user ID from request
function extractUserId(req: Request): string {
  // Extract from JWT token or session
  // This is a placeholder implementation
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  
  return 'anonymous';
}

// Helper function to determine resource and permission
function getResourceAndPermission(req: Request): { resource: string, permission: string } {
  const method = req.method;
  const path = req.path;
  
  // Map HTTP method to permission
  let permission = 'read';
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    permission = 'write';
  } else if (method === 'DELETE') {
    permission = 'admin';
  }
  
  // Extract resource from path
  let resource = '';
  
  // Example: /api/logs/system-logs
  const logMatch = path.match(/\/api\/logs\/([^\/]+)$/);
  if (logMatch) {
    resource = `log:${logMatch[1]}`;
    return { resource, permission };
  }
  
  // Example: /api/logs/system-logs/entries/123
  const entryMatch = path.match(/\/api\/logs\/([^\/]+)\/entries\/([^\/]+)$/);
  if (entryMatch) {
    resource = `log_entry:${entryMatch[2]}`;
    return { resource, permission };
  }
  
  // Default: use path as resource
  resource = path;
  return { resource, permission };
}
```

### Step 4: Apply Middleware to Routes

Apply the auth middleware to your routes:

```typescript
// src/server/routes.ts
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import * as logsController from './controllers/logsController';

const router = express.Router();

// Public routes
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'NeuralLog server is running'
  });
});

// Protected routes
router.get('/api/logs', authMiddleware, logsController.getLogs);
router.get('/api/logs/:logName', authMiddleware, logsController.getLogByName);
router.post('/api/logs/:logName', authMiddleware, logsController.createLog);
router.patch('/api/logs/:logName', authMiddleware, logsController.appendToLog);
router.delete('/api/logs/:logName', authMiddleware, logsController.clearLog);

export default router;
```

### Step 5: Update Controllers to Use Tenant Context

Update your controllers to use the tenant context:

```typescript
// src/server/controllers/logsController.ts
import { Request, Response } from 'express';
import { getStorageAdapter } from '../../storage';

export const getLogs = async (req: Request, res: Response) => {
  try {
    // Get tenant ID from request (set by auth middleware)
    const tenantId = req.tenantId || 'default';
    
    // Get namespace from query params or use default
    const namespace = req.query.namespace as string || 'default';
    
    // Get storage adapter with tenant context
    const storage = getStorageAdapter(namespace, tenantId);
    
    // Get logs
    const logs = await storage.getLogs();
    
    res.json({
      status: 'success',
      namespace,
      logs
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Other controller methods...
```

### Step 6: Update Storage Adapters for Multi-tenancy

Update your storage adapters to support multi-tenancy:

```typescript
// src/storage/BaseStorageAdapter.ts
export abstract class BaseStorageAdapter {
  protected namespace: string;
  protected tenantId: string;
  
  constructor(namespace: string = 'default', tenantId: string = 'default') {
    this.namespace = namespace;
    this.tenantId = tenantId;
  }
  
  // Generate a key that includes tenant ID for isolation
  protected getKey(key: string): string {
    return `${this.tenantId}:${this.namespace}:${key}`;
  }
  
  // Other methods...
}
```

### Step 7: Create Permissions When Creating Resources

When creating resources like logs, grant appropriate permissions:

```typescript
// src/server/controllers/logsController.ts
import { Request, Response } from 'express';
import { getStorageAdapter } from '../../storage';
import { getAuthClient } from '../../services/authClient';

export const createLog = async (req: Request, res: Response) => {
  try {
    // Get tenant ID from request
    const tenantId = req.tenantId || 'default';
    
    // Get namespace from query params or use default
    const namespace = req.query.namespace as string || 'default';
    
    // Get log name from params
    const logName = req.params.logName;
    
    // Get user ID
    const userId = req.user?.id ? `user:${req.user.id}` : 'anonymous';
    
    // Get storage adapter with tenant context
    const storage = getStorageAdapter(namespace, tenantId);
    
    // Create log
    const result = await storage.createLog(logName, req.body);
    
    // Grant permissions
    const authClient = getAuthClient(tenantId);
    
    // Grant owner permission to the creator
    await authClient.grant({
      user: userId,
      permission: 'owner',
      resource: `log:${logName}`
    });
    
    // Link log to tenant
    await authClient.grant({
      user: `log:${logName}`,
      permission: 'parent',
      resource: `tenant:${tenantId}`
    });
    
    res.json({
      status: 'success',
      namespace,
      logName,
      result
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
```

## Testing the Integration

### Step 1: Start the Auth Service

Make sure the NeuralLog Auth service is running:

```bash
cd ../auth
docker-compose up -d
```

### Step 2: Start the NeuralLog Server

Start the NeuralLog Server with the AUTH_SERVICE_URL environment variable:

```bash
cd ../server
AUTH_SERVICE_URL=http://localhost:3040 npm run dev
```

### Step 3: Create a Tenant

Create a tenant for testing:

```bash
curl -X POST http://localhost:3040/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "adminUserId": "user:admin"
  }'
```

### Step 4: Test API Endpoints

Test the protected API endpoints:

```bash
# This should fail (no permissions)
curl -X GET http://localhost:3030/api/logs \
  -H "X-Tenant-ID: test-tenant" \
  -H "X-User-ID: user:alice"

# Create a log as admin (should succeed)
curl -X POST http://localhost:3030/api/logs/test-log \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: test-tenant" \
  -H "X-User-ID: user:admin" \
  -d '{"message":"Test message"}'

# Get logs as admin (should succeed)
curl -X GET http://localhost:3030/api/logs \
  -H "X-Tenant-ID: test-tenant" \
  -H "X-User-ID: user:admin"

# Grant read permission to alice
curl -X POST http://localhost:3040/api/auth/grant \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: test-tenant" \
  -d '{
    "user": "user:alice",
    "relation": "reader",
    "object": "log:test-log"
  }'

# Get logs as alice (should now succeed)
curl -X GET http://localhost:3030/api/logs/test-log \
  -H "X-Tenant-ID: test-tenant" \
  -H "X-User-ID: user:alice"
```

## Advanced Integration

### Handling JWT Authentication

In a real-world scenario, you would typically use JWT tokens for authentication:

```typescript
// src/middleware/jwtMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    
    // Set user in request
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
}
```

Apply the JWT middleware before the auth middleware:

```typescript
router.get('/api/logs', jwtMiddleware, authMiddleware, logsController.getLogs);
```

### Handling Role-Based Access Control

You can implement role-based access control by checking tenant roles:

```typescript
// Check if user is a tenant admin
const isAdmin = await authClient.check({
  user: userId,
  permission: 'admin',
  resource: `tenant:${tenantId}`
});

if (isAdmin) {
  // Allow administrative actions
} else {
  // Check specific resource permissions
}
```

### Handling Cross-Tenant Access

In some cases, you might need to allow cross-tenant access:

```typescript
// Grant cross-tenant access
await authClient.grant({
  user: 'user:alice@tenant1',
  permission: 'reader',
  resource: 'log:system-logs@tenant2'
});
```

## Best Practices

1. **Cache Authorization Decisions**: Use the built-in caching in the SDK to improve performance.

2. **Use Contextual Tuples**: For complex authorization scenarios, use contextual tuples.

3. **Implement Proper Error Handling**: Handle authorization errors gracefully.

4. **Log Authorization Decisions**: Log important authorization decisions for auditing.

5. **Use Middleware Consistently**: Apply authorization middleware consistently across all protected routes.

6. **Keep Tenant Context**: Always maintain tenant context throughout the request lifecycle.

7. **Implement Proper Testing**: Write tests for authorization logic.

## Next Steps

- [Implementing Role-Based Access Control](./implementing-rbac.md): Learn how to implement RBAC
- [Managing Tenant Permissions](./managing-tenant-permissions.md): Learn how to manage tenant permissions
- [Tenant Migration](./tenant-migration.md): Learn how to migrate between tenants
