import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { logger } from './logger';

// --- Interfaces ---

export interface KekVersion {
  id: string;
  tenant_id: string;
  version_number: number;
  created_at: string;
  active: boolean;
}

export interface KekBlob {
  id: string;
  principal_id: string;
  kek_version_id: string;
  encrypted_blob: string; // Base64 encoded encrypted KEK
  created_at: string;
}

export interface EncryptedKEK {
  encrypted: boolean;
  algorithm: string;
  iv: string;
  data: string;
}

export interface QuorumTask {
  id: string;
  tenant_id: string;
  task_type: 'kek_rotation' | 'user_provisioning' | 'admin_promotion';
  status: 'pending' | 'completed' | 'failed';
  created_by: string;
  created_at: string;
  completed_at?: string;
  required_shares: number;
  collected_shares: number;
  metadata: Record<string, any>;
}

export interface ShareContribution {
  id: string;
  task_id: string;
  principal_id: string;
  share_data: string; // Encrypted partial result
  created_at: string;
}

// --- Service Logic ---

const KEK_VERSION_PREFIX = 'kek_version:';
const TENANT_KEK_VERSIONS_PREFIX = 'tenant:';
const KEK_BLOB_PREFIX = 'kek_blob:';
const PRINCIPAL_KEK_BLOBS_PREFIX = 'principal:';
const KEK_VERSION_PRINCIPALS_PREFIX = 'kek_version:'; // Used as kek_version:{vId}:principals
const QUORUM_TASK_PREFIX = 'quorum_task:';
const SHARE_CONTRIBUTION_PREFIX = 'share_contribution:';
const USER_KEK_PREFIX = 'user:';

export class KekService {
  /**
   * Creates a new KEK version for a tenant.
   * @param tenantId - The ID of the tenant.
   * @returns The newly created KekVersion object.
   */
  async createKekVersion(tenantId: string): Promise<KekVersion> {
    const client = db.getClient();
    const versionId = uuidv4();
    const now = new Date().toISOString();

    // Get the current highest version number
    const tenantVersionsKey = `${TENANT_KEK_VERSIONS_PREFIX}${tenantId}:kek_versions`;
    let versionNumber = 1;
    
    try {
      const latestVersions = await client.zrevrange(tenantVersionsKey, 0, 0, 'WITHSCORES');
      if (latestVersions.length > 0) {
        versionNumber = parseInt(latestVersions[1], 10) + 1;
      }
    } catch (error) {
      logger.warn(`No existing KEK versions found for tenant ${tenantId}, starting at version 1`);
    }

    const kekVersion: KekVersion = {
      id: versionId,
      tenant_id: tenantId,
      version_number: versionNumber,
      created_at: now,
      active: true
    };

    const versionKey = `${KEK_VERSION_PREFIX}${versionId}`;

    try {
      const multi = client.multi();
      multi.hset(versionKey, kekVersion as any);
      multi.zadd(tenantVersionsKey, versionNumber, versionId);
      
      // Set as current version
      const tenantKey = `${TENANT_KEK_VERSIONS_PREFIX}${tenantId}`;
      multi.hset(tenantKey, 'current_kek_version_id', versionId);
      
      await multi.exec();

      logger.info(`Created KEK version ${versionNumber} (ID: ${versionId}) for tenant ${tenantId}`);
      return kekVersion;
    } catch (error) {
      logger.error(`Error creating KEK version for tenant ${tenantId}:`, error);
      throw new Error('Failed to create KEK version');
    }
  }

  /**
   * Gets a KEK version by its ID.
   * @param versionId - The ID of the KEK version.
   * @returns The KekVersion object or null if not found.
   */
  async getKekVersionById(versionId: string): Promise<KekVersion | null> {
    const client = db.getClient();
    const versionKey = `${KEK_VERSION_PREFIX}${versionId}`;
    try {
      const data = await client.hgetall(versionKey);
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      // Ensure correct types
      return {
        ...data,
        version_number: parseInt(data.version_number, 10),
        active: data.active === 'true'
      } as KekVersion;
    } catch (error) {
      logger.error(`Error getting KEK version ${versionId}:`, error);
      throw new Error('Failed to get KEK version');
    }
  }

  /**
   * Gets the latest active KEK version for a tenant.
   * @param tenantId - The ID of the tenant.
   * @returns The latest KEK version or null if none exist.
   */
  async getLatestActiveKekVersion(tenantId: string): Promise<KekVersion | null> {
    const client = db.getClient();
    const tenantKey = `${TENANT_KEK_VERSIONS_PREFIX}${tenantId}`;
    
    try {
      const currentVersionId = await client.hget(tenantKey, 'current_kek_version_id');
      if (!currentVersionId) {
        return null;
      }
      
      return this.getKekVersionById(currentVersionId);
    } catch (error) {
      logger.error(`Error getting latest active KEK version for tenant ${tenantId}:`, error);
      throw new Error('Failed to get latest active KEK version');
    }
  }

  /**
   * Gets all KEK versions for a tenant.
   * @param tenantId - The ID of the tenant.
   * @returns Array of KekVersion objects.
   */
  async getAllKekVersionsForTenant(tenantId: string): Promise<KekVersion[]> {
    const client = db.getClient();
    const tenantVersionsKey = `${TENANT_KEK_VERSIONS_PREFIX}${tenantId}:kek_versions`;
    
    try {
      const versionIds = await client.zrange(tenantVersionsKey, 0, -1);
      const versions: KekVersion[] = [];
      
      for (const versionId of versionIds) {
        const version = await this.getKekVersionById(versionId);
        if (version) {
          versions.push(version);
        }
      }
      
      return versions;
    } catch (error) {
      logger.error(`Error getting all KEK versions for tenant ${tenantId}:`, error);
      throw new Error('Failed to get KEK versions');
    }
  }

  /**
   * Rotates the KEK for a tenant, creating a new version and marking it as active.
   * @param tenantId - The ID of the tenant.
   * @returns The new KekVersion object.
   */
  async rotateKek(tenantId: string): Promise<KekVersion> {
    // Create a new KEK version
    const newVersion = await this.createKekVersion(tenantId);
    
    // Mark the new version as active
    await this.setCurrentKekVersion(tenantId, newVersion.id);
    
    return newVersion;
  }

  /**
   * Sets the current active KEK version for a tenant.
   * @param tenantId - The ID of the tenant.
   * @param versionId - The ID of the KEK version to set as active.
   */
  async setCurrentKekVersion(tenantId: string, versionId: string): Promise<void> {
    const client = db.getClient();
    const tenantKey = `${TENANT_KEK_VERSIONS_PREFIX}${tenantId}`;
    
    try {
      await client.hset(tenantKey, 'current_kek_version_id', versionId);
      logger.info(`Set current KEK version for tenant ${tenantId} to ${versionId}`);
    } catch (error) {
      logger.error(`Error setting current KEK version for tenant ${tenantId}:`, error);
      throw new Error('Failed to set current KEK version');
    }
  }

  /**
   * Gets the encrypted KEK for a user.
   * @param userId - The ID of the user.
   * @returns The encrypted KEK or null if not found.
   */
  async getEncryptedKEK(userId: string): Promise<EncryptedKEK | null> {
    const client = db.getClient();
    const userKekKey = `${USER_KEK_PREFIX}${userId}:kek`;
    
    try {
      const data = await client.hgetall(userKekKey);
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      
      return {
        encrypted: data.encrypted === 'true',
        algorithm: data.algorithm,
        iv: data.iv,
        data: data.data
      };
    } catch (error) {
      logger.error(`Error getting encrypted KEK for user ${userId}:`, error);
      throw new Error('Failed to get encrypted KEK');
    }
  }

  /**
   * Creates an encrypted KEK for a user.
   * @param userId - The ID of the user.
   * @param encryptedKEK - The encrypted KEK data.
   */
  async createEncryptedKEK(userId: string, encryptedKEK: EncryptedKEK): Promise<void> {
    const client = db.getClient();
    const userKekKey = `${USER_KEK_PREFIX}${userId}:kek`;
    
    try {
      // Check if KEK already exists
      const exists = await client.exists(userKekKey);
      if (exists) {
        throw new Error('Encrypted KEK already exists for this user');
      }
      
      await client.hset(userKekKey, {
        encrypted: encryptedKEK.encrypted,
        algorithm: encryptedKEK.algorithm,
        iv: encryptedKEK.iv,
        data: encryptedKEK.data
      });
      
      logger.info(`Created encrypted KEK for user ${userId}`);
    } catch (error) {
      logger.error(`Error creating encrypted KEK for user ${userId}:`, error);
      throw new Error('Failed to create encrypted KEK');
    }
  }

  /**
   * Updates the encrypted KEK for a user.
   * @param userId - The ID of the user.
   * @param encryptedKEK - The new encrypted KEK data.
   */
  async updateEncryptedKEK(userId: string, encryptedKEK: EncryptedKEK): Promise<void> {
    const client = db.getClient();
    const userKekKey = `${USER_KEK_PREFIX}${userId}:kek`;
    
    try {
      // Check if KEK exists
      const exists = await client.exists(userKekKey);
      if (!exists) {
        throw new Error('No encrypted KEK exists for this user');
      }
      
      await client.hset(userKekKey, {
        encrypted: encryptedKEK.encrypted,
        algorithm: encryptedKEK.algorithm,
        iv: encryptedKEK.iv,
        data: encryptedKEK.data
      });
      
      logger.info(`Updated encrypted KEK for user ${userId}`);
    } catch (error) {
      logger.error(`Error updating encrypted KEK for user ${userId}:`, error);
      throw new Error('Failed to update encrypted KEK');
    }
  }

  // --- Quorum Management ---

  /**
   * Creates a new quorum task.
   * @param tenantId - The ID of the tenant.
   * @param taskType - The type of task.
   * @param createdBy - The ID of the user who created the task.
   * @param requiredShares - The number of shares required to complete the task.
   * @param metadata - Additional metadata for the task.
   * @returns The created QuorumTask.
   */
  async createQuorumTask(
    tenantId: string,
    taskType: QuorumTask['task_type'],
    createdBy: string,
    requiredShares: number,
    metadata: Record<string, any>
  ): Promise<QuorumTask> {
    const client = db.getClient();
    const taskId = uuidv4();
    const now = new Date().toISOString();
    
    const task: QuorumTask = {
      id: taskId,
      tenant_id: tenantId,
      task_type: taskType,
      status: 'pending',
      created_by: createdBy,
      created_at: now,
      required_shares: requiredShares,
      collected_shares: 0,
      metadata
    };
    
    const taskKey = `${QUORUM_TASK_PREFIX}${taskId}`;
    
    try {
      await client.hset(taskKey, task as any);
      logger.info(`Created quorum task ${taskId} of type ${taskType} for tenant ${tenantId}`);
      return task;
    } catch (error) {
      logger.error(`Error creating quorum task for tenant ${tenantId}:`, error);
      throw new Error('Failed to create quorum task');
    }
  }

  /**
   * Gets a quorum task by its ID.
   * @param taskId - The ID of the task.
   * @returns The QuorumTask or null if not found.
   */
  async getQuorumTask(taskId: string): Promise<QuorumTask | null> {
    const client = db.getClient();
    const taskKey = `${QUORUM_TASK_PREFIX}${taskId}`;
    
    try {
      const data = await client.hgetall(taskKey);
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      
      return {
        ...data,
        required_shares: parseInt(data.required_shares, 10),
        collected_shares: parseInt(data.collected_shares, 10),
        metadata: JSON.parse(data.metadata || '{}')
      } as QuorumTask;
    } catch (error) {
      logger.error(`Error getting quorum task ${taskId}:`, error);
      throw new Error('Failed to get quorum task');
    }
  }

  /**
   * Adds a share contribution to a quorum task.
   * @param taskId - The ID of the task.
   * @param principalId - The ID of the contributing principal.
   * @param shareData - The encrypted share data.
   * @returns The updated QuorumTask.
   */
  async addShareContribution(
    taskId: string,
    principalId: string,
    shareData: string
  ): Promise<QuorumTask> {
    const client = db.getClient();
    const shareId = uuidv4();
    const now = new Date().toISOString();
    
    // Get the task
    const task = await this.getQuorumTask(taskId);
    if (!task) {
      throw new Error(`Quorum task ${taskId} not found`);
    }
    
    if (task.status !== 'pending') {
      throw new Error(`Quorum task ${taskId} is not pending`);
    }
    
    const shareKey = `${SHARE_CONTRIBUTION_PREFIX}${shareId}`;
    const taskKey = `${QUORUM_TASK_PREFIX}${taskId}`;
    
    const share: ShareContribution = {
      id: shareId,
      task_id: taskId,
      principal_id: principalId,
      share_data: shareData,
      created_at: now
    };
    
    try {
      const multi = client.multi();
      
      // Save the share
      multi.hset(shareKey, share as any);
      
      // Update the task's collected shares count
      const newCollectedShares = task.collected_shares + 1;
      multi.hset(taskKey, 'collected_shares', newCollectedShares);
      
      // If we've collected enough shares, mark the task as completed
      if (newCollectedShares >= task.required_shares) {
        multi.hset(taskKey, 'status', 'completed');
        multi.hset(taskKey, 'completed_at', now);
      }
      
      await multi.exec();
      
      // Return the updated task
      return {
        ...task,
        collected_shares: newCollectedShares,
        status: newCollectedShares >= task.required_shares ? 'completed' : 'pending',
        completed_at: newCollectedShares >= task.required_shares ? now : undefined
      };
    } catch (error) {
      logger.error(`Error adding share contribution to task ${taskId}:`, error);
      throw new Error('Failed to add share contribution');
    }
  }

  /**
   * Gets all share contributions for a quorum task.
   * @param taskId - The ID of the task.
   * @returns Array of ShareContribution objects.
   */
  async getShareContributions(taskId: string): Promise<ShareContribution[]> {
    const client = db.getClient();
    const pattern = `${SHARE_CONTRIBUTION_PREFIX}*`;
    
    try {
      const keys = await client.keys(pattern);
      const shares: ShareContribution[] = [];
      
      for (const key of keys) {
        const data = await client.hgetall(key);
        if (data && data.task_id === taskId) {
          shares.push(data as ShareContribution);
        }
      }
      
      return shares;
    } catch (error) {
      logger.error(`Error getting share contributions for task ${taskId}:`, error);
      throw new Error('Failed to get share contributions');
    }
  }

  /**
   * Creates or updates an encrypted KEK blob for a specific principal and KEK version.
   * This is used during provisioning or password changes.
   * @param principalId - The ID of the principal (user/service).
   * @param kekVersionId - The ID of the KEK version this blob corresponds to.
   * @param encryptedBlob - The base64 encoded encrypted KEK.
   * @returns The created/updated KekBlob object.
   */
  async provisionOrUpdateKekBlob(
    principalId: string,
    kekVersionId: string,
    encryptedBlob: string
  ): Promise<KekBlob> {
    const client = db.getClient();
    const now = new Date().toISOString();

    // Check if a blob already exists for this principal and version
    const existingBlobId = await this.findKekBlobId(principalId, kekVersionId);
    const blobId = existingBlobId || uuidv4();

    const kekBlob: KekBlob = {
      id: blobId,
      principal_id: principalId,
      kek_version_id: kekVersionId,
      encrypted_blob: encryptedBlob,
      created_at: now, // Consider updating only if new? Or add updated_at? For now, overwrite.
    };

    const blobKey = `${KEK_BLOB_PREFIX}${blobId}`;
    const principalBlobsKey = `${PRINCIPAL_KEK_BLOBS_PREFIX}${principalId}:kek_blobs`;
    const versionPrincipalsKey = `${KEK_VERSION_PRINCIPALS_PREFIX}${kekVersionId}:principals`;

    try {
      const multi = client.multi();
      multi.hset(blobKey, kekBlob as any);
      multi.sadd(principalBlobsKey, blobId);
      multi.sadd(versionPrincipalsKey, principalId);
      await multi.exec();

      if (!existingBlobId) {
        logger.info(`Provisioned KEK blob ${blobId} for principal ${principalId}, version ${kekVersionId}`);
      } else {
        logger.info(`Updated KEK blob ${blobId} for principal ${principalId}, version ${kekVersionId}`);
      }
      return kekBlob;
    } catch (error) {
      logger.error(`Error provisioning/updating KEK blob for principal ${principalId}, version ${kekVersionId}:`, error);
      throw new Error('Failed to provision/update KEK blob');
    }
  }

  /**
   * Finds the ID of an existing KEK blob for a given principal and KEK version.
   * @param principalId - The ID of the principal.
   * @param kekVersionId - The ID of the KEK version.
   * @returns The blob ID or null if not found.
   */
  async findKekBlobId(principalId: string, kekVersionId: string): Promise<string | null> {
    const client = db.getClient();
    const principalBlobsKey = `${PRINCIPAL_KEK_BLOBS_PREFIX}${principalId}:kek_blobs`;

    try {
      const blobIds = await client.smembers(principalBlobsKey);
      for (const blobId of blobIds) {
        const blobKey = `${KEK_BLOB_PREFIX}${blobId}`;
        const storedVersionId = await client.hget(blobKey, 'kek_version_id');
        if (storedVersionId === kekVersionId) {
          return blobId;
        }
      }
      return null;
    } catch (error) {
      logger.error(`Error finding KEK blob ID for principal ${principalId}, version ${kekVersionId}:`, error);
      // Don't throw, just return null as if not found
      return null;
    }
  }

  /**
   * Gets a specific KEK blob by its ID.
   * @param blobId - The ID of the KEK blob.
   * @returns The KekBlob object or null if not found.
   */
  async getKekBlobById(blobId: string): Promise<KekBlob | null> {
    const client = db.getClient();
    const blobKey = `${KEK_BLOB_PREFIX}${blobId}`;
    try {
      const data = await client.hgetall(blobKey);
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      return data as unknown as KekBlob;
    } catch (error) {
      logger.error(`Error getting KEK blob ${blobId}:`, error);
      throw new Error('Failed to get KEK blob');
    }
  }

  /**
   * Gets a specific KEK blob for a given principal and KEK version ID.
   * @param principalId - The ID of the principal.
   * @param kekVersionId - The ID of the KEK version.
   * @returns The KekBlob object or null if not found.
   */
  async getKekBlobByPrincipalAndVersion(principalId: string, kekVersionId: string): Promise<KekBlob | null> {
    const blobId = await this.findKekBlobId(principalId, kekVersionId);
    if (!blobId) {
      return null;
    }
    return this.getKekBlobById(blobId);
  }

  /**
   * Gets all KEK blobs associated with a principal.
   * @param principalId - The ID of the principal.
   * @returns An array of KekBlob objects.
   */
  async getAllKekBlobsForPrincipal(principalId: string): Promise<KekBlob[]> {
    const client = db.getClient();
    const principalBlobsKey = `${PRINCIPAL_KEK_BLOBS_PREFIX}${principalId}:kek_blobs`;
    const blobs: KekBlob[] = [];

    try {
      const blobIds = await client.smembers(principalBlobsKey);
      for (const blobId of blobIds) {
        const blob = await this.getKekBlobById(blobId);
        if (blob) {
          blobs.push(blob);
        }
      }
      return blobs;
    } catch (error) {
      logger.error(`Error getting all KEK blobs for principal ${principalId}:`, error);
      throw new Error('Failed to get KEK blobs for principal');
    }
  }

  /**
   * Deletes a specific KEK blob. Used during revocation.
   * @param blobId - The ID of the blob to delete.
   */
  async deleteKekBlob(blobId: string): Promise<void> {
    const client = db.getClient();
    const blobKey = `${KEK_BLOB_PREFIX}${blobId}`;

    try {
      // Get principal and version ID before deleting the hash
      const [principalId, kekVersionId] = await client.hmget(blobKey, 'principal_id', 'kek_version_id');

      if (!principalId || !kekVersionId) {
        logger.warn(`KEK blob ${blobId} not found or missing data, skipping deletion.`);
        // If the blob doesn't exist, we might still want to clean up set memberships
        // For simplicity here, we just return if the main hash is gone.
        // A more robust cleanup might be needed in production.
        await client.del(blobKey); // Attempt deletion anyway
        return;
      }

      const principalBlobsKey = `${PRINCIPAL_KEK_BLOBS_PREFIX}${principalId}:kek_blobs`;
      const versionPrincipalsKey = `${KEK_VERSION_PRINCIPALS_PREFIX}${kekVersionId}:principals`;

      const multi = client.multi();
      multi.del(blobKey); // Delete the main hash
      multi.srem(principalBlobsKey, blobId); // Remove from principal's set
      multi.srem(versionPrincipalsKey, principalId); // Remove principal from version's set

      await multi.exec();
      logger.info(`Deleted KEK blob ${blobId} for principal ${principalId}, version ${kekVersionId}`);

    } catch (error) {
      logger.error(`Error deleting KEK blob ${blobId}:`, error);
      throw new Error('Failed to delete KEK blob');
    }
  }

  /**
   * Deletes all KEK blobs associated with a principal. Used during user deletion.
   * @param principalId - The ID of the principal.
   */
  async deleteAllKekBlobsForPrincipal(principalId: string): Promise<void> {
    const client = db.getClient();
    const principalBlobsKey = `${PRINCIPAL_KEK_BLOBS_PREFIX}${principalId}:kek_blobs`;

    try {
      const blobIds = await client.smembers(principalBlobsKey);
      if (blobIds.length === 0) {
        logger.info(`No KEK blobs found for principal ${principalId}, skipping deletion.`);
        return;
      }

      const multiDelete = client.multi();
      const versionPrincipalKeysToRemove: { [versionId: string]: string } = {};

      for (const blobId of blobIds) {
        const blobKey = `${KEK_BLOB_PREFIX}${blobId}`;
        // Get version ID to remove principal from version's set later
        const kekVersionId = await client.hget(blobKey, 'kek_version_id');
        if (kekVersionId) {
          versionPrincipalKeysToRemove[kekVersionId] = `${KEK_VERSION_PRINCIPALS_PREFIX}${kekVersionId}:principals`;
        }
        multiDelete.del(blobKey); // Delete the blob hash
      }

      // Delete the set linking principal to blobs
      multiDelete.del(principalBlobsKey);

      // Remove the principal from each relevant version's principal set
      for (const versionId in versionPrincipalKeysToRemove) {
        multiDelete.srem(versionPrincipalKeysToRemove[versionId], principalId);
      }

      await multiDelete.exec();
      logger.info(`Deleted all ${blobIds.length} KEK blobs for principal ${principalId}`);

    } catch (error) {
      logger.error(`Error deleting all KEK blobs for principal ${principalId}:`, error);
      throw new Error('Failed to delete all KEK blobs for principal');
    }
  }
}
