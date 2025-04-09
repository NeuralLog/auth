# Managing Tenant Permissions

This guide explains how to manage permissions within a tenant in NeuralLog Auth.

## Tenant Permission Model

In NeuralLog Auth, permissions are managed at the tenant level. Each tenant has its own set of users, resources, and permissions.

### Permission Hierarchy

Permissions follow a hierarchical structure:

```
┌─────────────────────────────────────────────────────────────────┐
│                          Tenant                                 │
│                                                                 │
│  ┌─────────────┐                                                │
│  │ Tenant      │                                                │
│  │ Permissions │                                                │
│  └─────────────┘                                                │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Resources                          │    │
│  │                                                         │    │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────┐ │    │
│  │  │ Logs    │    │ Entries │    │ Users   │    │ ...   │ │    │
│  │  └─────────┘    └─────────┘    └─────────┘    └───────┘ │    │
│  │       │              │              │             │     │    │
│  │       ▼              ▼              ▼             ▼     │    │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────┐ │    │
│  │  │ Resource│    │ Resource│    │ Resource│    │Resource│ │    │
│  │  │ Perms   │    │ Perms   │    │ Perms   │    │ Perms  │ │    │
│  │  └─────────┘    └─────────┘    └─────────┘    └───────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## User Management

### Adding Users to a Tenant

To add a user to a tenant:

```typescript
// Using the TypeScript SDK
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme',
  token: 'your-admin-token'
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
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "userId": "user:alice",
    "role": "admin"
  }'
```

### Updating User Roles

To update a user's role:

```typescript
// Update user role
await authClient.updateUserRole('acme', {
  userId: 'user:bob',
  role: TenantRole.ADMIN
});
```

Using the REST API directly:

```bash
curl -X PATCH http://localhost:3040/api/tenants/acme/users/user:bob \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "role": "admin"
  }'
```

### Removing Users from a Tenant

To remove a user from a tenant:

```typescript
// Remove user from tenant
await authClient.removeUserFromTenant('acme', 'user:bob');
```

Using the REST API directly:

```bash
curl -X DELETE http://localhost:3040/api/tenants/acme/users/user:bob \
  -H "Authorization: Bearer your-admin-token"
```

### Listing Users in a Tenant

To list all users in a tenant:

```typescript
// List tenant users
const users = await authClient.listTenantUsers('acme');
console.log('Users:', users);
```

Using the REST API directly:

```bash
curl -X GET http://localhost:3040/api/tenants/acme/users \
  -H "Authorization: Bearer your-admin-token"
```

## Resource Permissions

### Granting Permissions

To grant a permission to a user:

```typescript
// Grant read permission
await authClient.grant({
  user: 'user:bob',
  permission: 'read',
  resource: 'log:system-logs'
});

// Grant write permission
await authClient.grant({
  user: 'user:bob',
  permission: 'write',
  resource: 'log:system-logs'
});
```

Using the REST API directly:

```bash
curl -X POST http://localhost:3040/api/auth/grant \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "user": "user:bob",
    "relation": "reader",
    "object": "log:system-logs"
  }'
```

### Revoking Permissions

To revoke a permission from a user:

```typescript
// Revoke read permission
await authClient.revoke({
  user: 'user:bob',
  permission: 'read',
  resource: 'log:system-logs'
});
```

Using the REST API directly:

```bash
curl -X POST http://localhost:3040/api/auth/revoke \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "user": "user:bob",
    "relation": "reader",
    "object": "log:system-logs"
  }'
```

### Checking Permissions

To check if a user has a permission:

```typescript
// Check read permission
const canRead = await authClient.check({
  user: 'user:bob',
  permission: 'read',
  resource: 'log:system-logs'
});

// Check write permission
const canWrite = await authClient.check({
  user: 'user:bob',
  permission: 'write',
  resource: 'log:system-logs'
});
```

Using the REST API directly:

```bash
curl -X POST http://localhost:3040/api/auth/check \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "user": "user:bob",
    "relation": "reader",
    "object": "log:system-logs"
  }'
```

## Permission Patterns

### Direct Permissions

Grant permissions directly to a user:

```typescript
// Grant direct permission
await authClient.grant({
  user: 'user:bob',
  permission: 'read',
  resource: 'log:system-logs'
});
```

### Group-Based Permissions

Grant permissions to a group, and add users to the group:

```typescript
// Create a group
await authClient.grant({
  user: 'group:engineers',
  permission: 'exists',
  resource: 'tenant:acme'
});

// Add user to group
await authClient.grant({
  user: 'user:bob',
  permission: 'member',
  resource: 'group:engineers'
});

// Grant permission to group
await authClient.grant({
  user: 'group:engineers',
  permission: 'read',
  resource: 'log:system-logs'
});

// Check permission (with contextual tuples)
const canRead = await authClient.check({
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

### Role-Based Permissions

Grant permissions based on roles:

```typescript
// Check if user is admin
const isAdmin = await authClient.check({
  user: 'user:alice',
  permission: 'admin',
  resource: 'tenant:acme'
});

if (isAdmin) {
  // Allow administrative actions
}
```

### Attribute-Based Permissions

Grant permissions based on attributes:

```typescript
// Check permission with attributes
const canAccess = await authClient.check({
  user: 'user:bob',
  permission: 'read',
  resource: 'log:system-logs',
  contextualTuples: [
    {
      user: 'user:bob',
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

## Real-World Example: Project-Based Access Control

Let's implement project-based access control for a multi-tenant logging application:

### 1. Create Projects

```typescript
// Create projects
const projects = [
  { id: 'project1', name: 'Frontend Development' },
  { id: 'project2', name: 'Backend Development' },
  { id: 'project3', name: 'DevOps' }
];

for (const project of projects) {
  // Create project in the system
  await createProject(project.id, project.name, 'acme');
  
  // Create project in the authorization system
  await authClient.grant({
    user: `project:${project.id}`,
    permission: 'exists',
    resource: 'tenant:acme'
  });
}
```

### 2. Assign Users to Projects

```typescript
// Assign users to projects
const assignments = [
  { userId: 'user:alice', projectId: 'project1', role: 'owner' },
  { userId: 'user:bob', projectId: 'project1', role: 'member' },
  { userId: 'user:charlie', projectId: 'project2', role: 'owner' },
  { userId: 'user:dave', projectId: 'project3', role: 'owner' }
];

for (const assignment of assignments) {
  await authClient.grant({
    user: assignment.userId,
    permission: assignment.role,
    resource: `project:${assignment.projectId}`
  });
}
```

### 3. Assign Resources to Projects

```typescript
// Assign logs to projects
const logAssignments = [
  { logId: 'frontend-logs', projectId: 'project1' },
  { logId: 'backend-logs', projectId: 'project2' },
  { logId: 'infra-logs', projectId: 'project3' }
];

for (const assignment of logAssignments) {
  await authClient.grant({
    user: `log:${assignment.logId}`,
    permission: 'parent',
    resource: `project:${assignment.projectId}`
  });
}
```

### 4. Implement Access Control

```typescript
// Check if user can access a log
app.get('/api/logs/:logId', async (req, res) => {
  const logId = req.params.logId;
  const userId = req.user.id;
  
  // Get projects the user is a member of
  const userProjects = await getUserProjects(userId);
  
  // Check if the log belongs to any of these projects
  const logProject = await getLogProject(logId);
  
  if (userProjects.includes(logProject)) {
    // User has access through project membership
    const log = await getLog(logId);
    res.json(log);
  } else {
    // Check direct permission
    const hasAccess = await authClient.check({
      user: `user:${userId}`,
      permission: 'read',
      resource: `log:${logId}`
    });
    
    if (hasAccess) {
      const log = await getLog(logId);
      res.json(log);
    } else {
      res.status(403).json({
        status: 'error',
        message: 'Forbidden'
      });
    }
  }
});
```

## Best Practices

1. **Principle of Least Privilege**: Grant users the minimum permissions they need
2. **Use Roles and Groups**: Organize permissions using roles and groups
3. **Regular Audits**: Regularly audit permissions to ensure they're appropriate
4. **Document Permissions**: Maintain documentation of your permission structure
5. **Consistent Naming**: Use consistent naming conventions for resources and permissions
6. **Automate Permission Management**: Automate common permission management tasks
7. **Implement Permission UI**: Provide a user interface for managing permissions

## Troubleshooting

### Common Issues

#### Permission Checks Return Unexpected Results

Check if:
- The user is a member of the tenant
- The resource exists and is correctly identified
- The permission mapping is correct
- The tenant context is correct

#### Performance Issues with Permission Checks

Consider:
- Using the built-in caching in the SDK
- Optimizing your authorization model
- Implementing batch permission checks

#### Permission Changes Don't Take Effect

Ensure that:
- The cache is invalidated after permission changes
- The correct tenant context is used
- The user session is updated

## Next Steps

- [Implementing RBAC](./implementing-rbac.md): Learn how to implement role-based access control
- [Tenant Migration](./tenant-migration.md): Learn how to migrate between tenants
- [Authorization Model](../architecture/authorization-model.md): Understand the authorization model in depth
