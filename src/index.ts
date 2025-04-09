import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './api/authRouter';
import { tenantRouter } from './api/tenantRouter';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './services/logger';
import { AuthService } from './services/authService';

// Load environment variables
dotenv.config();

// Initialize the auth service
const authService = new AuthService();

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

// Health check endpoint
app.get('/', (req, res) => {
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
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
