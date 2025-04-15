/**
 * Public key service
 */

import { db } from '../db';
import { logger } from './logger';
import { PublicKey } from '@neurallog/client-sdk/dist/types/api';

/**
 * Public key service
 */
export class PublicKeyService {
  // Redis key prefixes
  private readonly PUBLIC_KEY_PREFIX = 'public-keys:';
  private readonly TENANT_PUBLIC_KEYS_PREFIX = 'tenants:';

  /**
   * Get a public key by user ID and purpose
   *
   * @param userId User ID
   * @param purpose Purpose of the public key
   * @param tenantId Tenant ID
   * @returns Public key or null if not found
   */
  async getPublicKey(userId: string, purpose: string, tenantId: string): Promise<PublicKey | null> {
    try {
      // Get public key from Redis
      const key = `${this.PUBLIC_KEY_PREFIX}${tenantId}:${userId}:${purpose}`;
      return await db.getJSON<PublicKey>(key);
    } catch (error) {
      logger.error('Error getting public key', { error, userId, purpose, tenantId });
      return null;
    }
  }

  /**
   * Store a public key
   *
   * @param userId User ID
   * @param publicKeyData Public key data
   * @param purpose Purpose of the public key
   * @param tenantId Tenant ID
   * @returns True if successful
   */
  async storePublicKey(userId: string, publicKeyData: string, purpose: string, tenantId: string): Promise<boolean> {
    try {
      // Create public key object
      const now = new Date().toISOString();
      const publicKey: PublicKey = {
        userId,
        publicKey: publicKeyData,
        purpose,
        tenantId,
        createdAt: now,
        updatedAt: now
      };

      // Store public key in Redis
      const key = `${this.PUBLIC_KEY_PREFIX}${tenantId}:${userId}:${purpose}`;
      await db.setJSON(key, publicKey);

      // Add public key to tenant
      await db.sadd(`${this.TENANT_PUBLIC_KEYS_PREFIX}${tenantId}:public-keys`, key);

      return true;
    } catch (error) {
      logger.error('Error storing public key', { error, userId, purpose, tenantId });
      return false;
    }
  }

  /**
   * Delete a public key
   *
   * @param userId User ID
   * @param purpose Purpose of the public key
   * @param tenantId Tenant ID
   * @returns True if successful
   */
  async deletePublicKey(userId: string, purpose: string, tenantId: string): Promise<boolean> {
    try {
      // Delete public key from Redis
      const key = `${this.PUBLIC_KEY_PREFIX}${tenantId}:${userId}:${purpose}`;
      await db.del(key);

      // Remove public key from tenant
      await db.srem(`${this.TENANT_PUBLIC_KEYS_PREFIX}${tenantId}:public-keys`, key);

      return true;
    } catch (error) {
      logger.error('Error deleting public key', { error, userId, purpose, tenantId });
      return false;
    }
  }

  /**
   * Get all public keys for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Array of public keys
   */
  async getPublicKeysForTenant(tenantId: string): Promise<PublicKey[]> {
    try {
      // Get all public key keys for the tenant
      const keys = await db.smembers(`${this.TENANT_PUBLIC_KEYS_PREFIX}${tenantId}:public-keys`);

      // Get public key details for each key
      const publicKeys: PublicKey[] = [];

      for (const key of keys) {
        const publicKey = await db.getJSON<PublicKey>(key);
        if (publicKey) {
          publicKeys.push(publicKey);
        }
      }

      return publicKeys;
    } catch (error) {
      logger.error('Error getting public keys for tenant', { error, tenantId });
      return [];
    }
  }
}

export const publicKeyService = new PublicKeyService();
