/**
 * Key Encryption Key (KEK) routes for the NeuralLog auth service
 */

import express from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { KekService } from '../services/KekService.new';
import { logger } from '../utils/logger';

const router = express.Router();
const kekService = new KekService();

/**
 * Get encrypted KEK for the authenticated user
 * 
 * GET /kek
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get encrypted KEK
    const encryptedKEK = await kekService.getEncryptedKEK(userId);
    
    if (!encryptedKEK) {
      return res.status(404).json({ error: 'Encrypted KEK not found' });
    }
    
    res.json(encryptedKEK);
  } catch (error) {
    logger.error('Error getting encrypted KEK:', error);
    res.status(500).json({ error: 'Failed to get encrypted KEK' });
  }
});

/**
 * Create encrypted KEK for the authenticated user
 * 
 * POST /kek
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { encrypted, algorithm, iv, data } = req.body;
    
    // Validate input
    if (!encrypted || !algorithm || !iv || !data) {
      return res.status(400).json({
        error: 'Missing required fields: encrypted, algorithm, iv, data'
      });
    }
    
    // Check if encrypted KEK already exists
    const existingKEK = await kekService.getEncryptedKEK(userId);
    
    if (existingKEK) {
      return res.status(409).json({
        error: 'Encrypted KEK already exists'
      });
    }
    
    // Create encrypted KEK
    await kekService.createEncryptedKEK(userId, { encrypted, algorithm, iv, data });
    
    res.status(201).end();
  } catch (error) {
    logger.error('Error creating encrypted KEK:', error);
    res.status(500).json({ error: 'Failed to create encrypted KEK' });
  }
});

/**
 * Update encrypted KEK for the authenticated user
 * 
 * PUT /kek
 */
router.put('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { encrypted, algorithm, iv, data } = req.body;
    
    // Validate input
    if (!encrypted || !algorithm || !iv || !data) {
      return res.status(400).json({
        error: 'Missing required fields: encrypted, algorithm, iv, data'
      });
    }
    
    // Update encrypted KEK
    await kekService.updateEncryptedKEK(userId, { encrypted, algorithm, iv, data });
    
    res.status(204).end();
  } catch (error) {
    logger.error('Error updating encrypted KEK:', error);
    res.status(500).json({ error: 'Failed to update encrypted KEK' });
  }
});

/**
 * Get all KEK versions for a tenant
 * 
 * GET /kek/versions
 */
router.get('/versions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const tenantId = req.query.tenant_id as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Missing required query parameter: tenant_id' });
    }
    
    const versions = await kekService.getAllKekVersionsForTenant(tenantId);
    
    res.json(versions);
  } catch (error) {
    logger.error('Error getting KEK versions:', error);
    res.status(500).json({ error: 'Failed to get KEK versions' });
  }
});

/**
 * Create a new KEK version for a tenant
 * 
 * POST /kek/versions
 */
router.post('/versions', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { tenant_id } = req.body;
    
    if (!tenant_id) {
      return res.status(400).json({ error: 'Missing required field: tenant_id' });
    }
    
    const newVersion = await kekService.createKekVersion(tenant_id);
    
    res.status(201).json(newVersion);
  } catch (error) {
    logger.error('Error creating KEK version:', error);
    res.status(500).json({ error: 'Failed to create KEK version' });
  }
});

/**
 * Rotate KEK for a tenant
 * 
 * POST /kek/rotate
 */
router.post('/rotate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { tenant_id } = req.body;
    
    if (!tenant_id) {
      return res.status(400).json({ error: 'Missing required field: tenant_id' });
    }
    
    const newVersion = await kekService.rotateKek(tenant_id);
    
    res.status(201).json(newVersion);
  } catch (error) {
    logger.error('Error rotating KEK:', error);
    res.status(500).json({ error: 'Failed to rotate KEK' });
  }
});

/**
 * Create a quorum task
 * 
 * POST /kek/quorum
 */
router.post('/quorum', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { tenant_id, task_type, required_shares, metadata } = req.body;
    
    if (!tenant_id || !task_type || !required_shares) {
      return res.status(400).json({
        error: 'Missing required fields: tenant_id, task_type, required_shares'
      });
    }
    
    const task = await kekService.createQuorumTask(
      tenant_id,
      task_type,
      req.user.id,
      required_shares,
      metadata || {}
    );
    
    res.status(201).json(task);
  } catch (error) {
    logger.error('Error creating quorum task:', error);
    res.status(500).json({ error: 'Failed to create quorum task' });
  }
});

/**
 * Get a quorum task
 * 
 * GET /kek/quorum/:taskId
 */
router.get('/quorum/:taskId', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const task = await kekService.getQuorumTask(taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Quorum task not found' });
    }
    
    res.json(task);
  } catch (error) {
    logger.error('Error getting quorum task:', error);
    res.status(500).json({ error: 'Failed to get quorum task' });
  }
});

/**
 * Add a share contribution to a quorum task
 * 
 * POST /kek/quorum/:taskId/shares
 */
router.post('/quorum/:taskId/shares', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { taskId } = req.params;
    const { share_data } = req.body;
    
    if (!share_data) {
      return res.status(400).json({ error: 'Missing required field: share_data' });
    }
    
    const updatedTask = await kekService.addShareContribution(
      taskId,
      req.user.id,
      share_data
    );
    
    res.json(updatedTask);
  } catch (error) {
    logger.error('Error adding share contribution:', error);
    res.status(500).json({ error: 'Failed to add share contribution' });
  }
});

/**
 * Get all share contributions for a quorum task
 * 
 * GET /kek/quorum/:taskId/shares
 */
router.get('/quorum/:taskId/shares', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const shares = await kekService.getShareContributions(taskId);
    
    res.json(shares);
  } catch (error) {
    logger.error('Error getting share contributions:', error);
    res.status(500).json({ error: 'Failed to get share contributions' });
  }
});

/**
 * Get a KEK blob for a principal and version
 * 
 * GET /kek/blobs
 */
router.get('/blobs', authenticate, authorize('admin'), async (req, res) => {
  try {
    const principalId = req.query.principal_id as string;
    const kekVersionId = req.query.kek_version_id as string;
    
    if (!principalId || !kekVersionId) {
      return res.status(400).json({
        error: 'Missing required query parameters: principal_id, kek_version_id'
      });
    }
    
    const blob = await kekService.getKekBlobByPrincipalAndVersion(principalId, kekVersionId);
    
    if (!blob) {
      return res.status(404).json({ error: 'KEK blob not found' });
    }
    
    res.json(blob);
  } catch (error) {
    logger.error('Error getting KEK blob:', error);
    res.status(500).json({ error: 'Failed to get KEK blob' });
  }
});

/**
 * Create or update a KEK blob
 * 
 * POST /kek/blobs
 */
router.post('/blobs', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { principal_id, kek_version_id, encrypted_blob } = req.body;
    
    if (!principal_id || !kek_version_id || !encrypted_blob) {
      return res.status(400).json({
        error: 'Missing required fields: principal_id, kek_version_id, encrypted_blob'
      });
    }
    
    const blob = await kekService.provisionOrUpdateKekBlob(
      principal_id,
      kek_version_id,
      encrypted_blob
    );
    
    res.status(201).json(blob);
  } catch (error) {
    logger.error('Error creating/updating KEK blob:', error);
    res.status(500).json({ error: 'Failed to create/update KEK blob' });
  }
});

/**
 * Delete a KEK blob
 * 
 * DELETE /kek/blobs/:blobId
 */
router.delete('/blobs/:blobId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { blobId } = req.params;
    
    await kekService.deleteKekBlob(blobId);
    
    res.status(204).end();
  } catch (error) {
    logger.error('Error deleting KEK blob:', error);
    res.status(500).json({ error: 'Failed to delete KEK blob' });
  }
});

/**
 * Delete all KEK blobs for a principal
 * 
 * DELETE /kek/blobs
 */
router.delete('/blobs', authenticate, authorize('admin'), async (req, res) => {
  try {
    const principalId = req.query.principal_id as string;
    
    if (!principalId) {
      return res.status(400).json({ error: 'Missing required query parameter: principal_id' });
    }
    
    await kekService.deleteAllKekBlobsForPrincipal(principalId);
    
    res.status(204).end();
  } catch (error) {
    logger.error('Error deleting KEK blobs:', error);
    res.status(500).json({ error: 'Failed to delete KEK blobs' });
  }
});

export default router;
