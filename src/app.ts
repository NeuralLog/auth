import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ApiError } from './utils/errors';

// Import routes
import authRoutes from './routes/authRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import userRoutes from './routes/userRoutes';
import roleRoutes from './routes/roleRoutes';
import tenantRoutes from './routes/tenantRoutes';
import publicKeyRoutes from './routes/publicKey.routes';
import kekVersionRoutes from './routes/kekVersionRoutes';
import kekBlobRoutes from './routes/kekBlobRoutes';
import newPublicKeyRoutes from './routes/publicKeyRoutes';
import kekRecoveryRoutes from './routes/kekRecoveryRoutes';

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/apikeys', apiKeyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api', publicKeyRoutes);
app.use('/api/kek', kekVersionRoutes);
app.use('/api/kek', kekBlobRoutes);
app.use('/api', newPublicKeyRoutes);
app.use('/api', kekRecoveryRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Not found: ${req.originalUrl}`);
  next(error);
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

export default app;
