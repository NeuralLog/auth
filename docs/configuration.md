# Configuration

This document describes the configuration options for the NeuralLog Auth service.

## Configuration Options

The NeuralLog Auth service can be configured using the following options:

### Server Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3040` | The port on which the server will listen |
| `host` | `string` | `'0.0.0.0'` | The host address to bind to |
| `cors` | `object` | `{ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }` | CORS configuration |
| `logLevel` | `string` | `'info'` | Logging level (debug, info, warn, error) |

### Authentication Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `jwtSecret` | `string` | Required | Secret key for signing JWT tokens |
| `jwtExpiresIn` | `string` | `'1h'` | JWT token expiration time |
| `refreshTokenExpiresIn` | `string` | `'7d'` | Refresh token expiration time |
| `passwordHashRounds` | `number` | `10` | Number of bcrypt hash rounds for passwords |
| `allowedOrigins` | `string[]` | `[]` | List of allowed origins for CORS |

### Database Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `database.type` | `string` | `'postgres'` | Database type (postgres) |
| `database.host` | `string` | `'localhost'` | Database host |
| `database.port` | `number` | `5432` | Database port |
| `database.username` | `string` | `'postgres'` | Database username |
| `database.password` | `string` | Required | Database password |
| `database.database` | `string` | `'neurallog_auth'` | Database name |
| `database.synchronize` | `boolean` | `false` | Automatically synchronize database schema |
| `database.logging` | `boolean` | `false` | Enable database query logging |

### Redis Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `redis.host` | `string` | `'localhost'` | Redis host |
| `redis.port` | `number` | `6379` | Redis port |
| `redis.password` | `string` | `''` | Redis password |
| `redis.db` | `number` | `0` | Redis database index |
| `redis.keyPrefix` | `string` | `'auth:'` | Prefix for Redis keys |

### OpenFGA Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `openfga.apiUrl` | `string` | Required | OpenFGA API URL |
| `openfga.storeId` | `string` | Required | OpenFGA store ID |
| `openfga.modelId` | `string` | Required | OpenFGA model ID |
| `openfga.apiToken` | `string` | `''` | OpenFGA API token |

### Auth0 Configuration (Optional)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `auth0.domain` | `string` | `''` | Auth0 domain |
| `auth0.clientId` | `string` | `''` | Auth0 client ID |
| `auth0.clientSecret` | `string` | `''` | Auth0 client secret |
| `auth0.audience` | `string` | `''` | Auth0 API audience |

### Rate Limiting Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rateLimit.windowMs` | `number` | `60000` | Rate limit window in milliseconds |
| `rateLimit.max` | `number` | `100` | Maximum number of requests per window |
| `rateLimit.standardHeaders` | `boolean` | `true` | Send standard rate limit headers |
| `rateLimit.legacyHeaders` | `boolean` | `false` | Send legacy rate limit headers |

### Cache Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cache.ttl` | `number` | `300` | Cache TTL in seconds |
| `cache.checkPeriod` | `number` | `60` | Cache check period in seconds |

## Configuration Examples

### Basic Example

```typescript
import { NeuralLogAuth } from '@neurallog/auth';

const auth = new NeuralLogAuth({
  port: 3040,
  host: '0.0.0.0',
  jwtSecret: 'your-secret-key',
  jwtExpiresIn: '1h',
  refreshTokenExpiresIn: '7d',
  database: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password',
    database: 'neurallog_auth'
  },
  openfga: {
    apiUrl: 'https://api.openfga.example.com',
    storeId: 'your-store-id',
    modelId: 'your-model-id'
  }
});

auth.start()
  .then(() => console.log('Auth server started'))
  .catch(err => console.error('Failed to start auth server:', err));
```

### Advanced Example

```typescript
import { NeuralLogAuth } from '@neurallog/auth';

const auth = new NeuralLogAuth({
  port: 3040,
  host: '0.0.0.0',
  
  // JWT configuration
  jwtSecret: 'your-secret-key',
  jwtExpiresIn: '1h',
  refreshTokenExpiresIn: '7d',
  
  // Database configuration
  database: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password',
    database: 'neurallog_auth',
    synchronize: false,
    logging: false
  },
  
  // Redis configuration
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'password',
    db: 0,
    keyPrefix: 'auth:'
  },
  
  // OpenFGA configuration
  openfga: {
    apiUrl: 'http://localhost:8080',
    storeId: 'your-store-id',
    modelId: 'your-model-id',
    apiToken: 'your-api-token'
  },
  
  // Auth0 configuration
  auth0: {
    domain: 'your-domain.auth0.com',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    audience: 'https://api.neurallog.app'
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: 60000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  },
  
  // Cache configuration
  cache: {
    ttl: 300,
    checkPeriod: 60
  },
  
  // CORS configuration
  cors: {
    origin: ['https://app.example.com', 'https://admin.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  },
  
  // Logging configuration
  logLevel: 'debug'
});

auth.start()
  .then(() => console.log('Auth server started'))
  .catch(err => console.error('Failed to start auth server:', err));
```

## Environment Variables

NeuralLog Auth also supports configuration via environment variables:

| Environment Variable | Corresponding Option | Type | Default |
|----------------------|----------------------|------|---------|
| `PORT` | `port` | `number` | `3040` |
| `HOST` | `host` | `string` | `'0.0.0.0'` |
| `JWT_SECRET` | `jwtSecret` | `string` | Required |
| `JWT_EXPIRES_IN` | `jwtExpiresIn` | `string` | `'1h'` |
| `REFRESH_TOKEN_EXPIRES_IN` | `refreshTokenExpiresIn` | `string` | `'7d'` |
| `PASSWORD_HASH_ROUNDS` | `passwordHashRounds` | `number` | `10` |
| `ALLOWED_ORIGINS` | `allowedOrigins` | `string` | `''` (comma-separated) |
| `DB_TYPE` | `database.type` | `string` | `'postgres'` |
| `DB_HOST` | `database.host` | `string` | `'localhost'` |
| `DB_PORT` | `database.port` | `number` | `5432` |
| `DB_USERNAME` | `database.username` | `string` | `'postgres'` |
| `DB_PASSWORD` | `database.password` | `string` | Required |
| `DB_DATABASE` | `database.database` | `string` | `'neurallog_auth'` |
| `DB_SYNCHRONIZE` | `database.synchronize` | `boolean` | `'false'` |
| `DB_LOGGING` | `database.logging` | `boolean` | `'false'` |
| `REDIS_HOST` | `redis.host` | `string` | `'localhost'` |
| `REDIS_PORT` | `redis.port` | `number` | `6379` |
| `REDIS_PASSWORD` | `redis.password` | `string` | `''` |
| `REDIS_DB` | `redis.db` | `number` | `0` |
| `REDIS_KEY_PREFIX` | `redis.keyPrefix` | `string` | `'auth:'` |
| `OPENFGA_API_URL` | `openfga.apiUrl` | `string` | Required |
| `OPENFGA_STORE_ID` | `openfga.storeId` | `string` | Required |
| `OPENFGA_MODEL_ID` | `openfga.modelId` | `string` | Required |
| `OPENFGA_API_TOKEN` | `openfga.apiToken` | `string` | `''` |
| `AUTH0_DOMAIN` | `auth0.domain` | `string` | `''` |
| `AUTH0_CLIENT_ID` | `auth0.clientId` | `string` | `''` |
| `AUTH0_CLIENT_SECRET` | `auth0.clientSecret` | `string` | `''` |
| `AUTH0_AUDIENCE` | `auth0.audience` | `string` | `''` |
| `RATE_LIMIT_WINDOW_MS` | `rateLimit.windowMs` | `number` | `60000` |
| `RATE_LIMIT_MAX` | `rateLimit.max` | `number` | `100` |
| `CACHE_TTL` | `cache.ttl` | `number` | `300` |
| `CACHE_CHECK_PERIOD` | `cache.checkPeriod` | `number` | `60` |
| `LOG_LEVEL` | `logLevel` | `string` | `'info'` |

## Configuration File

You can also configure NeuralLog Auth using a configuration file:

```json
{
  "server": {
    "port": 3040,
    "host": "0.0.0.0",
    "cors": {
      "origin": "*",
      "methods": ["GET", "POST", "PUT", "DELETE"]
    }
  },
  "auth": {
    "jwtSecret": "your-secret-key",
    "jwtExpiresIn": "1h",
    "refreshTokenExpiresIn": "7d",
    "passwordHashRounds": 10,
    "allowedOrigins": ["https://example.com", "https://app.example.com"]
  },
  "database": {
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "postgres",
    "password": "password",
    "database": "neurallog_auth",
    "synchronize": false,
    "logging": false
  },
  "openfga": {
    "apiUrl": "https://api.openfga.example.com",
    "storeId": "your-store-id",
    "modelId": "your-model-id",
    "apiToken": "your-api-token"
  },
  "redis": {
    "host": "localhost",
    "port": 6379,
    "password": "password",
    "db": 0,
    "keyPrefix": "auth:"
  },
  "auth0": {
    "domain": "your-domain.auth0.com",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "audience": "https://api.neurallog.app"
  },
  "rateLimit": {
    "windowMs": 60000,
    "max": 100,
    "standardHeaders": true,
    "legacyHeaders": false
  },
  "cache": {
    "ttl": 300,
    "checkPeriod": 60
  },
  "logLevel": "info"
}
```

Load the configuration file:

```typescript
import { NeuralLogAuth } from '@neurallog/auth';
import * as fs from 'fs';

// Load configuration from file
const configPath = process.env.CONFIG_PATH || './config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Create auth server
const auth = new NeuralLogAuth(config);

// Start server
auth.start()
  .then(() => console.log('Auth server started'))
  .catch(err => console.error('Failed to start auth server:', err));
```

## Docker Environment Variables

When running NeuralLog Auth in Docker, you can use the following environment variables:

```bash
# Server configuration
PORT=3040
HOST=0.0.0.0
LOG_LEVEL=info

# JWT configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# Database configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=neurallog_auth

# Redis configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=password

# OpenFGA configuration
OPENFGA_API_URL=http://openfga:8080
OPENFGA_STORE_ID=your-store-id
OPENFGA_MODEL_ID=your-model-id

# Auth0 configuration
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.neurallog.app
```

## Best Practices

- **Security**: Never hardcode sensitive information like JWT secrets, API keys, or passwords. Use environment variables or a secure configuration management system.
- **Validation**: Always validate configuration values before using them.
- **Defaults**: Provide sensible defaults for all configuration options.
- **Documentation**: Keep this configuration documentation up-to-date with the actual code.
- **Environment-Specific Configuration**: Use different configuration files for different environments (development, staging, production).
- **Secrets Management**: Use a secrets management solution like HashiCorp Vault or AWS Secrets Manager for sensitive information.
- **Configuration Validation**: Validate the configuration at startup to catch errors early.
- **Logging**: Configure appropriate log levels for different environments.
- **Rate Limiting**: Configure rate limiting to prevent abuse.
- **CORS**: Configure CORS to restrict access to trusted domains.
- **Database Connection Pooling**: Configure database connection pooling for better performance.
- **Redis Connection Pooling**: Configure Redis connection pooling for better performance.
- **Monitoring**: Configure monitoring and alerting for the auth service.
