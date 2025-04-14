# NeuralLog Auth Service

Authentication, authorization, and key management service for NeuralLog, using OpenFGA for fine-grained authorization and Redis for key storage.

## Overview

NeuralLog Auth provides centralized authentication, authorization, and key management for all NeuralLog services. It uses OpenFGA (Fine-Grained Authorization) with PostgreSQL persistence to implement a robust authorization system that supports multi-tenancy. It also manages Key Encryption Keys (KEKs) for the zero-knowledge architecture, storing encrypted KEK blobs in Redis.

## Features

- **Multi-tenant Authorization**: Secure isolation between tenants with proper namespacing
- **Fine-grained Access Control**: Control access at the resource level
- **Centralized Auth Service**: Single source of truth for authorization decisions
- **Client SDKs**: Easy integration with other services
- **Scalable Architecture**: Designed for high performance and reliability
- **Zero-Knowledge Key Management**: Manages encrypted KEK blobs without access to the keys themselves
- **Key Rotation**: Supports key rotation for enhanced security
- **User-specific Key Provisioning**: Provisions keys to specific users with appropriate access controls

## Architecture

The auth service consists of:

1. **Auth API**: RESTful API for authentication, authorization, and key management
2. **OpenFGA**: Fine-grained authorization engine
3. **PostgreSQL**: Persistence layer for authorization data
4. **Redis**: Storage for KEK versions and encrypted KEK blobs
5. **Client SDKs**: Libraries for integrating with other services

### Key Hierarchy

The key hierarchy in NeuralLog consists of three levels:

1. **Master Secret**: The root of the key hierarchy, derived from the tenant ID and recovery phrase. This is never stored anywhere and is only used to derive the Master KEK.

2. **Master KEK**: Derived from the Master Secret, this key is used to encrypt and decrypt Operational KEKs. It is never stored anywhere and is only held in memory during client operations.

3. **Operational KEKs**: Derived from the Master KEK, these keys are used for actual data encryption and decryption. They are versioned to support key rotation and are stored encrypted in the server for distribution to authorized users.

### KEK Versioning

KEK versions are used to support key rotation and access control. Each KEK version has a unique ID and a status:

- **Active**: The current version used for encryption and decryption.
- **Decrypt-Only**: A previous version that can be used for decryption but not for encryption.
- **Deprecated**: A version that is no longer used and should be phased out.

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 6+

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

### KEK Management

- `GET /kek/versions` - Get all KEK versions for the tenant
- `GET /kek/versions/active` - Get the active KEK version for the tenant
- `POST /kek/versions` - Create a new KEK version
- `PUT /kek/versions/:id/status` - Update the status of a KEK version
- `POST /kek/rotate` - Rotate the KEK, creating a new version and optionally removing users

### KEK Blobs

- `GET /kek/blobs/users/:userId/versions/:versionId` - Get a KEK blob for a user and version
- `GET /kek/blobs/users/:userId` - Get all KEK blobs for a user
- `GET /kek/blobs/me` - Get all KEK blobs for the current user
- `POST /kek/blobs` - Provision a KEK blob for a user
- `DELETE /kek/blobs/users/:userId/versions/:versionId` - Delete a KEK blob

## Documentation

Detailed documentation is available in the [docs](./docs) directory:

- [API Reference](./docs/api.md)
- [Configuration](./docs/configuration.md)
- [Architecture](./docs/architecture.md)
- [Examples](./docs/examples)

For integration guides and tutorials, visit the [NeuralLog Documentation Site](https://neurallog.github.io/docs/).

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

MIT

## Related NeuralLog Components

- [NeuralLog Server](https://github.com/NeuralLog/server) - Core server functionality
- [NeuralLog Web](https://github.com/NeuralLog/web) - Web interface components
- [NeuralLog TypeScript Client SDK](https://github.com/NeuralLog/typescript-client-sdk) - TypeScript client SDK
