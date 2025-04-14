import { Express } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        name?: string;
        [key: string]: any;
      };
    }
  }
}
