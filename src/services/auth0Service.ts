import axios from 'axios';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

/**
 * Auth0 configuration options
 */
export interface Auth0ServiceOptions {
  /**
   * Auth0 domain
   */
  domain: string;

  /**
   * Auth0 client ID
   */
  clientId: string;

  /**
   * Auth0 client secret
   */
  clientSecret: string;

  /**
   * Auth0 audience
   */
  audience: string;
}

/**
 * Auth0 token response
 */
interface Auth0TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Auth0 user info response
 */
interface Auth0UserInfoResponse {
  sub: string;
  nickname?: string;
  name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
  [key: string]: any;
}

/**
 * Service for interacting with Auth0
 */
export class Auth0Service {
  private domain: string;
  private clientId: string;
  private clientSecret: string;
  private audience: string;
  private managementToken: string | null = null;
  private managementTokenExpiry: number = 0;

  /**
   * Create a new Auth0Service
   */
  constructor(options: Auth0ServiceOptions) {
    this.domain = options.domain;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.audience = options.audience;
  }

  /**
   * Initialize the Auth0 service
   */
  async initialize(): Promise<void> {
    try {
      // Get management API token
      await this.getManagementToken();
      logger.info('Auth0 service initialized');
    } catch (error) {
      logger.error('Failed to initialize Auth0 service', error);
      throw error;
    }
  }

  /**
   * Authenticate a user with username and password
   */
  async authenticateUser(username: string, password: string): Promise<{ token: string; expiresIn: number }> {
    try {
      const response = await axios.post<Auth0TokenResponse>(
        `https://${this.domain}/oauth/token`,
        {
          grant_type: 'password',
          username,
          password,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          audience: this.audience,
          scope: 'openid profile email'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        token: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      logger.error('Error authenticating user', { error, username });
      throw new Error('Authentication failed');
    }
  }

  /**
   * Get client credentials token for machine-to-machine authentication
   */
  async getClientCredentialsToken(clientId: string, clientSecret: string): Promise<{ token: string; expiresIn: number }> {
    try {
      const response = await axios.post<Auth0TokenResponse>(
        `https://${this.domain}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          audience: this.audience
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        token: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      logger.error('Error getting client credentials token', { error, clientId });
      throw new Error('Authentication failed');
    }
  }

  /**
   * Validate a token and get user information
   */
  async validateToken(token: string): Promise<Auth0UserInfoResponse> {
    try {
      const response = await axios.get<Auth0UserInfoResponse>(`https://${this.domain}/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Error validating token', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Get a token for the Auth0 Management API
   */
  public async getManagementToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.managementToken && this.managementTokenExpiry > Date.now()) {
      return this.managementToken;
    }

    try {
      const response = await axios.post<Auth0TokenResponse>(
        `https://${this.domain}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          audience: `https://${this.domain}/api/v2/`
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.managementToken = response.data.access_token;
      this.managementTokenExpiry = Date.now() + (response.data.expires_in * 1000);

      return this.managementToken;
    } catch (error) {
      logger.error('Error getting management token', error);
      throw new Error('Failed to get management token');
    }
  }

  /**
   * Create a new user in Auth0
   */
  async createUser(email: string, password: string, metadata?: Record<string, any>): Promise<string> {
    try {
      const token = await this.getManagementToken();

      const response = await axios.post(
        `https://${this.domain}/api/v2/users`,
        {
          email,
          password,
          connection: 'Username-Password-Authentication',
          email_verified: false,
          user_metadata: metadata
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.user_id;
    } catch (error) {
      logger.error('Error creating user', { error, email });
      throw new Error('Failed to create user');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const token = await this.getManagementToken();

      const response = await axios.get(
        `https://${this.domain}/api/v2/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Error getting user', { error, userId });
      throw new Error('Failed to get user');
    }
  }

  /**
   * Update user metadata
   */
  async updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<void> {
    try {
      const token = await this.getManagementToken();

      await axios.patch(
        `https://${this.domain}/api/v2/users/${userId}`,
        {
          user_metadata: metadata
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      logger.error('Error updating user metadata', { error, userId });
      throw new Error('Failed to update user metadata');
    }
  }

  /**
   * Get Auth0 domain
   */
  getDomain(): string {
    return this.domain;
  }

  /**
   * Get Auth0 audience
   */
  getAudience(): string {
    return this.audience;
  }

  /**
   * Create a token for API key authentication
   */
  async createApiKeyToken(userId: string, tenantId: string, scopes: string[]): Promise<{ token: string; expiresIn: number }> {
    try {
      // Create a token with the user ID, tenant ID, and scopes
      const token = jwt.sign(
        {
          sub: userId,
          tenant: tenantId,
          scopes
        },
        process.env.API_KEY_SECRET || 'api-key-secret',
        {
          expiresIn: '1h',
          algorithm: 'HS256'
        }
      );

      return {
        token,
        expiresIn: 3600 // 1 hour in seconds
      };
    } catch (error) {
      logger.error('Error creating API key token', { error, userId, tenantId });
      throw new Error('Failed to create API key token');
    }
  }
}

// Create singleton instance
export const auth0Service = new Auth0Service({
  domain: process.env.AUTH0_DOMAIN || '',
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  audience: process.env.AUTH0_AUDIENCE || ''
});
