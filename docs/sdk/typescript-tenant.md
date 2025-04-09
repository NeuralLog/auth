# TypeScript SDK: Tenant Management

This document provides detailed documentation for the tenant management API of the NeuralLog Auth TypeScript SDK.

## Tenant Management

The SDK provides methods for managing tenants, including creating, updating, and deleting tenants.

## Tenant Types

```typescript
/**
 * Tenant information
 */
export interface Tenant {
  /**
   * Tenant identifier
   */
  id: string;

  /**
   * Tenant name
   */
  name?: string;

  /**
   * Custom domain for the tenant
   */
  domain?: string;

  /**
   * Additional tenant metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Tenant migration parameters
 */
export interface MigrateTenantParams {
  /**
   * Source tenant ID
   */
  sourceTenantId: string;

  /**
   * Destination tenant ID
   */
  destinationTenantId: string;

  /**
   * Whether to delete the source tenant after migration
   */
  deleteSourceAfterMigration?: boolean;
}
```

## Creating Tenants

### createTenant

Creates a new tenant.

```typescript
async createTenant(tenantId: string, adminUserId: string, metadata?: Record<string, any>): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |
| adminUserId | string | User ID to set as admin | Yes |
| metadata | Record<string, any> | Optional tenant metadata | No |

**Returns:**

A Promise that resolves to a boolean indicating whether the tenant was created.

**Example:**

```typescript
// Create a simple tenant
const created = await authClient.createTenant('acme', 'user:alice');

// Create a tenant with metadata
const createdWithMetadata = await authClient.createTenant('beta', 'user:bob', {
  name: 'Beta Corporation',
  domain: 'beta.example.com',
  plan: 'enterprise',
  maxUsers: 100
});
```

## Retrieving Tenants

### getTenant

Gets information about a specific tenant.

```typescript
async getTenant(tenantId: string): Promise<Tenant | null>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |

**Returns:**

A Promise that resolves to a Tenant object or null if the tenant doesn't exist.

**Example:**

```typescript
const tenant = await authClient.getTenant('acme');

if (tenant) {
  console.log('Tenant found:', tenant);
  console.log('Tenant ID:', tenant.id);
  console.log('Tenant name:', tenant.name);
  console.log('Tenant domain:', tenant.domain);
  console.log('Tenant metadata:', tenant.metadata);
} else {
  console.log('Tenant not found');
}
```

### listTenants

Lists all tenants.

```typescript
async listTenants(): Promise<Tenant[]>
```

**Returns:**

A Promise that resolves to an array of Tenant objects.

**Example:**

```typescript
const tenants = await authClient.listTenants();

console.log('Number of tenants:', tenants.length);

tenants.forEach(tenant => {
  console.log('Tenant ID:', tenant.id);
  console.log('Tenant name:', tenant.name);
});
```

## Updating Tenants

### updateTenant

Updates tenant information.

```typescript
async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |
| updates | Partial<Tenant> | Tenant updates | Yes |

**Returns:**

A Promise that resolves to a boolean indicating whether the tenant was updated.

**Example:**

```typescript
// Update tenant name and domain
const updated = await authClient.updateTenant('acme', {
  name: 'Acme Corporation',
  domain: 'acme.example.com'
});

// Update tenant metadata
const updatedMetadata = await authClient.updateTenant('acme', {
  metadata: {
    plan: 'enterprise',
    maxUsers: 100,
    features: ['advanced-analytics', 'custom-branding']
  }
});
```

## Deleting Tenants

### deleteTenant

Deletes a tenant.

```typescript
async deleteTenant(tenantId: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| tenantId | string | Tenant identifier | Yes |

**Returns:**

A Promise that resolves to a boolean indicating whether the tenant was deleted.

**Example:**

```typescript
const deleted = await authClient.deleteTenant('acme');

if (deleted) {
  console.log('Tenant deleted successfully');
} else {
  console.log('Failed to delete tenant');
}
```

## Tenant Migration

### migrateTenant

Migrates a tenant to a new ID.

```typescript
async migrateTenant(params: MigrateTenantParams): Promise<boolean>
```

**Parameters:**

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| params | MigrateTenantParams | Migration parameters | Yes |

**MigrateTenantParams:**

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| sourceTenantId | string | Source tenant ID | Yes |
| destinationTenantId | string | Destination tenant ID | Yes |
| deleteSourceAfterMigration | boolean | Whether to delete the source tenant after migration | No |

**Returns:**

A Promise that resolves to a boolean indicating whether the tenant was migrated.

**Example:**

```typescript
// Migrate tenant without deleting the source
const migrated = await authClient.migrateTenant({
  sourceTenantId: 'old-tenant',
  destinationTenantId: 'new-tenant',
  deleteSourceAfterMigration: false
});

// Migrate tenant and delete the source
const migratedAndDeleted = await authClient.migrateTenant({
  sourceTenantId: 'old-tenant',
  destinationTenantId: 'new-tenant',
  deleteSourceAfterMigration: true
});
```

## Complete Example

```typescript
import { AuthClient } from '@neurallog/auth-client';

async function manageTenants() {
  // Initialize client
  const authClient = new AuthClient({
    authServiceUrl: 'http://localhost:3040',
    tenantId: 'admin', // Admin tenant
    token: 'your-admin-token'
  });
  
  try {
    // Create a new tenant
    const created = await authClient.createTenant('acme', 'user:alice', {
      name: 'Acme Corporation',
      domain: 'acme.example.com',
      plan: 'enterprise'
    });
    
    console.log('Tenant created:', created);
    
    // Get tenant information
    const tenant = await authClient.getTenant('acme');
    console.log('Tenant:', tenant);
    
    // Update tenant
    const updated = await authClient.updateTenant('acme', {
      metadata: {
        plan: 'enterprise-plus',
        maxUsers: 200
      }
    });
    
    console.log('Tenant updated:', updated);
    
    // List all tenants
    const tenants = await authClient.listTenants();
    console.log('All tenants:', tenants);
    
    // Create another tenant for migration
    await authClient.createTenant('acme-new', 'user:alice');
    
    // Migrate tenant
    const migrated = await authClient.migrateTenant({
      sourceTenantId: 'acme',
      destinationTenantId: 'acme-new',
      deleteSourceAfterMigration: false
    });
    
    console.log('Tenant migrated:', migrated);
    
    // Delete the old tenant
    const deleted = await authClient.deleteTenant('acme');
    console.log('Tenant deleted:', deleted);
  } catch (error) {
    console.error('Error managing tenants:', error);
  }
}

manageTenants();
```

## Best Practices

1. **Tenant Naming**: Use consistent naming conventions for tenants
2. **Tenant Metadata**: Store useful information in tenant metadata
3. **Tenant Migration**: Test tenant migration in a non-production environment first
4. **Error Handling**: Always handle errors when managing tenants
5. **Tenant Deletion**: Be careful when deleting tenants, as this will delete all associated data

## Next Steps

- [User Management](./typescript-user.md): Learn how to manage users within tenants
- [Core API Reference](./typescript-core.md): Learn about the basic permission management API
- [Express Middleware](./typescript-middleware.md): Learn how to use the Express.js middleware
- [Advanced Usage](./typescript-advanced.md): Learn about advanced SDK features
