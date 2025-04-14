# TypeScript SDK Overview

This document provides an overview of the NeuralLog Auth TypeScript SDK.

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

## SDK Structure

The NeuralLog Auth TypeScript SDK consists of several components:

- **AuthClient**: The main class for interacting with the NeuralLog Auth service
- **Middleware**: Express.js middleware for authorization
- **Types**: TypeScript interfaces and types for the SDK

## Key Features

- **Permission Management**: Grant, revoke, and check permissions
- **Tenant Management**: Create, update, and delete tenants
- **User Management**: Add, remove, and update users in tenants
- **Role-Based Access Control**: Manage user roles and permissions
- **Caching**: Improve performance with built-in caching
- **Express Middleware**: Easily integrate with Express.js applications

## Available Documentation

- [Core API Reference](./typescript-core.md): Basic permission management
- [Tenant Management](./typescript-tenant.md): Managing tenants
- [User Management](./typescript-user.md): Managing users within tenants
- [Express Middleware](./typescript-middleware.md): Using the Express.js middleware
- [Advanced Usage](./typescript-advanced.md): Advanced SDK features

## Quick Examples

### Checking Permissions

```typescript
// Check if a user has permission
const hasAccess = await authClient.check({
  user: 'user:alice',
  permission: 'read',
  resource: 'log:system-logs'
});
```

### Granting Permissions

```typescript
// Grant a permission
await authClient.grant({
  user: 'user:alice',
  permission: 'read',
  resource: 'log:system-logs'
});
```

### Managing Tenants

```typescript
// Create a new tenant
await authClient.createTenant('new-tenant', 'user:admin');

// Add a user to a tenant
await authClient.addUserToTenant('new-tenant', {
  userId: 'user:bob',
  role: TenantRole.MEMBER
});
```

## Next Steps

- [Core API Reference](./typescript-core.md): Learn about the basic permission management API
- [Tenant Management](./typescript-tenant.md): Learn how to manage tenants
- [Python SDK](./python.md): Documentation for the Python SDK
- [Unity SDK](./unity.md): Documentation for the Unity SDK
