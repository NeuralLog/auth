import { Request, Response } from 'express';
import { RedisKEKService } from '../services/RedisKEKService';

/**
 * Controller for managing KEK blobs
 */
export class KEKBlobController {
  private kekService: RedisKEKService;

  constructor() {
    this.kekService = RedisKEKService.getInstance();
  }

  /**
   * Get KEK blob for a user and version
   *
   * @param req Express request
   * @param res Express response
   */
  public async getKEKBlob(req: Request, res: Response): Promise<void> {
    try {
      const { userId, versionId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Get the KEK blob
      const kekBlob = await this.kekService.getKEKBlob(tenantId, userId, versionId);

      if (!kekBlob) {
        res.status(404).json({ error: 'KEK blob not found' });
        return;
      }

      res.json({
        userId: kekBlob.userId,
        kekVersionId: kekBlob.kekVersionId,
        encryptedBlob: kekBlob.encryptedBlob
      });
    } catch (error) {
      console.error('Error getting KEK blob:', error);
      res.status(500).json({ error: 'Failed to get KEK blob' });
    }
  }

  /**
   * Get all KEK blobs for a user
   *
   * @param req Express request
   * @param res Express response
   */
  public async getUserKEKBlobs(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Get all KEK blobs for the user
      const kekBlobs = await this.kekService.getUserKEKBlobs(tenantId, userId);

      res.json(kekBlobs.map(blob => ({
        userId: blob.userId,
        kekVersionId: blob.kekVersionId,
        encryptedBlob: blob.encryptedBlob
      })));
    } catch (error) {
      console.error('Error getting user KEK blobs:', error);
      res.status(500).json({ error: 'Failed to get user KEK blobs' });
    }
  }

  /**
   * Provision a KEK blob for a user
   *
   * @param req Express request
   * @param res Express response
   */
  public async provisionKEKBlob(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, kek_version_id, encrypted_blob } = req.body;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      if (!user_id || !kek_version_id || !encrypted_blob) {
        res.status(400).json({ error: 'User ID, KEK version ID, and encrypted blob are required' });
        return;
      }

      // Check if the KEK version exists
      const kekVersion = await this.kekService.getKEKVersion(tenantId, kek_version_id);

      if (!kekVersion) {
        res.status(404).json({ error: 'KEK version not found' });
        return;
      }

      // Create or update the KEK blob
      const kekBlob = await this.kekService.setKEKBlob(
        tenantId,
        user_id,
        kek_version_id,
        encrypted_blob
      );

      res.status(201).json({
        userId: kekBlob.userId,
        kekVersionId: kekBlob.kekVersionId,
        encryptedBlob: kekBlob.encryptedBlob
      });
    } catch (error) {
      console.error('Error provisioning KEK blob:', error);
      res.status(500).json({ error: 'Failed to provision KEK blob' });
    }
  }

  /**
   * Delete a KEK blob
   *
   * @param req Express request
   * @param res Express response
   */
  public async deleteKEKBlob(req: Request, res: Response): Promise<void> {
    try {
      const { userId, versionId } = req.params;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Delete the KEK blob
      const deleted = await this.kekService.deleteKEKBlob(tenantId, userId, versionId);

      if (!deleted) {
        res.status(404).json({ error: 'KEK blob not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting KEK blob:', error);
      res.status(500).json({ error: 'Failed to delete KEK blob' });
    }
  }

  /**
   * Get KEK blobs for current user
   *
   * @param req Express request
   * @param res Express response
   */
  public async getCurrentUserKEKBlobs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        res.status(400).json({ error: 'Tenant ID and User ID are required' });
        return;
      }

      // Get all KEK blobs for the current user
      const kekBlobs = await this.kekService.getUserKEKBlobs(tenantId, userId);

      res.json(kekBlobs.map(blob => ({
        userId: blob.userId,
        kekVersionId: blob.kekVersionId,
        encryptedBlob: blob.encryptedBlob
      })));
    } catch (error) {
      console.error('Error getting current user KEK blobs:', error);
      res.status(500).json({ error: 'Failed to get current user KEK blobs' });
    }
  }
}
