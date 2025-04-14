import express from 'express';
import { authRouter } from '../api/authRouter';

const router = express.Router();

// Mount the auth router
router.use('/', authRouter);

export default router;
