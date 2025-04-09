# Quick Start Guide

This guide will help you get started with NeuralLog Auth quickly. We'll cover installation, basic configuration, and simple usage examples.

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or later)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Git](https://git-scm.com/)

## Installation

### Clone the Repository

```bash
git clone https://github.com/your-org/neurallog-auth.git
cd neurallog-auth
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file based on the example:

```bash
cp .env.example .env
```

Edit the `.env` file to configure your environment:

```
# Server configuration
NODE_ENV=development
PORT=3040

# OpenFGA configuration
OPENFGA_HOST=localhost
OPENFGA_PORT=8080

# PostgreSQL configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=neurallog_auth

# JWT configuration
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=1d

# Logging
LOG_LEVEL=info
```

## Running with Docker Compose

The easiest way to get started is using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- NeuralLog Auth service on port 3040
- OpenFGA service on port 8080
- PostgreSQL database on port 5432

## Basic Usage

### Creating a Tenant

First, let's create a tenant:

```bash
curl -X POST http://localhost:3040/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme",
    "adminUserId": "user:alice"
  }'
```

This creates a tenant named "acme" with "user:alice" as the admin.

### Granting Permissions

Now, let's grant a permission to a user:

```bash
curl -X POST http://localhost:3040/api/auth/grant \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:bob",
    "relation": "reader",
    "object": "log:system-logs"
  }'
```

This grants "bob" read access to the "system-logs" log in the "acme" tenant.

### Checking Permissions

Let's check if a user has permission:

```bash
curl -X POST http://localhost:3040/api/auth/check \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: acme" \
  -d '{
    "user": "user:bob",
    "relation": "reader",
    "object": "log:system-logs"
  }'
```

This will return:

```json
{
  "status": "success",
  "allowed": true
}
```

## Using the TypeScript SDK

### Installation

```bash
npm install @neurallog/auth-client
```

### Basic Usage

```typescript
import { AuthClient } from '@neurallog/auth-client';

// Initialize the client
const authClient = new AuthClient({
  authServiceUrl: 'http://localhost:3040',
  tenantId: 'acme'
});

// Check if a user has permission
const hasAccess = await authClient.check({
  user: 'user:bob',
  permission: 'read',
  resource: 'log:system-logs'
});

if (hasAccess) {
  console.log('Access granted');
} else {
  console.log('Access denied');
}
```

### Using the Express Middleware

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

## Using the Python SDK

### Installation

```bash
pip install neurallog-auth-client
```

### Basic Usage

```python
from neurallog_auth_client import AuthClient

# Initialize the client
auth_client = AuthClient(
    auth_service_url='http://localhost:3040',
    tenant_id='acme'
)

# Check if a user has permission
has_access = auth_client.check(
    user='user:bob',
    permission='read',
    resource='log:system-logs'
)

if has_access:
    print('Access granted')
else:
    print('Access denied')
```

## Next Steps

- [Installation Guide](./installation.md): Detailed installation instructions
- [API Reference](../api/auth-api.md): Complete API documentation
- [SDK Documentation](../sdk/typescript.md): In-depth SDK usage
- [Authorization Model](../architecture/authorization-model.md): Understanding the authorization model
