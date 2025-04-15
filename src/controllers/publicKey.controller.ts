import { Request, Response } from 'express';
import { PublicKey } from '@neurallog/client-sdk/dist/types/api';
import { publicKeyService } from '../services/PublicKeyService';

/**
 * Controller for managing public keys
 */
export class PublicKeyController {
  /**
   * Upload a public key
   *
   * @param req Request
   * @param res Response
   */
  public async uploadPublicKey(req: Request, res: Response): Promise<void> {
    try {
      const { publicKey, purpose = 'admin-promotion' } = req.body;
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      if (!publicKey) {
        res.status(400).json({ error: 'Public key is required' });
        return;
      }

      // Store the public key
      await publicKeyService.storePublicKey(userId, publicKey, purpose, tenantId);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error uploading public key:', error);
      res.status(500).json({ error: 'Failed to upload public key' });
    }
  }

  /**
   * Get a user's public key
   *
   * @param req Request
   * @param res Response
   */
  public async getUserPublicKey(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { purpose = 'admin-promotion' } = req.query;
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const tenantId = req.user.tenantId;

      // Find the public key
      const publicKey = await publicKeyService.getPublicKey(
        userId,
        purpose as string,
        tenantId
      );

      if (!publicKey) {
        res.status(404).json({ error: 'Public key not found' });
        return;
      }

      res.status(200).json({ publicKey: publicKey?.publicKey });
    } catch (error) {
      console.error('Error getting public key:', error);
      res.status(500).json({ error: 'Failed to get public key' });
    }
  }
}
