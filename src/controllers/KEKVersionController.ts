import { Request, Response } from 'express';
import { RedisKEKService } from '../services/RedisKEKService';

/**
 * Controller for managing KEK versions
 */
export class KEKVersionController {
  private kekService: RedisKEKService;

  constructor() {
    this.kekService = RedisKEKService.getInstance();
  }

  /**
   * Get all KEK versions for a tenant
   *
   * @param req Express request
   * @param res Express response
   */
  public async getKEKVersions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Get all KEK versions for the tenant
      const kekVersions = await this.kekService.getKEKVersions(tenantId);

      res.json(kekVersions);
    } catch (error) {
      console.error('Error getting KEK versions:', error);
      res.status(500).json({ error: 'Failed to get KEK versions' });
    }
  }

  /**
   * Create a new KEK version
   *
   * @param req Express request
   * @param res Express response
   */
  public async createKEKVersion(req: Request, res: Response): Promise<void> {
    try {
      const { reason } = req.body;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      // Create a new KEK version
      const kekVersion = await this.kekService.createKEKVersion(tenantId, userId, reason);

      res.status(201).json(kekVersion);
    } catch (error) {
      console.error('Error creating KEK version:', error);
      res.status(500).json({ error: 'Failed to create KEK version' });
    }
  }

  /**
   * Rotate KEK
   *
   * @param req Express request
   * @param res Express response
   */
  public async rotateKEK(req: Request, res: Response): Promise<void> {
    try {
      const { reason, removed_users } = req.body;
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      if (!reason) {
        res.status(400).json({ error: 'Reason is required' });
        return;
      }

      // Create a new KEK version (rotation is just creating a new version)
      const kekVersion = await this.kekService.createKEKVersion(tenantId, userId, reason);

      // TODO: Handle removed users (e.g., revoke their access to the KEK)
      if (removed_users && Array.isArray(removed_users) && removed_users.length > 0) {
        // For each removed user, we would delete their KEK blobs for the new version
        // This is handled at the client level when provisioning KEKs for users
        console.log(`Users to remove from KEK access: ${removed_users.join(', ')}`);
      }

      res.status(201).json(kekVersion);
    } catch (error) {
      console.error('Error rotating KEK:', error);
      res.status(500).json({ error: 'Failed to rotate KEK' });
    }
  }

  /**
   * Update KEK version status
   *
   * @param req Express request
   * @param res Express response
   */
  public async updateKEKVersionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      if (!status || !['active', 'decrypt-only', 'deprecated'].includes(status)) {
        res.status(400).json({ error: 'Valid status is required' });
        return;
      }

      // Update the KEK version status
      const kekVersion = await this.kekService.updateKEKVersionStatus(
        tenantId,
        id,
        status as 'active' | 'decrypt-only' | 'deprecated'
      );

      if (!kekVersion) {
        res.status(404).json({ error: 'KEK version not found' });
        return;
      }

      res.json(kekVersion);
    } catch (error) {
      console.error('Error updating KEK version status:', error);
      res.status(500).json({ error: 'Failed to update KEK version status' });
    }
  }

  /**
   * Get active KEK version for a tenant
   *
   * @param req Express request
   * @param res Express response
   */
  public async getActiveKEKVersion(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

      // Get active KEK version
      const kekVersion = await this.kekService.getActiveKEKVersion(tenantId);

      if (!kekVersion) {
        res.status(404).json({ error: 'No active KEK version found' });
        return;
      }

      res.json(kekVersion);
    } catch (error) {
      console.error('Error getting active KEK version:', error);
      res.status(500).json({ error: 'Failed to get active KEK version' });
    }
  }
}
