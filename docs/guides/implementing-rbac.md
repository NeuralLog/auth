# Implementing Role-Based Access Control (RBAC)

This guide explains how to implement Role-Based Access Control (RBAC) using NeuralLog Auth.

## What is RBAC?

Role-Based Access Control (RBAC) is an approach to restricting system access to authorized users based on their roles within an organization. In NeuralLog Auth, RBAC is implemented using OpenFGA's relationship-based authorization model.

## RBAC Architecture in NeuralLog Auth

NeuralLog Auth implements RBAC through a combination of:

1. **Tenant Roles**: Users can have different roles within a tenant (admin, member)
2. **Resource Permissions**: Users can have different permissions on resources (read, write, admin, owner)
3. **Hierarchical Relationships**: Permissions can flow from tenant roles to resource access

### Visual Representation

```
┌─────────────────────────────────────────────────────────────────┐
│                          Tenant                                 │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ Admin Role  │    │ Member Role │    │ Custom Role │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│         │                 │                  │                   │
│         ▼                 ▼                  ▼                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ Full Access │    │ Limited     │    │ Custom      │          │
│  │             │    │ Access      │    │ Permissions │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Resources                          │    │
│  │                                                         │    │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────┐ │    │
│  │  │ Logs    │    │ Entries │    │ Users   │    │ ...   │ │    │
│  │  └─────────┘    └─────────┘    └─────────┘    └───────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Define Roles

NeuralLog Auth defines two built-in roles:

```typescript
export enum TenantRole {
  ADMIN = 'admin',
  MEMBER = 'member'
}
```

- **ADMIN**: Full access to all tenant resources
- **MEMBER**: Basic access to tenant resources

You can extend this with custom roles by adding additional relations in the authorization model.

### Step 2: Assign Roles to Users

When adding users to a tenant, assign them appropriate roles:

```typescript
// Using the TypeScript SDK
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme'
});

// Add a user as an admin
await authClient.addUserToTenant('acme', {
  userId: 'user:alice',
  role: TenantRole.ADMIN
});

// Add a user as a member
await authClient.addUserToTenant('acme', {
  userId: 'user:bob',
  role: TenantRole.MEMBER
});
```

Using the REST API directly:

```bash
# Add a user as an admin
curl -X POST http://localhost:3040/api/tenants/acme/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "userId": "user:alice",
    "role": "admin"
  }'

# Add a user as a member
curl -X POST http://localhost:3040/api/tenants/acme/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token-here" \
  -d '{
    "userId": "user:bob",
    "role": "member"
  }'
```

### Step 3: Define Resource Permissions

Define what permissions each role should have on different resources:

```typescript
// Grant admin full access to all logs
await authClient.grant({
  user: 'user:alice',
  permission: 'admin',
  resource: 'tenant:acme'
});

// Grant member read access to a specific log
await authClient.grant({
  user: 'user:bob',
  permission: 'read',
  resource: 'log:system-logs'
});
```

### Step 4: Implement Permission Checks

In your application code, check permissions before allowing access:

```typescript
// Check if user has permission to access a resource
const hasAccess = await authClient.check({
  user: 'user:bob',
  permission: 'read',
  resource: 'log:system-logs'
});

if (hasAccess) {
  // Allow the operation
} else {
  // Deny the operation
}
```

Using the middleware:

```typescript
import express from 'express';
import { authMiddleware } from '@neurallog/auth-client/middleware';

const app = express();
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme'
});

// Protect routes with the auth middleware
app.use('/api/logs', authMiddleware(authClient));
```

## Advanced RBAC Patterns

### Role Hierarchy

You can implement role hierarchy by defining parent-child relationships between roles:

```typescript
// In the authorization model
{
  "type": "role",
  "relations": {
    "parent": {
      "this": {}
    },
    "member": {
      "union": {
        "child": [
          {
            "this": {}
          },
          {
            "computedUserset": {
              "relation": "parent"
            }
          }
        ]
      }
    }
  }
}
```

This allows permissions to flow from parent roles to child roles.

### Resource-Specific Roles

You can define roles that are specific to certain resources:

```typescript
// Grant a user the "editor" role for a specific log
await authClient.grant({
  user: 'user:charlie',
  permission: 'editor',
  resource: 'log:system-logs'
});
```

### Dynamic Roles

You can implement dynamic roles using contextual tuples:

```typescript
// Check if a user has access based on department membership
const hasAccess = await authClient.check({
  user: 'user:dave',
  permission: 'read',
  resource: 'log:system-logs',
  contextualTuples: [
    {
      user: 'user:dave',
      relation: 'member',
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

## Real-World Example: Multi-Tenant Application

Let's implement RBAC for a multi-tenant logging application:

### 1. Define Tenant Structure

```typescript
// Create tenants
await authClient.createTenant('acme', 'user:alice');
await authClient.createTenant('beta', 'user:bob');

// Add users to tenants
await authClient.addUserToTenant('acme', {
  userId: 'user:charlie',
  role: TenantRole.MEMBER
});

await authClient.addUserToTenant('beta', {
  userId: 'user:dave',
  role: TenantRole.MEMBER
});
```

### 2. Define Resource Permissions

```typescript
// Create logs
const acmeLog = await createLog('acme-logs', 'acme');
const betaLog = await createLog('beta-logs', 'beta');

// Grant permissions
await authClient.grant({
  user: 'user:charlie',
  permission: 'write',
  resource: `log:${acmeLog.id}`
});

await authClient.grant({
  user: 'user:dave',
  permission: 'read',
  resource: `log:${betaLog.id}`
});
```

### 3. Implement Access Control in API

```typescript
app.get('/api/logs/:logId', async (req, res) => {
  const logId = req.params.logId;
  const userId = req.user.id;
  const tenantId = req.headers['x-tenant-id'];
  
  // Check if user has read permission
  const hasAccess = await authClient.check({
    user: `user:${userId}`,
    permission: 'read',
    resource: `log:${logId}`
  });
  
  if (hasAccess) {
    // Retrieve and return the log
    const log = await getLog(logId, tenantId);
    res.json(log);
  } else {
    res.status(403).json({
      status: 'error',
      message: 'Forbidden'
    });
  }
});
```

### 4. Implement Role Management UI

```typescript
// Update user role
app.patch('/api/tenants/:tenantId/users/:userId', async (req, res) => {
  const { tenantId, userId } = req.params;
  const { role } = req.body;
  
  // Check if current user is admin
  const isAdmin = await authClient.check({
    user: `user:${req.user.id}`,
    permission: 'admin',
    resource: `tenant:${tenantId}`
  });
  
  if (isAdmin) {
    // Update user role
    await authClient.updateUserRole(tenantId, {
      userId: `user:${userId}`,
      role
    });
    
    res.json({
      status: 'success',
      message: 'User role updated'
    });
  } else {
    res.status(403).json({
      status: 'error',
      message: 'Forbidden'
    });
  }
});
```

## Best Practices

1. **Keep Roles Simple**: Start with a small number of roles and add more as needed
2. **Use Role Hierarchy**: Implement role hierarchy to simplify permission management
3. **Audit Role Assignments**: Regularly review and audit role assignments
4. **Document Roles**: Clearly document what permissions each role has
5. **Implement Principle of Least Privilege**: Grant users the minimum permissions they need
6. **Separate Duty Concerns**: Avoid giving users multiple conflicting roles
7. **Implement Role-Based UI**: Adapt your UI based on user roles

## Troubleshooting

### Common Issues

#### User Can't Access Resource Despite Having the Right Role

Check if:
- The user is assigned to the correct role
- The role has the necessary permissions
- The user is a member of the correct tenant
- The resource belongs to the correct tenant

#### Permission Checks Are Slow

Consider:
- Using the built-in caching in the SDK
- Optimizing your authorization model
- Implementing batch permission checks

#### Role Changes Don't Take Effect

Ensure that:
- The cache is invalidated after role changes
- The correct tenant context is used
- The user session is updated

## Next Steps

- [Managing Tenant Permissions](./managing-tenant-permissions.md): Learn how to manage tenant permissions
- [Tenant Migration](./tenant-migration.md): Learn how to migrate between tenants
- [Authorization Model](../architecture/authorization-model.md): Understand the authorization model in depth
