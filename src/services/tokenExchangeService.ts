import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { auth0Service } from './auth0Service';
import { authService } from './AuthService';
import { logger } from './logger';
import { db } from '../db';

// Secret key for signing server tokens
// In production, this should be a strong, environment-specific secret
const SERVER_TOKEN_SECRET = process.env.SERVER_TOKEN_SECRET || 'server-token-secret';

// Token expiration settings
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'; // Short-lived token

/**
 * Token exchange service
 *
 * This service handles exchanging Auth0 tokens for server access tokens
 */
export class TokenExchangeService {
  // Redis key prefix for storing token metadata
  private readonly TOKEN_PREFIX = 'tokens:';

  /**
   * Exchange an Auth0 token for a server access token
   *
   * @param auth0Token The Auth0 token to exchange
   * @param tenantId The tenant ID
   * @returns A server access token
   */
  async exchangeToken(auth0Token: string, tenantId: string): Promise<string> {
    try {
      // Verify the Auth0 token
      const user = await auth0Service.validateToken(auth0Token);

      if (!user) {
        throw new Error('Invalid Auth0 token');
      }

      // Create a server access token
      const serverToken = this.createServerToken(user.sub, tenantId);

      return serverToken;
    } catch (error) {
      logger.error('Error exchanging token:', error);
      throw new Error('Failed to exchange token');
    }
  }

  /**
   * Exchange an authentication token for a resource-specific access token
   *
   * @param authToken Authentication token
   * @param tenantId Tenant ID
   * @param resource Resource to access (e.g., 'logs:read', 'logs:write')
   * @returns Access token
   */
  async exchangeTokenForResource(authToken: string, tenantId: string, resource: string): Promise<string> {
    try {
      // Verify the Auth0 token
      const user = await auth0Service.validateToken(authToken);

      if (!user) {
        logger.warn('Invalid authentication token', { tenantId });
        throw new Error('Invalid authentication token');
      }

      // Check if the user has permission to access the resource
      const [resourceType, resourceId] = resource.split(':');
      const permission = this.getPermissionFromResource(resourceType);

      const allowed = await authService.check({
        user: `user:${user.sub}`,
        relation: permission,
        object: resource,
        tenantId
      });

      if (!allowed) {
        logger.warn('User does not have permission to access resource', { userId: user.sub, resource, tenantId });
        throw new Error('Forbidden');
      }

      // Generate a short-lived access token
      const tokenId = uuidv4();
      const accessToken = jwt.sign(
        {
          sub: user.sub,
          tenant: tenantId,
          resource,
          type: 'resource_access',
          jti: tokenId
        },
        SERVER_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      // Store token metadata in Redis
      await db.setJSON(
        `${this.TOKEN_PREFIX}${tokenId}`,
        {
          id: tokenId,
          userId: user.sub,
          tenantId,
          resource,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this.parseExpiryToMs(ACCESS_TOKEN_EXPIRY))
        },
        this.parseExpiryToSeconds(ACCESS_TOKEN_EXPIRY)
      );

      return accessToken;
    } catch (error) {
      logger.error('Error exchanging token for resource', { error, resource, tenantId });
      throw error;
    }
  }

  /**
   * Create a server access token
   *
   * @param userId The user ID
   * @param tenantId The tenant ID
   * @returns A server access token
   */
  private createServerToken(userId: string, tenantId: string): string {
    // Create a payload for the server token
    const payload = {
      sub: userId,
      tenant: tenantId,
      type: 'server_access',
      jti: uuidv4(), // Unique token ID
    };

    // Sign the token with a short expiration (5 minutes)
    const token = jwt.sign(payload, SERVER_TOKEN_SECRET, {
      expiresIn: '5m',
    });

    return token;
  }

  /**
   * Verify a server access token
   *
   * @param token The server access token to verify
   * @returns The decoded token payload if valid
   */
  verifyServerToken(token: string): any {
    try {
      // Verify the token
      const decoded = jwt.verify(token, SERVER_TOKEN_SECRET);

      // Check if the token is a server access token
      // Check if decoded is an object and has the 'type' property
      if (typeof decoded !== 'object' || !decoded || decoded.type !== 'server_access') {
        throw new Error('Invalid token type or structure');
      }

      return decoded;
    } catch (error) {
      logger.error('Error verifying server token:', error);
      return null;
    }
  }

  /**
   * Verify a resource access token
   *
   * @param token The resource access token to verify
   * @returns The decoded token payload if valid
   */
  async verifyResourceToken(token: string): Promise<any> {
    try {
      // Verify the token
      const decoded = jwt.verify(token, SERVER_TOKEN_SECRET) as any;

      // Check if the token is a resource access token
      if (decoded.type !== 'resource_access') {
        logger.warn('Invalid token type', { type: decoded.type });
        throw new Error('Invalid token type');
      }

      // Check if the token exists in Redis
      const tokenExists = await db.exists(`${this.TOKEN_PREFIX}${decoded.jti}`);

      if (!tokenExists) {
        logger.warn('Token not found in database', { jti: decoded.jti });
        throw new Error('Invalid token');
      }

      return decoded;
    } catch (error) {
      logger.error('Error verifying resource token:', error);
      throw error;
    }
  }

  /**
   * Revoke a token
   *
   * @param tokenId Token ID
   * @returns True if successful
   */
  async revokeToken(tokenId: string): Promise<boolean> {
    try {
      // Delete the token from Redis
      await db.del(`${this.TOKEN_PREFIX}${tokenId}`);
      return true;
    } catch (error) {
      logger.error('Error revoking token', { error, tokenId });
      return false;
    }
  }

  /**
   * Get the permission required for a resource type
   *
   * @param resourceType Resource type
   * @returns Permission
   */
  private getPermissionFromResource(resourceType: string): string {
    switch (resourceType) {
      case 'logs':
        return 'read';
      case 'log':
        return 'read';
      default:
        return 'read';
    }
  }

  /**
   * Parse expiry string to milliseconds
   *
   * @param expiry Expiry string (e.g., '15m', '1h')
   * @returns Milliseconds
   */
  private parseExpiryToMs(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000; // Default to 15 minutes
    }
  }

  /**
   * Parse expiry string to seconds
   *
   * @param expiry Expiry string (e.g., '15m', '1h')
   * @returns Seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    return Math.floor(this.parseExpiryToMs(expiry) / 1000);
  }
}

// Export singleton instance
export const tokenExchangeService = new TokenExchangeService();
