import { Request, Response } from 'express';
import { PublicKeyModel } from '../models/publicKey.model';

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
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      
      if (!publicKey) {
        res.status(400).json({ error: 'Public key is required' });
        return;
      }
      
      // Upsert the public key
      await PublicKeyModel.updateOne(
        { userId, purpose, tenantId },
        { userId, publicKey, purpose, tenantId },
        { upsert: true }
      );
      
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
      const tenantId = req.user.tenantId;
      
      // Find the public key
      const publicKey = await PublicKeyModel.findOne({ 
        userId, 
        purpose: purpose as string,
        tenantId
      });
      
      if (!publicKey) {
        res.status(404).json({ error: 'Public key not found' });
        return;
      }
      
      res.status(200).json({ publicKey: publicKey.publicKey });
    } catch (error) {
      console.error('Error getting public key:', error);
      res.status(500).json({ error: 'Failed to get public key' });
    }
  }
}
