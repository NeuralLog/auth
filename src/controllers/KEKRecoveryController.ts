/**
 * KEK Recovery Controller
 */

import { Response } from 'express';
import { Request as ExpressRequest } from 'express';

// Extend the Express Request type to include user property
interface Request extends ExpressRequest {
  user?: {
    id: string;
    username: string;
    email: string;
    tenantId: string;
    roles: string[];
  };
}
import { kekRecoveryService } from '../services/KEKRecoveryService';
import { logger } from '../services/logger';

/**
 * KEK Recovery Controller
 */
export class KEKRecoveryController {
  /**
   * Initiate KEK version recovery
   *
   * @param req Request
   * @param res Response
   */
  async initiateKEKRecovery(req: Request, res: Response): Promise<void> {
    try {
      const { versionId, threshold, reason, expiresIn } = req.body;
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!versionId || !threshold || !reason) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      try {
        const result = await kekRecoveryService.initiateKEKRecovery(
          userId,
          versionId,
          threshold,
          reason,
          tenantId,
          expiresIn
        );

        res.status(201).json(result);
      } catch (error) {
        if ((error as Error).message === 'KEK version not found') {
          res.status(404).json({ error: 'KEK version not found' });
        } else if ((error as Error).message === 'Not authorized to recover this KEK version') {
          res.status(403).json({ error: 'Not authorized to recover this KEK version' });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Error initiating KEK recovery', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get KEK recovery session
   *
   * @param req Request
   * @param res Response
   */
  async getKEKRecoverySession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const session = await kekRecoveryService.getKEKRecoverySession(sessionId);
      if (!session) {
        res.status(404).json({ error: 'Recovery session not found' });
        return;
      }

      // Check if the user is in the same tenant
      if (session.tenantId !== tenantId) {
        res.status(403).json({ error: 'Not authorized to access this recovery session' });
        return;
      }

      res.status(200).json(session);
    } catch (error) {
      logger.error('Error getting KEK recovery session', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Submit a recovery share
   *
   * @param req Request
   * @param res Response
   */
  async submitRecoveryShare(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { share, encryptedFor } = req.body;
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!share || !encryptedFor) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      try {
        const result = await kekRecoveryService.submitRecoveryShare(
          userId,
          sessionId,
          share,
          encryptedFor
        );

        // Check if the user is in the same tenant
        if (result.tenantId !== tenantId) {
          res.status(403).json({ error: 'Not authorized to access this recovery session' });
          return;
        }

        res.status(200).json(result);
      } catch (error) {
        if ((error as Error).message === 'Recovery session not found') {
          res.status(404).json({ error: 'Recovery session not found' });
        } else if ((error as Error).message.startsWith('Recovery session is ')) {
          res.status(400).json({ error: (error as Error).message });
        } else if ((error as Error).message === 'User has already submitted a share') {
          res.status(400).json({ error: 'User has already submitted a share' });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Error submitting recovery share', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Complete KEK recovery
   *
   * @param req Request
   * @param res Response
   */
  async completeKEKRecovery(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { recoveredKEK, newKEKVersion } = req.body;
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!recoveredKEK || !newKEKVersion || !newKEKVersion.id || !newKEKVersion.reason) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      try {
        const session = await kekRecoveryService.getKEKRecoverySession(sessionId);
        if (!session) {
          res.status(404).json({ error: 'Recovery session not found' });
          return;
        }

        // Check if the user is in the same tenant
        if (session.tenantId !== tenantId) {
          res.status(403).json({ error: 'Not authorized to access this recovery session' });
          return;
        }

        const result = await kekRecoveryService.completeKEKRecovery(
          userId,
          sessionId,
          recoveredKEK,
          newKEKVersion
        );

        res.status(200).json(result);
      } catch (error) {
        if ((error as Error).message === 'Recovery session not found') {
          res.status(404).json({ error: 'Recovery session not found' });
        } else if ((error as Error).message.startsWith('Recovery session is ')) {
          res.status(400).json({ error: (error as Error).message });
        } else if ((error as Error).message.startsWith('Not enough shares submitted')) {
          res.status(400).json({ error: (error as Error).message });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Error completing KEK recovery', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const kekRecoveryController = new KEKRecoveryController();
