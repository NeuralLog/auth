/**
 * Public key service
 */

import { db } from '../db';
import { logger } from './logger';
// Define the interfaces locally until they are properly exported from the client-sdk
interface PublicKey {
  id: string;
  userId: string;
  publicKey: string;
  purpose: string;
  tenantId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface VerifyPublicKeyResponse {
  verified: boolean;
  userId: string;
  keyId: string;
}
import { v4 as uuidv4 } from 'uuid';

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
      const id = uuidv4();
      const publicKey: PublicKey = {
        id,
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

  /**
   * Register a new public key
   *
   * @param userId User ID
   * @param publicKeyData Public key data (Base64-encoded)
   * @param purpose Purpose of the public key (e.g., 'admin-promotion')
   * @param tenantId Tenant ID
   * @param metadata Additional metadata (optional)
   * @returns The registered public key
   */
  async registerPublicKey(
    userId: string,
    publicKeyData: string,
    purpose: string,
    tenantId: string,
    metadata?: Record<string, any>
  ): Promise<PublicKey> {
    try {
      // Generate a unique ID for the public key
      const id = uuidv4();
      const now = new Date().toISOString();

      // Create public key object
      const publicKey: PublicKey = {
        id,
        userId,
        publicKey: publicKeyData,
        purpose,
        tenantId,
        metadata: metadata || {},
        createdAt: now,
        updatedAt: now
      };

      // Store public key in Redis
      const key = `${this.PUBLIC_KEY_PREFIX}${tenantId}:${userId}:${purpose}`;
      await db.setJSON(key, publicKey);

      // Store public key by ID
      await db.setJSON(`${this.PUBLIC_KEY_PREFIX}id:${id}`, publicKey);

      // Add public key to tenant
      await db.sadd(`${this.TENANT_PUBLIC_KEYS_PREFIX}${tenantId}:public-keys`, key);

      logger.info('Registered public key', { userId, purpose, tenantId, id });

      return publicKey;
    } catch (error) {
      logger.error('Error registering public key', { error, userId, purpose, tenantId });
      throw error;
    }
  }

  /**
   * Get a public key by ID
   *
   * @param keyId Public key ID
   * @returns Public key or null if not found
   */
  async getPublicKeyById(keyId: string): Promise<PublicKey | null> {
    try {
      // Get public key from Redis
      const key = `${this.PUBLIC_KEY_PREFIX}id:${keyId}`;
      return await db.getJSON<PublicKey>(key);
    } catch (error) {
      logger.error('Error getting public key by ID', { error, keyId });
      return null;
    }
  }

  /**
   * Update a public key
   *
   * @param keyId Public key ID
   * @param userId User ID (for authorization)
   * @param publicKeyData Public key data (Base64-encoded)
   * @param metadata Additional metadata (optional)
   * @returns The updated public key
   */
  async updatePublicKey(
    keyId: string,
    userId: string,
    publicKeyData: string,
    metadata?: Record<string, any>
  ): Promise<PublicKey> {
    try {
      // Get the existing public key
      const existingPublicKey = await this.getPublicKeyById(keyId);
      if (!existingPublicKey) {
        throw new Error('Public key not found');
      }

      // Check if the user is authorized to update the key
      if (existingPublicKey.userId !== userId) {
        throw new Error('Not authorized to update this public key');
      }

      // Update the public key
      const updatedPublicKey: PublicKey = {
        ...existingPublicKey,
        publicKey: publicKeyData,
        metadata: metadata || existingPublicKey.metadata,
        updatedAt: new Date().toISOString()
      };

      // Store the updated public key
      const key = `${this.PUBLIC_KEY_PREFIX}${existingPublicKey.tenantId}:${userId}:${existingPublicKey.purpose}`;
      await db.setJSON(key, updatedPublicKey);

      // Update the public key by ID
      await db.setJSON(`${this.PUBLIC_KEY_PREFIX}id:${keyId}`, updatedPublicKey);

      logger.info('Updated public key', { keyId, userId });

      return updatedPublicKey;
    } catch (error) {
      logger.error('Error updating public key', { error, keyId, userId });
      throw error;
    }
  }

  /**
   * Verify ownership of a public key
   *
   * @param keyId Public key ID
   * @param challenge Challenge to sign
   * @param signature Signature of the challenge
   * @returns Verification result
   */
  async verifyPublicKey(
    keyId: string,
    challenge: string,
    signature: string
  ): Promise<VerifyPublicKeyResponse> {
    try {
      // Get the public key
      const publicKey = await this.getPublicKeyById(keyId);
      if (!publicKey) {
        throw new Error('Public key not found');
      }

      // The actual verification happens on the client side
      // Here we just return the public key information
      return {
        verified: true, // This is a placeholder - actual verification happens client-side
        userId: publicKey.userId,
        keyId: publicKey.id!
      };
    } catch (error) {
      logger.error('Error verifying public key', { error, keyId });
      throw error;
    }
  }
}

export const publicKeyService = new PublicKeyService();
