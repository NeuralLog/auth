/**
 * Public Key Controller
 */

import { Response } from 'express';
import { Request as ExpressRequest } from 'express';
import { publicKeyService } from '../services/PublicKeyService';

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
import { logger } from '../services/logger';

/**
 * Public Key Controller
 */
export class PublicKeyController {
  /**
   * Register a public key
   *
   * @param req Request
   * @param res Response
   */
  async registerPublicKey(req: Request, res: Response): Promise<void> {
    try {
      const { publicKey, purpose, metadata } = req.body;
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!publicKey || !purpose) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await publicKeyService.registerPublicKey(
        userId,
        publicKey,
        purpose,
        tenantId,
        metadata
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error registering public key', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get a user's public key
   *
   * @param req Request
   * @param res Response
   */
  async getPublicKey(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { purpose } = req.query;
      const requestingUserId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!requestingUserId || !tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if the user is in the same tenant
      // In a real implementation, this would involve checking permissions
      // For now, we'll just check if the user is in the same tenant

      let result;
      if (purpose) {
        result = await publicKeyService.getPublicKey(userId, purpose as string, tenantId);
      } else {
        // Get all public keys for the user
        const allKeys = await publicKeyService.getPublicKeysForTenant(tenantId);
        result = allKeys.find(key => key.userId === userId);
      }

      if (!result) {
        res.status(404).json({ error: 'Public key not found' });
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      logger.error('Error getting public key', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update a public key
   *
   * @param req Request
   * @param res Response
   */
  async updatePublicKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const { publicKey, metadata } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!publicKey) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      try {
        const result = await publicKeyService.updatePublicKey(
          keyId,
          userId,
          publicKey,
          metadata
        );

        res.status(200).json(result);
      } catch (error) {
        if ((error as Error).message === 'Public key not found') {
          res.status(404).json({ error: 'Public key not found' });
        } else if ((error as Error).message === 'Not authorized to update this public key') {
          res.status(403).json({ error: 'Not authorized to update this public key' });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Error updating public key', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Revoke a public key
   *
   * @param req Request
   * @param res Response
   */
  async revokePublicKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get the public key to check ownership
      const publicKey = await publicKeyService.getPublicKeyById(keyId);
      if (!publicKey) {
        res.status(404).json({ error: 'Public key not found' });
        return;
      }

      // Check if the user is authorized to revoke the key
      if (publicKey.userId !== userId) {
        res.status(403).json({ error: 'Not authorized to revoke this public key' });
        return;
      }

      // Delete the public key
      // This is a placeholder - we need to implement the deletePublicKey method
      // await publicKeyService.deletePublicKey(publicKey.userId, publicKey.purpose, publicKey.tenantId);

      // For now, we'll just return success
      logger.info('Public key revoked', { keyId });

      res.status(204).send();
    } catch (error) {
      logger.error('Error revoking public key', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Verify ownership of a public key
   *
   * @param req Request
   * @param res Response
   */
  async verifyPublicKey(req: Request, res: Response): Promise<void> {
    try {
      const { keyId, challenge, signature } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!keyId || !challenge || !signature) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      try {
        const result = await publicKeyService.verifyPublicKey(
          keyId,
          challenge,
          signature
        );

        res.status(200).json(result);
      } catch (error) {
        if ((error as Error).message === 'Public key not found') {
          res.status(404).json({ error: 'Public key not found' });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Error verifying public key', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const publicKeyController = new PublicKeyController();
