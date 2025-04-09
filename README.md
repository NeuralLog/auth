# NeuralLog Auth Service

Authentication and authorization service for NeuralLog, using OpenFGA for fine-grained authorization.

## Overview

NeuralLog Auth provides centralized authentication and authorization for all NeuralLog services. It uses OpenFGA (Fine-Grained Authorization) with PostgreSQL persistence to implement a robust authorization system that supports multi-tenancy.

## Features

- **Multi-tenant Authorization**: Secure isolation between tenants with proper namespacing
- **Fine-grained Access Control**: Control access at the resource level
- **Centralized Auth Service**: Single source of truth for authorization decisions
- **Client SDKs**: Easy integration with other services
- **Scalable Architecture**: Designed for high performance and reliability

## Architecture

The auth service consists of:

1. **Auth API**: RESTful API for authorization management
2. **OpenFGA**: Fine-grained authorization engine
3. **PostgreSQL**: Persistence layer for authorization data
4. **Client SDKs**: Libraries for integrating with other services

## Getting Started

### Prerequisites

- Node.js 16+
- Docker and Docker Compose
- PostgreSQL 14+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/neurallog-auth.git
cd neurallog-auth

# Install dependencies
npm install

# Build the project
npm run build
```

### Running with Docker

```bash
# Start the services
npm run docker:compose:up

# Stop the services
npm run docker:compose:down
```

## Usage

### Basic Authorization Check

```typescript
import { AuthClient } from '@neurallog/auth-client';

// Initialize the client
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'tenant1'
});

// Check if a user has access to a resource
const hasAccess = await authClient.check({
  user: 'user:123',
  permission: 'read',
  resource: 'log:test-log'
});

if (hasAccess) {
  // Allow the operation
} else {
  // Deny the operation
}
```

### Using the Middleware

```typescript
import express from 'express';
import { authMiddleware } from '@neurallog/auth-client/middleware';
import { AuthClient } from '@neurallog/auth-client';

const app = express();
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'tenant1'
});

// Protect routes with the auth middleware
app.use('/api', authMiddleware(authClient));

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
```

## API Reference

### Auth API

- `POST /api/auth/check` - Check if a user has permission to access a resource
- `POST /api/auth/grant` - Grant a permission to a user
- `POST /api/auth/revoke` - Revoke a permission from a user
- `GET /api/auth/permissions` - List permissions for a user or resource

### Tenant Management

- `POST /api/tenants` - Create a new tenant
- `GET /api/tenants` - List all tenants
- `DELETE /api/tenants/:tenantId` - Delete a tenant

## License

MIT
