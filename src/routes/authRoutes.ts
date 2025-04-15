import express from 'express';
import { authRouter } from '../api/AuthRouter';
import { apiKeyAuthRouter } from '../api/ApiKeyAuthRouter';
import { authService } from '../services/AuthService';
import { apiKeyService } from '../services/ApiKeyService';

const router = express.Router();

// Mount the auth router
router.use('/', authRouter(authService));

// Mount the API key auth router
router.use('/', apiKeyAuthRouter(apiKeyService));

export default router;
