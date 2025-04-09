# Multi-tenant Design

This document explains the multi-tenant architecture of NeuralLog Auth.

## What is Multi-tenancy?

Multi-tenancy is an architecture where a single instance of software serves multiple customers (tenants). Each tenant's data is isolated from other tenants, even though they share the same infrastructure.

## Multi-tenant Architecture in NeuralLog Auth

NeuralLog Auth implements a robust multi-tenant architecture that provides:

1. **Tenant Isolation**: Each tenant's data is isolated from other tenants
2. **Shared Infrastructure**: Single OpenFGA instance with proper namespacing
3. **Efficient Resource Usage**: Optimized resource utilization across tenants
4. **Tenant Migration**: Simplified tenant migration through the authorization model

### Visual Representation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          NeuralLog Auth Service                         │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │ Tenant A    │    │ Tenant B    │    │ Tenant C    │    │ Tenant D  │ │
│  │ Data        │    │ Data        │    │ Data        │    │ Data      │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └───────────┘ │
│          │                 │                  │                 │       │
│          ▼                 ▼                  ▼                 ▼       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      OpenFGA Authorization                      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                     │
│                                   ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      PostgreSQL Database                        │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tenant Isolation

Tenant isolation is achieved through the authorization model:

```
┌─────────────────────┐      ┌─────────────────────┐
│     Tenant A        │      │     Tenant B        │
│                     │      │                     │
│  ┌───────────────┐  │      │  ┌───────────────┐  │
│  │ Users         │  │      │  │ Users         │  │
│  └───────────────┘  │      │  └───────────────┘  │
│                     │      │                     │
│  ┌───────────────┐  │      │  ┌───────────────┐  │
│  │ Resources     │  │      │  │ Resources     │  │
│  └───────────────┘  │      │  └───────────────┘  │
│                     │      │                     │
│  ┌───────────────┐  │      │  ┌───────────────┐  │
│  │ Permissions   │  │      │  │ Permissions   │  │
│  └───────────────┘  │      │  └───────────────┘  │
└─────────────────────┘      └─────────────────────┘
```

### Tenant Context

All authorization operations include tenant context:

1. **API Requests**: Include a tenant ID header (`X-Tenant-ID`)
2. **Authorization Checks**: Verify tenant membership
3. **Resources**: Are linked to their parent tenant

```
┌─────────────────────────────────────────────────────────────────┐
│                          API Request                            │
│                                                                 │
│  Headers:                                                       │
│  - X-Tenant-ID: acme                                           │
│  - Authorization: Bearer token                                  │
│                                                                 │
│  Body:                                                          │
│  {                                                              │
│    "user": "user:alice",                                        │
│    "relation": "reader",                                        │
│    "object": "log:system-logs"                                  │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Authorization Check                         │
│                                                                 │
│  1. Verify user is a member of tenant "acme"                    │
│  2. Check if "log:system-logs" belongs to tenant "acme"         │
│  3. Check if user has "reader" permission on "log:system-logs"  │
└─────────────────────────────────────────────────────────────────┘
```

### Tenant Membership

Users must be members of a tenant to access resources in that tenant:

```
┌─────────────────────────────────────────────────────────────────┐
│                          Tenant                                 │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ Admin Users │    │ Member Users│    │ Guest Users │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│         │                 │                  │                   │
│         ▼                 ▼                  ▼                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │ Full Access │    │ Limited     │    │ Restricted  │          │
│  │             │    │ Access      │    │ Access      │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Resource Hierarchy

Resources are organized in a hierarchy:

```
┌─────────────────────────────────────────────────────────────────┐
│                          Tenant                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                         Logs                            │    │
│  │                                                         │    │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────┐ │    │
│  │  │ Log 1   │    │ Log 2   │    │ Log 3   │    │ Log 4 │ │    │
│  │  └─────────┘    └─────────┘    └─────────┘    └───────┘ │    │
│  │       │              │              │             │     │    │
│  │       ▼              ▼              ▼             ▼     │    │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌───────┐ │    │
│  │  │ Entries │    │ Entries │    │ Entries │    │Entries│ │    │
│  │  └─────────┘    └─────────┘    └─────────┘    └───────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

This hierarchy is represented in the authorization model:

```
tenant:acme
  │
  ├── log:system-logs
  │     │
  │     ├── log_entry:123
  │     ├── log_entry:456
  │     └── log_entry:789
  │
  └── log:app-logs
        │
        ├── log_entry:abc
        ├── log_entry:def
        └── log_entry:ghi
```

## Tenant Data Model

The tenant data model in OpenFGA:

```
// Tenant exists
(tenant:acme, exists, system:tenants)

// User is a member of tenant
(user:alice, member, tenant:acme)

// User is an admin of tenant
(user:alice, admin, tenant:acme)

// Log belongs to tenant
(log:system-logs, parent, tenant:acme)

// Log entry belongs to log
(log_entry:123, parent, log:system-logs)

// User has permission on log
(user:bob, reader, log:system-logs)

// User has permission on log entry
(user:bob, reader, log_entry:123)
```

## Tenant Management

### Creating Tenants

```typescript
// Create a tenant
await authClient.createTenant('acme', 'user:alice', {
  name: 'Acme Corporation',
  domain: 'acme.example.com'
});
```

This creates the following tuples:

```
(tenant:acme, exists, system:tenants)
(user:alice, admin, tenant:acme)
(user:alice, member, tenant:acme)
```

### Adding Users to Tenants

```typescript
// Add a user to a tenant
await authClient.addUserToTenant('acme', {
  userId: 'user:bob',
  role: TenantRole.MEMBER
});
```

This creates the following tuple:

```
(user:bob, member, tenant:acme)
```

### Creating Resources in Tenants

```typescript
// Create a log in a tenant
const log = await createLog('system-logs', 'acme');

// Link log to tenant
await authClient.grant({
  user: `log:${log.id}`,
  permission: 'parent',
  resource: 'tenant:acme'
});
```

This creates the following tuple:

```
(log:system-logs, parent, tenant:acme)
```

## Cross-tenant Access

In some cases, you might want to allow cross-tenant access:

```typescript
// Grant cross-tenant access
await authClient.grant({
  user: 'user:alice@tenant1',
  permission: 'reader',
  resource: 'log:system-logs@tenant2'
});
```

This creates a tuple that allows a user from one tenant to access a resource in another tenant.

## Tenant Migration

Tenant migration is the process of moving data from one tenant to another:

```
┌─────────────────────┐      ┌─────────────────────┐
│   Source Tenant     │      │ Destination Tenant  │
│                     │      │                     │
│  ┌───────────────┐  │      │  ┌───────────────┐  │
│  │ Users         │──┼──────┼─▶│ Users         │  │
│  └───────────────┘  │      │  └───────────────┘  │
│                     │      │                     │
│  ┌───────────────┐  │      │  ┌───────────────┐  │
│  │ Resources     │──┼──────┼─▶│ Resources     │  │
│  └───────────────┘  │      │  └───────────────┘  │
│                     │      │                     │
│  ┌───────────────┐  │      │  ┌───────────────┐  │
│  │ Permissions   │──┼──────┼─▶│ Permissions   │  │
│  └───────────────┘  │      │  └───────────────┘  │
└─────────────────────┘      └─────────────────────┘
```

The migration process:

1. Create the destination tenant
2. Copy users from source to destination
3. Copy resources from source to destination
4. Copy permissions from source to destination
5. Optionally delete the source tenant

```typescript
// Migrate tenant
await authClient.migrateTenant({
  sourceTenantId: 'old-tenant',
  destinationTenantId: 'new-tenant',
  deleteSourceAfterMigration: true
});
```

## Multi-tenant Deployment

NeuralLog Auth supports multiple deployment models for multi-tenancy:

### Shared Instance

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Single NeuralLog Auth Instance                 │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │ Tenant A    │    │ Tenant B    │    │ Tenant C    │    │ Tenant D  │ │
│  │ Data        │    │ Data        │    │ Data        │    │ Data      │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └───────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Dedicated Instances

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ NeuralLog Auth  │    │ NeuralLog Auth  │    │ NeuralLog Auth  │
│ Instance A      │    │ Instance B      │    │ Instance C      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Tenant A    │ │    │ │ Tenant B    │ │    │ │ Tenant C    │ │
│ │ Data        │ │    │ │ Data        │ │    │ │ Data        │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Hybrid Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Shared NeuralLog Auth Instance                 │
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐ │
│  │ Tenant A    │    │ Tenant B    │    │ Tenant C    │    │ Tenant D  │ │
│  │ Data        │    │ Data        │    │ Data        │    │ Data      │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └───────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                                                │
                                                                ▼
                                                  ┌─────────────────────┐
                                                  │ Dedicated Instance  │
                                                  │                     │
                                                  │ ┌─────────────┐     │
                                                  │ │ Tenant E    │     │
                                                  │ │ Data        │     │
                                                  │ └─────────────┘     │
                                                  └─────────────────────┘
```

## Best Practices

1. **Tenant Naming**: Use consistent naming conventions for tenants
2. **Tenant Isolation**: Ensure proper tenant isolation in your authorization model
3. **Resource Ownership**: Clearly define resource ownership within tenants
4. **Cross-tenant Access**: Be careful with cross-tenant access to maintain security
5. **Tenant Migration**: Test tenant migration in a non-production environment first
6. **Performance**: Monitor performance across tenants and optimize as needed
7. **Backup and Recovery**: Implement tenant-aware backup and recovery procedures

## Next Steps

- [Authorization Model](./authorization-model.md): Detailed explanation of the authorization model
- [Security Considerations](./security.md): Detailed security information
- [Implementing RBAC](../guides/implementing-rbac.md): Learn how to implement role-based access control
- [Managing Tenant Permissions](../guides/managing-tenant-permissions.md): Learn how to manage tenant permissions
