import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter, tenantRouter, apiKeyRouter } from './api';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './services/logger';
import { AuthService, AuthServiceOptions } from './services/AuthService';
import { apiKeyService } from './services/ApiKeyService';
import { connectToDatabase, closeDatabaseConnection } from './db';

// Export adapters
export * from './adapters';

// Export services
export { AuthService, AuthServiceOptions };

// Export API
export * from './api';

// Load environment variables
dotenv.config();

// Initialize the auth service with adapter options
const authService = new AuthService({
  adapterOptions: {
    adapterType: process.env.OPENFGA_ADAPTER_TYPE as 'local' | 'kubernetes' || undefined,
    localOptions: {
      apiUrl: process.env.OPENFGA_API_URL,
      tenantId: process.env.DEFAULT_TENANT_ID || 'default'
    },
    kubernetesOptions: {
      globalApiUrl: process.env.OPENFGA_GLOBAL_API_URL,
      tenantId: process.env.DEFAULT_TENANT_ID || 'default',
      useTenantSpecificInstances: process.env.USE_TENANT_SPECIFIC_INSTANCES === 'true',
      tenantNamespaceFormat: process.env.TENANT_NAMESPACE_FORMAT || 'tenant-{tenantId}',
      openfgaServiceName: process.env.OPENFGA_SERVICE_NAME || 'openfga',
      openfgaServicePort: process.env.OPENFGA_SERVICE_PORT ? parseInt(process.env.OPENFGA_SERVICE_PORT) : 8080
    }
  },
  cacheTtl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 300,
  cacheCheckPeriod: process.env.CACHE_CHECK_PERIOD ? parseInt(process.env.CACHE_CHECK_PERIOD) : 60
});

// Initialize Express app
const app = express();
const port = process.env.PORT || 3040;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Routes
app.use('/api/auth', authRouter(authService));
app.use('/api/tenants', tenantRouter(authService));
app.use('/api/apikeys', apiKeyRouter(apiKeyService));

// Health check endpoint
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'NeuralLog Auth Service is running',
    version: '0.1.0'
  });
});

// Error handling
app.use(errorHandler);

// Start the server
const server = app.listen(port, async () => {
  try {
    // Connect to the database
    await connectToDatabase();

    // Initialize the auth service
    await authService.initialize();

    logger.info(`NeuralLog Auth Service listening on port ${port}`);
  } catch (error) {
    logger.error('Failed to initialize auth service', error);
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    await authService.close();
    await closeDatabaseConnection();
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
