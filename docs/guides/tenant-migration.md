# Tenant Migration Guide

This guide explains how to migrate data and permissions between tenants in NeuralLog Auth.

## What is Tenant Migration?

Tenant migration is the process of moving data, users, and permissions from one tenant to another. This might be necessary in scenarios such as:

- Company rebranding or restructuring
- Merging two organizations
- Splitting a tenant into multiple tenants
- Moving from a trial tenant to a production tenant

## Migration Architecture

NeuralLog Auth's tenant migration is built on its authorization model, which makes migration straightforward:

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

## Migration Process

### Step 1: Prepare for Migration

Before starting the migration, ensure that:

1. The destination tenant exists or create it
2. You have admin access to both source and destination tenants
3. You have a backup of the source tenant data
4. You have notified users about the migration

### Step 2: Create the Destination Tenant

If the destination tenant doesn't exist, create it:

```typescript
// Using the TypeScript SDK
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'source-tenant',
  token: 'your-admin-token'
});

// Create the destination tenant
await authClient.createTenant('destination-tenant', 'user:admin');
```

Using the REST API directly:

```bash
curl -X POST http://localhost:3040/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "tenantId": "destination-tenant",
    "adminUserId": "user:admin"
  }'
```

### Step 3: Migrate Users

Migrate users from the source tenant to the destination tenant:

```typescript
// Get users from source tenant
const users = await authClient.listTenantUsers('source-tenant');

// Add users to destination tenant
for (const user of users) {
  await authClient.addUserToTenant('destination-tenant', {
    userId: user.userId,
    role: user.role
  });
}
```

### Step 4: Migrate Resources and Permissions

Migrate resources and their permissions:

```typescript
// For each resource in the source tenant
// 1. Create the resource in the destination tenant
// 2. Migrate the permissions

// Example for logs
const logs = await getLogs('source-tenant');

for (const log of logs) {
  // Create log in destination tenant
  const newLog = await createLog(log.name, 'destination-tenant', log.data);
  
  // Get permissions for this log
  const permissions = await getPermissions(`log:${log.id}`, 'source-tenant');
  
  // Migrate permissions
  for (const permission of permissions) {
    await authClient.grant({
      user: permission.user,
      permission: permission.permission,
      resource: `log:${newLog.id}`
    });
  }
}
```

### Step 5: Verify Migration

Verify that the migration was successful:

```typescript
// Check if users were migrated
const sourceUsers = await authClient.listTenantUsers('source-tenant');
const destUsers = await authClient.listTenantUsers('destination-tenant');
console.log('Source users:', sourceUsers.length);
console.log('Destination users:', destUsers.length);

// Check if resources were migrated
const sourceLogs = await getLogs('source-tenant');
const destLogs = await getLogs('destination-tenant');
console.log('Source logs:', sourceLogs.length);
console.log('Destination logs:', destLogs.length);
```

### Step 6: Update References

Update any references to the source tenant:

```typescript
// Update application configuration
updateConfig({
  tenantId: 'destination-tenant'
});

// Update user sessions
updateSessions({
  fromTenant: 'source-tenant',
  toTenant: 'destination-tenant'
});
```

### Step 7: Delete Source Tenant (Optional)

If you no longer need the source tenant, you can delete it:

```typescript
// Delete the source tenant
await authClient.deleteTenant('source-tenant');
```

## Using the Tenant Migration API

NeuralLog Auth provides a dedicated API for tenant migration:

```typescript
// Using the TypeScript SDK
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'admin-tenant',
  token: 'your-admin-token'
});

// Migrate tenant
await authClient.migrateTenant({
  sourceTenantId: 'source-tenant',
  destinationTenantId: 'destination-tenant',
  deleteSourceAfterMigration: false
});
```

Using the REST API directly:

```bash
curl -X POST http://localhost:3040/api/tenants/migrate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-admin-token" \
  -d '{
    "sourceTenantId": "source-tenant",
    "destinationTenantId": "destination-tenant",
    "deleteSourceAfterMigration": false
  }'
```

## Real-World Example: Company Rebranding

Let's walk through a real-world example of migrating a tenant during a company rebranding:

### Scenario

- Company "Acme Inc." is rebranding to "Pinnacle Corp."
- The tenant ID needs to change from "acme" to "pinnacle"
- All users, logs, and permissions need to be migrated

### Implementation

```typescript
// Step 1: Create the new tenant
await authClient.createTenant('pinnacle', 'user:admin', {
  name: 'Pinnacle Corp.',
  domain: 'pinnacle.com'
});

// Step 2: Migrate all users
const users = await authClient.listTenantUsers('acme');
for (const user of users) {
  await authClient.addUserToTenant('pinnacle', {
    userId: user.userId,
    role: user.role
  });
}

// Step 3: Migrate all logs and their permissions
const logs = await getLogs('acme');
for (const log of logs) {
  // Create log in new tenant
  const newLog = await createLog(log.name, 'pinnacle', log.data);
  
  // Migrate permissions
  const permissions = await getPermissions(`log:${log.id}`, 'acme');
  for (const permission of permissions) {
    await authClient.grant({
      user: permission.user,
      permission: permission.permission,
      resource: `log:${newLog.id}`
    });
  }
}

// Step 4: Update application configuration
updateConfig({
  tenantId: 'pinnacle',
  tenantName: 'Pinnacle Corp.',
  tenantDomain: 'pinnacle.com'
});

// Step 5: Notify users
sendNotification({
  to: users.map(user => user.userId),
  subject: 'Company Rebranding - Tenant Migration',
  message: 'We have migrated your account from Acme Inc. to Pinnacle Corp.'
});

// Step 6: Keep both tenants active for a transition period
// After transition period, delete the old tenant
setTimeout(async () => {
  await authClient.deleteTenant('acme');
}, 30 * 24 * 60 * 60 * 1000); // 30 days
```

## Best Practices

1. **Plan Ahead**: Plan the migration carefully and communicate with users
2. **Backup Data**: Always backup data before migration
3. **Test First**: Test the migration process in a non-production environment
4. **Incremental Migration**: Consider migrating in phases rather than all at once
5. **Maintain Audit Trail**: Keep a record of all migration activities
6. **Transition Period**: Keep both tenants active during a transition period
7. **Verify Migration**: Verify that all data and permissions were migrated correctly

## Troubleshooting

### Common Issues

#### Missing Permissions After Migration

Check if:
- All permission tuples were migrated
- The resource IDs in the destination tenant match the expected format
- The user IDs are consistent between tenants

#### Users Can't Access the New Tenant

Ensure that:
- Users were added to the destination tenant
- Users have the correct roles in the destination tenant
- Users are using the correct tenant ID in their requests

#### Data Inconsistency

Verify that:
- All data was migrated correctly
- No duplicate resources were created
- Resource relationships were preserved

## Next Steps

- [Managing Tenant Permissions](./managing-tenant-permissions.md): Learn how to manage tenant permissions
- [Implementing RBAC](./implementing-rbac.md): Learn how to implement role-based access control
- [Multi-tenant Design](../architecture/multi-tenant-design.md): Understand multi-tenant architecture
