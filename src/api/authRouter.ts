import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { auth0Service } from '../services/auth0Service';
import { userService } from '../services/UserService';
import {
  ApiError,
  Login,
  TokenValidationResult,
  PermissionCheck,
  TokenExchangeResult,
  ResourceTokenVerificationResult
} from '@neurallog/client-sdk';
import { logger } from '../services/logger';
import { tokenExchangeService } from '../services/tokenExchangeService';

export const authRouter = (authService: AuthService): Router => {
  const router = Router();

  /**
   * Authenticate a user with username and password
   *
   * POST /api/auth/login
   */
  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!username || !password) {
        throw new ApiError(400, 'Missing required parameters: username, password');
      }

      // Authenticate user
      const result = await authService.authenticateUser(username, password, tenantId);

      // Return login response using the shared Login type
      const loginResponse: Login = {
        token: result.token,
        user_id: result.user?.id || '',
        tenant_id: tenantId,
        user: result.user
      };
      res.json(loginResponse);
    } catch (error) {
      logger.error('Error during login', error);
      if (error instanceof Error && error.message === 'User does not have access to this tenant') {
        next(new ApiError(403, 'User does not have access to this tenant'));
      } else {
        next(new ApiError(401, 'Authentication failed'));
      }
    }
  });

  /**
   * Authenticate a machine-to-machine client
   *
   * POST /api/auth/m2m
   */
  router.post('/m2m', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clientId, clientSecret } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!clientId || !clientSecret) {
        throw new ApiError(400, 'Missing required parameters: clientId, clientSecret');
      }

      // Authenticate M2M client
      const result = await authService.authenticateM2M(clientId, clientSecret, tenantId);

      // Return token exchange result using the shared TokenExchangeResult type
      const tokenResult: TokenExchangeResult = {
        token: result.token
      };
      res.json(tokenResult);
    } catch (error) {
      logger.error('Error during M2M authentication', error);
      next(new ApiError(401, 'Authentication failed'));
    }
  });

  /**
   * Validate a token and get user information
   *
   * POST /api/auth/validate
   */
  router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!token) {
        throw new ApiError(400, 'Missing required parameter: token');
      }

      // Validate token
      const result = await authService.validateToken(token, tenantId);

      // Return token validation result using the shared TokenValidationResult type
      const validationResult: TokenValidationResult = {
        valid: result.valid,
        user: result.user
      };

      if (result.valid) {
        res.json(validationResult);
      } else {
        res.status(401).json(validationResult);
      }
    } catch (error) {
      logger.error('Error validating token', error);
      next(new ApiError(401, 'Invalid token'));
    }
  });

  /**
   * Check if a user has permission to access a resource
   *
   * POST /api/auth/check
   */
  router.post('/check', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, relation, object, contextualTuples } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!user || !relation || !object) {
        throw new ApiError(400, 'Missing required parameters: user, relation, object');
      }

      // Check permission
      const allowed = await authService.check({
        user,
        relation,
        object,
        contextualTuples,
        tenantId
      });

      // Return permission check result using the shared PermissionCheck type
      const permissionResult: PermissionCheck = {
        allowed
      };
      res.json(permissionResult);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Grant a permission to a user
   *
   * POST /api/auth/grant
   */
  router.post('/grant', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, relation, object } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!user || !relation || !object) {
        throw new ApiError(400, 'Missing required parameters: user, relation, object');
      }

      // Grant permission
      const success = await authService.grant({
        user,
        relation,
        object,
        tenantId
      });

      if (success) {
        // Return success message
        res.json({
          message: 'Permission granted'
        });
      } else {
        throw new ApiError(500, 'Failed to grant permission');
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * Revoke a permission from a user
   *
   * POST /api/auth/revoke
   */
  router.post('/revoke', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, relation, object } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!user || !relation || !object) {
        throw new ApiError(400, 'Missing required parameters: user, relation, object');
      }

      // Revoke permission
      const success = await authService.revoke({
        user,
        relation,
        object,
        tenantId
      });

      if (success) {
        // Return success message
        res.json({
          message: 'Permission revoked'
        });
      } else {
        throw new ApiError(500, 'Failed to revoke permission');
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * Exchange an Auth0 token for a server access token
   *
   * POST /api/auth/exchange-token
   */
  router.post('/exchange-token', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!token) {
        throw new ApiError(400, 'Token is required');
      }

      // Exchange the token
      const serverToken = await tokenExchangeService.exchangeToken(token, tenantId);

      // Return token exchange result using the shared TokenExchangeResult type
      const tokenResult: TokenExchangeResult = {
        token: serverToken
      };
      res.json(tokenResult);
    } catch (error) {
      logger.error('Error exchanging token:', error);
      next(error);
    }
  });

  /**
   * Exchange an Auth0 token for a resource-specific access token
   *
   * POST /api/auth/exchange-token-for-resource
   */
  router.post('/exchange-token-for-resource', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, resource } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!token) {
        throw new ApiError(400, 'Token is required');
      }

      if (!resource) {
        throw new ApiError(400, 'Resource is required');
      }

      // Exchange the token for a resource-specific token
      const resourceToken = await tokenExchangeService.exchangeTokenForResource(token, tenantId, resource);

      // Return token exchange result using the shared TokenExchangeResult type
      const tokenResult: TokenExchangeResult = {
        token: resourceToken
      };
      res.json(tokenResult);
    } catch (error) {
      logger.error('Error exchanging token for resource:', error);
      if (error instanceof Error && error.message === 'Forbidden') {
        next(new ApiError(403, 'Forbidden: You do not have permission to access this resource'));
      } else if (error instanceof Error && error.message === 'Invalid authentication token') {
        next(new ApiError(401, 'Invalid authentication token'));
      } else {
        next(error);
      }
    }
  });

  /**
   * Verify a resource access token
   *
   * POST /api/auth/verify-resource-token
   */
  router.post('/verify-resource-token', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      // Validate request
      if (!token) {
        throw new ApiError(400, 'Token is required');
      }

      // Verify the token
      const decoded = await tokenExchangeService.verifyResourceToken(token);

      // Return resource token verification result using the shared ResourceTokenVerificationResult type
      const verificationResult: ResourceTokenVerificationResult = {
        valid: true,
        userId: decoded.sub,
        tenantId: decoded.tenant,
        resource: decoded.resource
      };
      res.json(verificationResult);
    } catch (error) {
      logger.error('Error verifying resource token:', error);
      next(new ApiError(401, 'Invalid token'));
    }
  });

  /**
   * Register a new user
   *
   * POST /api/auth/register
   */
  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!email || !password) {
        throw new ApiError(400, 'Missing required parameters: email, password');
      }

      // Create user in Auth0
      const auth0UserId = await auth0Service.createUser(email, password);

      // Create internal user record
      const user = {
        id: auth0UserId,
        email,
        tenantId,
        // Add any other required user properties here
      };
      await userService.createUser(user);

      // Return success message
      res.json({
        message: 'User registered successfully'
      });
    } catch (error) {
      logger.error('Error during registration', error);
      next(error);
    }
  });

  /**
   * Authenticate with API key
   *
   * POST /api/auth/login-with-api-key
   */
  router.post('/login-with-api-key', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { apiKey } = req.body;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      // Validate request
      if (!apiKey) {
        throw new ApiError(400, 'Missing required parameter: apiKey');
      }

      // Authenticate with API key
      const result = await authService.authenticateWithApiKey(apiKey, tenantId);

      // Return login response using the shared Login type
      const loginResponse: Login = {
        token: result.token,
        user_id: result.user?.id || '',
        tenant_id: tenantId,
        user: result.user
      };
      res.json(loginResponse);
    } catch (error) {
      logger.error('Error during API key authentication', error);
      next(new ApiError(401, 'Authentication failed'));
    }
  });

  /**
   * Logout
   *
   * POST /api/auth/logout
   */
  router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.body;

      // Validate request
      if (!userId) {
        throw new ApiError(400, 'Missing required parameter: userId');
      }

      // Logout user
      await authService.logout(userId);

      // Return success message
      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Error during logout', error);
      next(new ApiError(500, 'Logout failed'));
    }
  });

  return router;
};
