import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { LogError } from '@neurallog/client-sdk';
import config from '../config';
import { KEKVersion, KEKBlob } from '@neurallog/client-sdk/dist/types/api';

/**
 * KEK version status
 */
export type KEKVersionStatus = 'active' | 'decrypt-only' | 'deprecated';

/**
 * Redis KEK service
 */
export class RedisKEKService {
  private client: Redis;
  private connected: boolean = false;
  private static instance: RedisKEKService;

  /**
   * Get the singleton instance
   */
  public static getInstance(): RedisKEKService {
    if (!RedisKEKService.instance) {
      RedisKEKService.instance = new RedisKEKService();
    }
    return RedisKEKService.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.client = new Redis(config.redis.url);

    this.client.on('error', (err: Error) => {
      console.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Disconnected from Redis');
      this.connected = false;
    });

    // Connect to Redis
    this.connect();
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        throw new LogError('Failed to connect to Redis', 'redis_connection_failed');
      }
    }
  }

  /**
   * Ensure connection to Redis
   */
  private async ensureConnection(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  /**
   * Get KEK version key
   *
   * @param tenantId Tenant ID
   * @param versionId Version ID
   * @returns Redis key
   */
  private getKEKVersionKey(tenantId: string, versionId: string): string {
    return `kek:version:${tenantId}:${versionId}`;
  }

  /**
   * Get KEK versions index key
   *
   * @param tenantId Tenant ID
   * @returns Redis key
   */
  private getKEKVersionsIndexKey(tenantId: string): string {
    return `kek:versions:${tenantId}`;
  }

  /**
   * Get KEK blob key
   *
   * @param tenantId Tenant ID
   * @param userId User ID
   * @param versionId Version ID
   * @returns Redis key
   */
  private getKEKBlobKey(tenantId: string, userId: string, versionId: string): string {
    return `kek:blob:${tenantId}:${userId}:${versionId}`;
  }

  /**
   * Get KEK blobs index key
   *
   * @param tenantId Tenant ID
   * @param userId User ID
   * @returns Redis key
   */
  private getKEKBlobsIndexKey(tenantId: string, userId: string): string {
    return `kek:blobs:${tenantId}:${userId}`;
  }

  /**
   * Get all KEK versions for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the KEK versions
   */
  public async getKEKVersions(tenantId: string): Promise<KEKVersion[]> {
    await this.ensureConnection();

    try {
      // Get all version IDs for the tenant
      const versionsKey = this.getKEKVersionsIndexKey(tenantId);
      const versionIds = await this.client.smembers(versionsKey);

      if (!versionIds || versionIds.length === 0) {
        return [];
      }

      // Get all versions
      const versions: KEKVersion[] = [];
      for (const versionId of versionIds) {
        const versionKey = this.getKEKVersionKey(tenantId, versionId);
        const versionData = await this.client.hgetall(versionKey);

        if (versionData && Object.keys(versionData).length > 0) {
          versions.push({
            id: versionId,
            createdAt: versionData.createdAt,
            createdBy: versionData.createdBy,
            status: versionData.status as KEKVersionStatus,
            reason: versionData.reason,
            tenantId: versionData.tenantId
          });
        }
      }

      // Sort by creation date (newest first)
      return versions.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } catch (error) {
      console.error('Failed to get KEK versions:', error);
      throw new LogError('Failed to get KEK versions', 'get_kek_versions_failed');
    }
  }

  /**
   * Get active KEK version for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Promise that resolves to the active KEK version
   */
  public async getActiveKEKVersion(tenantId: string): Promise<KEKVersion | null> {
    await this.ensureConnection();

    try {
      // Get all versions
      const versions = await this.getKEKVersions(tenantId);

      // Find active version
      return versions.find(version => version.status === 'active') || null;
    } catch (error) {
      console.error('Failed to get active KEK version:', error);
      throw new LogError('Failed to get active KEK version', 'get_active_kek_version_failed');
    }
  }

  /**
   * Get KEK version by ID
   *
   * @param tenantId Tenant ID
   * @param versionId Version ID
   * @returns Promise that resolves to the KEK version
   */
  public async getKEKVersion(tenantId: string, versionId: string): Promise<KEKVersion | null> {
    await this.ensureConnection();

    try {
      const versionKey = this.getKEKVersionKey(tenantId, versionId);
      const versionData = await this.client.hgetall(versionKey);

      if (!versionData || Object.keys(versionData).length === 0) {
        return null;
      }

      return {
        id: versionId,
        createdAt: versionData.createdAt,
        createdBy: versionData.createdBy,
        status: versionData.status as KEKVersionStatus,
        reason: versionData.reason,
        tenantId: versionData.tenantId
      };
    } catch (error) {
      console.error('Failed to get KEK version:', error);
      throw new LogError('Failed to get KEK version', 'get_kek_version_failed');
    }
  }

  /**
   * Create a new KEK version
   *
   * @param tenantId Tenant ID
   * @param userId User ID
   * @param reason Reason for creating the version
   * @returns Promise that resolves to the new KEK version
   */
  public async createKEKVersion(tenantId: string, userId: string, reason: string): Promise<KEKVersion> {
    await this.ensureConnection();

    try {
      // Start a transaction
      const multi = this.client.multi();

      // Update all active versions to decrypt-only
      const versions = await this.getKEKVersions(tenantId);
      for (const version of versions) {
        if (version.status === 'active') {
          const versionKey = this.getKEKVersionKey(tenantId, version.id);
          multi.hset(versionKey, 'status', 'decrypt-only');
        }
      }

      // Create a new version
      const versionId = uuidv4();
      const versionKey = this.getKEKVersionKey(tenantId, versionId);
      const now = new Date().toISOString();

      multi.hset(versionKey, {
        createdAt: now,
        createdBy: userId,
        status: 'active',
        reason,
        tenantId
      });

      // Add to versions index
      const versionsKey = this.getKEKVersionsIndexKey(tenantId);
      multi.sadd(versionsKey, versionId);

      // Execute transaction
      await multi.exec();

      // Return the new version
      return {
        id: versionId,
        createdAt: now,
        createdBy: userId,
        status: 'active',
        reason,
        tenantId
      };
    } catch (error) {
      console.error('Failed to create KEK version:', error);
      throw new LogError('Failed to create KEK version', 'create_kek_version_failed');
    }
  }

  /**
   * Update KEK version status
   *
   * @param tenantId Tenant ID
   * @param versionId Version ID
   * @param status New status
   * @returns Promise that resolves to the updated KEK version
   */
  public async updateKEKVersionStatus(
    tenantId: string,
    versionId: string,
    status: KEKVersionStatus
  ): Promise<KEKVersion | null> {
    await this.ensureConnection();

    try {
      // Get the version
      const version = await this.getKEKVersion(tenantId, versionId);
      if (!version) {
        return null;
      }

      // Start a transaction
      const multi = this.client.multi();

      // If setting to active, update all other active versions to decrypt-only
      if (status === 'active') {
        const versions = await this.getKEKVersions(tenantId);
        for (const v of versions) {
          if (v.status === 'active' && v.id !== versionId) {
            const vKey = this.getKEKVersionKey(tenantId, v.id);
            multi.hset(vKey, 'status', 'decrypt-only');
          }
        }
      }

      // Update the version
      const versionKey = this.getKEKVersionKey(tenantId, versionId);
      multi.hset(versionKey, 'status', status);

      // Execute transaction
      await multi.exec();

      // Return the updated version
      return {
        ...version,
        status
      };
    } catch (error) {
      console.error('Failed to update KEK version status:', error);
      throw new LogError('Failed to update KEK version status', 'update_kek_version_status_failed');
    }
  }

  /**
   * Get KEK blob
   *
   * @param tenantId Tenant ID
   * @param userId User ID
   * @param versionId Version ID
   * @returns Promise that resolves to the KEK blob
   */
  public async getKEKBlob(
    tenantId: string,
    userId: string,
    versionId: string
  ): Promise<KEKBlob | null> {
    await this.ensureConnection();

    try {
      const blobKey = this.getKEKBlobKey(tenantId, userId, versionId);
      const blobData = await this.client.hgetall(blobKey);

      if (!blobData || Object.keys(blobData).length === 0) {
        return null;
      }

      return {
        userId,
        kekVersionId: versionId,
        encryptedBlob: blobData.encryptedBlob,
        tenantId,
        createdAt: blobData.createdAt,
        updatedAt: blobData.updatedAt
      };
    } catch (error) {
      console.error('Failed to get KEK blob:', error);
      throw new LogError('Failed to get KEK blob', 'get_kek_blob_failed');
    }
  }

  /**
   * Get all KEK blobs for a user
   *
   * @param tenantId Tenant ID
   * @param userId User ID
   * @returns Promise that resolves to the KEK blobs
   */
  public async getUserKEKBlobs(tenantId: string, userId: string): Promise<KEKBlob[]> {
    await this.ensureConnection();

    try {
      // Get all version IDs for the user
      const blobsKey = this.getKEKBlobsIndexKey(tenantId, userId);
      const versionIds = await this.client.smembers(blobsKey);

      if (!versionIds || versionIds.length === 0) {
        return [];
      }

      // Get all blobs
      const blobs: KEKBlob[] = [];
      for (const versionId of versionIds) {
        const blobKey = this.getKEKBlobKey(tenantId, userId, versionId);
        const blobData = await this.client.hgetall(blobKey);

        if (blobData && Object.keys(blobData).length > 0) {
          blobs.push({
            userId,
            kekVersionId: versionId,
            encryptedBlob: blobData.encryptedBlob,
            tenantId,
            createdAt: blobData.createdAt,
            updatedAt: blobData.updatedAt
          });
        }
      }

      // Sort by update date (newest first)
      return blobs.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    } catch (error) {
      console.error('Failed to get user KEK blobs:', error);
      throw new LogError('Failed to get user KEK blobs', 'get_user_kek_blobs_failed');
    }
  }

  /**
   * Create or update KEK blob
   *
   * @param tenantId Tenant ID
   * @param userId User ID
   * @param versionId Version ID
   * @param encryptedBlob Encrypted blob
   * @returns Promise that resolves to the KEK blob
   */
  public async setKEKBlob(
    tenantId: string,
    userId: string,
    versionId: string,
    encryptedBlob: string
  ): Promise<KEKBlob> {
    await this.ensureConnection();

    try {
      // Check if the version exists
      const version = await this.getKEKVersion(tenantId, versionId);
      if (!version) {
        throw new LogError('KEK version not found', 'kek_version_not_found');
      }

      // Start a transaction
      const multi = this.client.multi();

      // Create or update the blob
      const blobKey = this.getKEKBlobKey(tenantId, userId, versionId);
      const now = new Date().toISOString();
      const existingBlob = await this.getKEKBlob(tenantId, userId, versionId);

      multi.hset(blobKey, {
        encryptedBlob,
        createdAt: existingBlob?.createdAt || now,
        updatedAt: now
      });

      // Add to blobs index
      const blobsKey = this.getKEKBlobsIndexKey(tenantId, userId);
      multi.sadd(blobsKey, versionId);

      // Execute transaction
      await multi.exec();

      // Return the blob
      return {
        userId,
        kekVersionId: versionId,
        encryptedBlob,
        tenantId,
        createdAt: existingBlob?.createdAt || now,
        updatedAt: now
      };
    } catch (error) {
      console.error('Failed to set KEK blob:', error);
      throw new LogError('Failed to set KEK blob', 'set_kek_blob_failed');
    }
  }

  /**
   * Delete KEK blob
   *
   * @param tenantId Tenant ID
   * @param userId User ID
   * @param versionId Version ID
   * @returns Promise that resolves to true if the blob was deleted
   */
  public async deleteKEKBlob(
    tenantId: string,
    userId: string,
    versionId: string
  ): Promise<boolean> {
    await this.ensureConnection();

    try {
      // Start a transaction
      const multi = this.client.multi();

      // Delete the blob
      const blobKey = this.getKEKBlobKey(tenantId, userId, versionId);
      multi.del(blobKey);

      // Remove from blobs index
      const blobsKey = this.getKEKBlobsIndexKey(tenantId, userId);
      multi.srem(blobsKey, versionId);

      // Execute transaction
      await multi.exec();

      return true;
    } catch (error) {
      console.error('Failed to delete KEK blob:', error);
      throw new LogError('Failed to delete KEK blob', 'delete_kek_blob_failed');
    }
  }
}
