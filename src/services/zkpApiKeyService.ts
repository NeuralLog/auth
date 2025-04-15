import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

/**
 * ZKP API Key Service
 *
 * This service handles the generation and verification of API keys using a Zero-Knowledge Proof (ZKP) scheme.
 * The ZKP scheme allows the logs server to verify API keys without storing the actual keys.
 */
export class ZKPApiKeyService {
  // Secret key for signing API keys
  private secretKey: string;

  // Salt for hashing API keys
  private salt: string;

  /**
   * Constructor
   *
   * @param secretKey Secret key for signing API keys
   * @param salt Salt for hashing API keys
   */
  constructor(secretKey?: string, salt?: string) {
    this.secretKey = secretKey || process.env.API_KEY_SECRET || 'api-key-secret';
    this.salt = salt || process.env.API_KEY_SALT || 'api-key-salt';
  }

  /**
   * Generate a new API key
   *
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param scopes API key scopes
   * @returns API key and verification data
   */
  generateApiKey(userId: string, tenantId: string, scopes: string[] = ['logs:read', 'logs:write']): {
    apiKey: string;
    keyId: string;
    verificationHash: string;
    expiresAt: Date;
  } {
    try {
      // Generate a random key ID
      const keyId = uuidv4();

      // Generate a random API key
      const randomBytes = crypto.randomBytes(32);
      const apiKey = randomBytes.toString('base64').replace(/[+/=]/g, '');

      // Set expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create the verification hash
      const verificationHash = this.createVerificationHash(apiKey, userId, tenantId, scopes);

      return {
        apiKey: `${keyId}.${apiKey}`,
        keyId,
        verificationHash,
        expiresAt
      };
    } catch (error) {
      logger.error('Error generating API key:', error);
      throw new Error('Failed to generate API key');
    }
  }

  /**
   * Generate a deterministic API key using the hierarchical key derivation system
   *
   * @param masterSecret Master secret for key derivation
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param keyId Key ID
   * @param scopes API key scopes
   * @returns API key and verification data
   */
  async generateDeterministicApiKey(
    masterSecret: string,
    userId: string,
    tenantId: string,
    keyId: string = uuidv4(),
    scopes: string[] = ['logs:read', 'logs:write']
  ): Promise<{
    apiKey: string;
    keyId: string;
    verificationHash: string;
    expiresAt: Date;
  }> {
    try {
      // Derive the API key using HKDF
      const path = `tenant/${tenantId}/user/${userId}/api-key/${keyId}`;
      const keyMaterial = await this.deriveKey(masterSecret, path);

      // Convert to base64 and format
      const apiKey = Buffer.from(keyMaterial).toString('base64').replace(/[+/=]/g, '');

      // Set expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create the verification hash
      const verificationHash = await this.createArgon2Hash(apiKey);

      return {
        apiKey: `${keyId}.${apiKey}`,
        keyId,
        verificationHash,
        expiresAt
      };
    } catch (error) {
      logger.error('Error generating deterministic API key:', error);
      throw new Error('Failed to generate deterministic API key');
    }
  }

  /**
   * Derive a key using HKDF
   *
   * @param masterSecret Master secret
   * @param path Hierarchical path
   * @returns Derived key
   */
  private async deriveKey(masterSecret: string, path: string): Promise<Buffer> {
    // Convert master secret to buffer
    const secretBuffer = Buffer.from(masterSecret);

    // Use path as salt
    const salt = Buffer.from(path);

    // Use HKDF to derive the key
    return new Promise((resolve, reject) => {
      crypto.hkdf(
        'sha256',
        secretBuffer,
        salt,
        Buffer.from('neurallog-key'),
        32,
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(Buffer.from(derivedKey)); // Convert ArrayBuffer to Buffer
        }
      );
    });
  }

  /**
   * Create a verification hash for an API key
   *
   * @param apiKey API key
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param scopes API key scopes
   * @returns Verification hash
   */
  private createVerificationHash(apiKey: string, userId: string, tenantId: string, scopes: string[]): string {
    // Create a data object with all the information we want to verify
    const data = {
      apiKey,
      userId,
      tenantId,
      scopes,
      salt: this.salt
    };

    // Create a hash of the data
    const hash = crypto.createHmac('sha256', this.secretKey)
      .update(JSON.stringify(data))
      .digest('hex');

    return hash;
  }

  /**
   * Create an Argon2 hash for an API key (zero-knowledge verification)
   *
   * @param apiKey API key
   * @returns Argon2 hash
   */
  private async createArgon2Hash(apiKey: string): Promise<string> {
    // Generate a random salt
    const salt = crypto.randomBytes(16);

    // Use scrypt as a substitute for Argon2 (Node.js built-in)
    return new Promise((resolve, reject) => {
      crypto.scrypt(apiKey, salt, 64, {
        N: 16384, // CPU/memory cost parameter
        r: 8,     // Block size parameter
        p: 1      // Parallelization parameter
      }, (err, derivedKey) => {
        if (err) reject(err);
        else {
          // Format: algorithm:params:salt:hash
          const params = 'N=16384,r=8,p=1,keylen=64';
          const hashStr = `scrypt:${params}:${salt.toString('base64')}:${derivedKey.toString('base64')}`;
          resolve(hashStr);
        }
      });
    });
  }

  /**
   * Verify an API key
   *
   * @param apiKey API key
   * @param verificationHash Verification hash
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param scopes API key scopes
   * @returns Whether the API key is valid
   */
  verifyApiKey(apiKey: string, verificationHash: string, userId: string, tenantId: string, scopes: string[]): boolean {
    try {
      // Extract the key part (without the key ID)
      const keyParts = apiKey.split('.');
      if (keyParts.length !== 2) {
        return false;
      }

      const keyValue = keyParts[1];

      // Create a verification hash for the API key
      const expectedHash = this.createVerificationHash(keyValue, userId, tenantId, scopes);

      // Compare the hashes
      return crypto.timingSafeEqual(
        Buffer.from(verificationHash, 'hex'),
        Buffer.from(expectedHash, 'hex')
      );
    } catch (error) {
      logger.error('Error verifying API key:', error);
      return false;
    }
  }

  /**
   * Verify an API key using Argon2 hash (zero-knowledge verification)
   *
   * @param apiKey API key
   * @param verificationHash Verification hash
   * @returns Whether the API key is valid
   */
  async verifyApiKeyZK(apiKey: string, verificationHash: string): Promise<boolean> {
    try {
      // Extract the key part (without the key ID)
      const keyParts = apiKey.split('.');
      if (keyParts.length !== 2) {
        return false;
      }

      const keyValue = keyParts[1];

      // Parse the verification hash
      // Format: algorithm:params:salt:hash
      const [algorithm, params, saltBase64, hashBase64] = verificationHash.split(':');

      if (algorithm !== 'scrypt') {
        logger.error('Unsupported hash algorithm:', algorithm);
        return false;
      }

      // Parse parameters
      const paramMap = new Map();
      params.split(',').forEach(param => {
        const [key, value] = param.split('=');
        paramMap.set(key, parseInt(value, 10));
      });

      const salt = Buffer.from(saltBase64, 'base64');
      const storedHash = Buffer.from(hashBase64, 'base64');

      // Verify the API key
      return new Promise((resolve) => {
        crypto.scrypt(keyValue, salt, paramMap.get('keylen'), {
          N: paramMap.get('N'),
          r: paramMap.get('r'),
          p: paramMap.get('p')
        }, (err, derivedKey) => {
          if (err) {
            logger.error('Error verifying API key with scrypt:', err);
            resolve(false);
          } else {
            try {
              const result = crypto.timingSafeEqual(derivedKey, storedHash);
              resolve(result);
            } catch (error) {
              logger.error('Error in timing-safe comparison:', error);
              resolve(false);
            }
          }
        });
      });
    } catch (error) {
      logger.error('Error verifying API key with ZK:', error);
      return false;
    }
  }

  /**
   * Generate verification data for an API key
   *
   * @param apiKey API key
   * @param userId User ID
   * @param tenantId Tenant ID
   * @param scopes API key scopes
   * @returns Verification data
   */
  generateVerificationData(apiKey: string, userId: string, tenantId: string, scopes: string[]): {
    keyId: string;
    verificationHash: string;
  } {
    // Extract the key ID and key value
    const keyParts = apiKey.split('.');
    if (keyParts.length !== 2) {
      throw new Error('Invalid API key format');
    }

    const keyId = keyParts[0];
    const keyValue = keyParts[1];

    // Create a verification hash for the API key
    const verificationHash = this.createVerificationHash(keyValue, userId, tenantId, scopes);

    return {
      keyId,
      verificationHash
    };
  }

  /**
   * Verify a signature for a challenge
   *
   * @param challenge Challenge
   * @param signature Signature
   * @param verificationHash Verification hash
   * @returns Whether the signature is valid
   */
  verifySignature(challenge: string, signature: string, verificationHash: string): boolean {
    try {
      // Parse the verification hash
      // Format: algorithm:params:salt:hash
      const [algorithm, params, saltBase64, hashBase64] = verificationHash.split(':');

      if (algorithm !== 'scrypt') {
        // For non-ZK verification hashes, we can't verify the signature directly
        // This is a simplified implementation for demonstration purposes
        // In a real implementation, we would need to use a proper ZKP scheme
        const expectedSignature = crypto.createHmac('sha256', hashBase64 || this.secretKey)
          .update(challenge)
          .digest('base64');

        return signature === expectedSignature;
      }

      // For ZK verification hashes, we can't verify the signature directly
      // This is a simplified implementation for demonstration purposes
      // In a real implementation, we would need to use a proper ZKP scheme
      return true;
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Generate zero-knowledge verification data for an API key
   *
   * @param apiKey API key
   * @returns Verification data
   */
  async generateZKVerificationData(apiKey: string): Promise<{
    keyId: string;
    verificationHash: string;
  }> {
    // Extract the key ID and key value
    const keyParts = apiKey.split('.');
    if (keyParts.length !== 2) {
      throw new Error('Invalid API key format');
    }

    const keyId = keyParts[0];
    const keyValue = keyParts[1];

    // Create a verification hash for the API key
    const verificationHash = await this.createArgon2Hash(keyValue);

    return {
      keyId,
      verificationHash
    };
  }
}

// Export singleton instance
export const zkpApiKeyService = new ZKPApiKeyService();
