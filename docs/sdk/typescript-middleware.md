# TypeScript SDK: Express Middleware

This document provides detailed documentation for the Express.js middleware included in the NeuralLog Auth TypeScript SDK.

## Express Middleware

The SDK includes middleware for Express.js applications that makes it easy to protect routes with authorization checks.

## Middleware Types

```typescript
// Extend Express Request interface to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Express middleware for authorization
 */
export const authMiddleware = (authClient: AuthClient) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Implementation details...
  };
};
```

## Basic Usage

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

## How It Works

The middleware performs the following steps:

1. Extracts the user ID from the request (e.g., from JWT token or headers)
2. Determines the resource and action based on the request path and method
3. Checks if the user has permission to access the resource
4. If the user has permission, adds the tenant ID to the request and calls `next()`
5. If the user doesn't have permission, returns a 403 Forbidden response

## Middleware Configuration

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

**Example:**

```typescript
// Basic usage
app.use('/api', authMiddleware(authClient));

// Apply to specific routes
app.get('/api/logs', authMiddleware(authClient), (req, res) => {
  // This will only be called if the user has permission
  res.json({ logs: ['system-logs', 'app-logs'] });
});
```

## User Identification

The middleware extracts the user ID from the request using the `extractUserId` function:

```typescript
function extractUserId(req: Request): string {
  // Extract from JWT token or session
  // This is a placeholder implementation
  return req.user?.id || req.headers['x-user-id'] as string || 'anonymous';
}
```

You can customize this behavior by creating your own middleware:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthClient } from '@neurallog/auth-client';

function customAuthMiddleware(authClient: AuthClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Custom user extraction logic
      const userId = req.user?.sub || req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: Missing user ID'
        });
      }
      
      // Rest of the middleware logic...
      // ...
    } catch (error) {
      next(error);
    }
  };
}
```

## Resource and Action Determination

The middleware determines the resource and action based on the request path and method using the `determineResourceAndAction` function:

```typescript
function determineResourceAndAction(req: Request): { resource: string, action: string } {
  // Parse path and method to determine resource and action
  const path = req.path;
  const method = req.method;

  // Example: /api/logs/test-log
  const matches = path.match(/\/api\/logs\/([^\/]+)(?:\/([^\/]+))?/);
  if (matches) {
    const logName = matches[1];
    const logId = matches[2];

    if (logId) {
      return {
        resource: `log_entry:${logId}`,
        action: mapMethodToAction(method)
      };
    } else {
      return {
        resource: `log:${logName}`,
        action: mapMethodToAction(method)
      };
    }
  }

  // Default
  return {
    resource: path,
    action: mapMethodToAction(method)
  };
}
```

You can customize this behavior by creating your own middleware:

```typescript
function customDetermineResourceAndAction(req: Request): { resource: string, action: string } {
  // Custom logic to determine resource and action
  const path = req.path;
  const method = req.method;
  
  // Example: /api/projects/123/tasks/456
  const projectTaskMatch = path.match(/\/api\/projects\/([^\/]+)\/tasks\/([^\/]+)/);
  if (projectTaskMatch) {
    const projectId = projectTaskMatch[1];
    const taskId = projectTaskMatch[2];
    
    return {
      resource: `task:${taskId}`,
      action: mapMethodToAction(method)
    };
  }
  
  // Example: /api/projects/123
  const projectMatch = path.match(/\/api\/projects\/([^\/]+)/);
  if (projectMatch) {
    const projectId = projectMatch[1];
    
    return {
      resource: `project:${projectId}`,
      action: mapMethodToAction(method)
    };
  }
  
  // Default
  return {
    resource: path,
    action: mapMethodToAction(method)
  };
}
```

## HTTP Method Mapping

The middleware maps HTTP methods to actions using the `mapMethodToAction` function:

```typescript
function mapMethodToAction(method: string): string {
  switch (method) {
    case 'GET':
      return 'read';
    case 'POST':
    case 'PUT':
    case 'PATCH':
      return 'write';
    case 'DELETE':
      return 'admin';
    default:
      return 'read';
  }
}
```

You can customize this behavior by creating your own middleware:

```typescript
function customMapMethodToAction(method: string): string {
  switch (method) {
    case 'GET':
      return 'read';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}
```

## Complete Example

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

// Logs routes
app.get('/api/logs', (req, res) => {
  // This will only be called if the user has read permission for /api/logs
  res.json({ logs: ['system-logs', 'app-logs'] });
});

app.get('/api/logs/:logId', (req, res) => {
  // This will only be called if the user has read permission for log:{logId}
  res.json({ log: { id: req.params.logId, entries: [] } });
});

app.post('/api/logs/:logId', (req, res) => {
  // This will only be called if the user has write permission for log:{logId}
  res.json({ status: 'success', message: 'Log entry created' });
});

app.delete('/api/logs/:logId', (req, res) => {
  // This will only be called if the user has admin permission for log:{logId}
  res.json({ status: 'success', message: 'Log deleted' });
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

## Advanced Usage

### Custom Middleware

You can create custom middleware for more complex authorization scenarios:

```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthClient } from '@neurallog/auth-client';

function customAuthMiddleware(authClient: AuthClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user from request
      const userId = req.user?.id || req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized: Missing user ID'
        });
      }
      
      // Extract tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      
      if (!tenantId) {
        return res.status(400).json({
          status: 'error',
          message: 'Bad request: Missing tenant ID'
        });
      }
      
      // Check if user is a member of the tenant
      const isMember = await authClient.isUserInTenant(tenantId, userId);
      
      if (!isMember) {
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden: User is not a member of the tenant'
        });
      }
      
      // Determine resource and action
      const path = req.path;
      const method = req.method;
      
      let resource = '';
      let action = '';
      
      // Custom resource and action determination
      // ...
      
      // Check permission
      const hasPermission = await authClient.check({
        user: userId,
        permission: action,
        resource
      });
      
      if (hasPermission) {
        // Add tenant ID to request
        req.tenantId = tenantId;
        next();
      } else {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden: Insufficient permissions'
        });
      }
    } catch (error) {
      next(error);
    }
  };
}
```

### Role-Based Middleware

You can create middleware that checks for specific roles:

```typescript
function adminOnlyMiddleware(authClient: AuthClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user from request
      const userId = req.user?.id || req.headers['x-user-id'] as string;
      
      // Extract tenant ID from request
      const tenantId = req.headers['x-tenant-id'] as string;
      
      // Check if user is an admin of the tenant
      const isAdmin = await authClient.check({
        user: userId,
        permission: 'admin',
        resource: `tenant:${tenantId}`
      });
      
      if (isAdmin) {
        req.tenantId = tenantId;
        next();
      } else {
        res.status(403).json({
          status: 'error',
          message: 'Forbidden: Admin access required'
        });
      }
    } catch (error) {
      next(error);
    }
  };
}
```

## Best Practices

1. **Consistent User Identification**: Use a consistent method for identifying users
2. **Clear Resource Naming**: Use clear and consistent resource naming conventions
3. **Appropriate Action Mapping**: Map HTTP methods to appropriate actions
4. **Error Handling**: Implement proper error handling in middleware
5. **Logging**: Log authorization decisions for auditing purposes
6. **Performance**: Use caching to improve performance
7. **Security**: Validate and sanitize user input

## Next Steps

- [Core API Reference](./typescript-core.md): Learn about the basic permission management API
- [Tenant Management](./typescript-tenant.md): Learn how to manage tenants
- [User Management](./typescript-user.md): Learn how to manage users within tenants
- [Advanced Usage](./typescript-advanced.md): Learn about advanced SDK features
