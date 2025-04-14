# Basic Usage Example

This example demonstrates the basic usage of the NeuralLog Auth service.

## Prerequisites

- Node.js 22 or later
- PostgreSQL 14 or later
- Redis 7 or later
- OpenFGA

## Installation

### Using npm

```bash
# Clone the repository
git clone https://github.com/NeuralLog/auth.git
cd auth

# Install dependencies
npm install
```

### Using Docker

```bash
# Clone the repository
git clone https://github.com/NeuralLog/auth.git
cd auth

# Start the services using Docker Compose
docker-compose up -d
```

## Example Code

### Starting the Auth Service

```typescript
// Import the auth service
import { AuthService } from './services/authService';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Create an Express app
const app = express();
const port = process.env.PORT || 3040;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Initialize the auth service
const authService = new AuthService({
  adapterOptions: {
    adapterType: 'local',
    localOptions: {
      apiUrl: 'http://localhost:8080',
      tenantId: 'default'
    }
  },
  cacheTtl: 300,
  cacheCheckPeriod: 60
});

// Initialize the service
async function initialize() {
  try {
    // Initialize the auth service
    await authService.initialize();
    console.log('Auth service initialized successfully');
    
    // Set up routes
    app.use('/api/auth', authRouter(authService));
    app.use('/api/tenants', tenantRouter(authService));
    app.use('/api/apikeys', apiKeyRouter(authService));
    
    // Start the server
    app.listen(port, () => {
      console.log(`Auth service listening on port ${port}`);
    });
  } catch (error) {
    console.error('Error initializing auth service:', error);
    process.exit(1);
  }
}

// Run the initialization
initialize();
```

### Using the Auth Service

```typescript
// Import the auth service client
import { AuthServiceClient } from '@neurallog/auth-client';

// Create a client instance
const authClient = new AuthServiceClient({
  baseUrl: 'http://localhost:3040',
  tenantId: 'default'
});

// Example: Authenticate a user
async function authenticateUser(username, password) {
  try {
    const result = await authClient.login(username, password);
    console.log('Authentication successful:', result);
    return result.token;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// Example: Check permissions
async function checkPermission(token, user, relation, object) {
  try {
    const result = await authClient.check(token, {
      user,
      relation,
      object
    });
    console.log('Permission check result:', result);
    return result.allowed;
  } catch (error) {
    console.error('Permission check failed:', error);
    throw error;
  }
}

// Example: Create an API key
async function createApiKey(token, name, expiresIn) {
  try {
    const result = await authClient.createApiKey(token, {
      name,
      expiresIn
    });
    console.log('API key created:', result);
    return result.apiKey;
  } catch (error) {
    console.error('API key creation failed:', error);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    // Authenticate
    const token = await authenticateUser('admin@example.com', 'password123');
    
    // Check permission
    const hasPermission = await checkPermission(
      token,
      'user:123',
      'can_read',
      'document:456'
    );
    
    if (hasPermission) {
      console.log('User has permission to read the document');
    } else {
      console.log('User does not have permission to read the document');
    }
    
    // Create API key
    const apiKey = await createApiKey(token, 'My API Key', 30); // 30 days
    console.log('API Key to save:', apiKey.key);
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the example
main();
```

## Step-by-Step Explanation

### Starting the Auth Service

1. **Import Dependencies**:
   ```typescript
   import { AuthService } from './services/authService';
   import express from 'express';
   import cors from 'cors';
   import helmet from 'helmet';
   import morgan from 'morgan';
   ```
   This imports the necessary dependencies for the auth service.

2. **Create Express App**:
   ```typescript
   const app = express();
   const port = process.env.PORT || 3040;
   ```
   This creates an Express app and sets the port.

3. **Add Middleware**:
   ```typescript
   app.use(helmet());
   app.use(cors());
   app.use(express.json());
   app.use(morgan('combined'));
   ```
   This adds security and utility middleware to the Express app.

4. **Initialize Auth Service**:
   ```typescript
   const authService = new AuthService({
     adapterOptions: {
       adapterType: 'local',
       localOptions: {
         apiUrl: 'http://localhost:8080',
         tenantId: 'default'
       }
     },
     cacheTtl: 300,
     cacheCheckPeriod: 60
   });
   ```
   This creates an instance of the auth service with the specified configuration.

5. **Set Up Routes**:
   ```typescript
   app.use('/api/auth', authRouter(authService));
   app.use('/api/tenants', tenantRouter(authService));
   app.use('/api/apikeys', apiKeyRouter(authService));
   ```
   This sets up the API routes for the auth service.

6. **Start the Server**:
   ```typescript
   app.listen(port, () => {
     console.log(`Auth service listening on port ${port}`);
   });
   ```
   This starts the Express server on the specified port.

### Using the Auth Service

1. **Create Client**:
   ```typescript
   const authClient = new AuthServiceClient({
     baseUrl: 'http://localhost:3040',
     tenantId: 'default'
   });
   ```
   This creates a client for interacting with the auth service.

2. **Authenticate User**:
   ```typescript
   const result = await authClient.login(username, password);
   ```
   This authenticates a user with the auth service.

3. **Check Permission**:
   ```typescript
   const result = await authClient.check(token, {
     user,
     relation,
     object
   });
   ```
   This checks if a user has permission to access a resource.

4. **Create API Key**:
   ```typescript
   const result = await authClient.createApiKey(token, {
     name,
     expiresIn
   });
   ```
   This creates a new API key for the authenticated user.

## Expected Output

When running the auth service:

```
Auth service initialized successfully
Auth service listening on port 3040
```

When running the client example:

```
Authentication successful: { status: 'success', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', expiresIn: 3600, user: { id: 'user123', email: 'admin@example.com', name: 'Admin User', tenantId: 'default' } }
Permission check result: { status: 'success', allowed: true }
User has permission to read the document
API key created: { status: 'success', apiKey: { id: 'key123', name: 'My API Key', key: 'nl_abc123.xyz789', createdAt: '2023-06-01T12:00:00Z', expiresAt: '2023-07-01T12:00:00Z' } }
API Key to save: nl_abc123.xyz789
```

## Common Issues and Solutions

### Issue 1: OpenFGA Connection Error

**Problem**: You might see an error like `Connection refused to OpenFGA`.

**Solution**: 
- Ensure that OpenFGA is running and accessible at the configured URL
- Check the OpenFGA logs for any errors
- Verify that the OpenFGA API URL is correct in your configuration

### Issue 2: PostgreSQL Connection Error

**Problem**: You might see an error like `Connection refused to PostgreSQL`.

**Solution**:
- Ensure that PostgreSQL is running and accessible at the configured host and port
- Check that the PostgreSQL credentials are correct
- Verify that the PostgreSQL database exists

### Issue 3: Redis Connection Error

**Problem**: You might see an error like `Connection refused to Redis`.

**Solution**:
- Ensure that Redis is running and accessible at the configured host and port
- Check that the Redis password is correct (if applicable)
- Verify that the Redis database index is valid

### Issue 4: JWT Secret Not Set

**Problem**: You might see a warning about using the default JWT secret.

**Solution**:
- Set the `JWT_SECRET` environment variable to a secure, random value
- In production, never use the default JWT secret

## Next Steps

- Try the [Advanced Usage Example](./advanced-usage.md)
- Learn about [Configuration Options](../configuration.md)
- Explore the [API Reference](../api.md)
- Read about the [Architecture](../architecture.md)
