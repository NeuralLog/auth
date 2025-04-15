import { Router, Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/ApiKeyService';
import { userService } from '../services/UserService';
import { ApiError } from '@neurallog/client-sdk';
import { ApiKeyChallenge, ApiKeyChallengeVerification } from '@neurallog/client-sdk';
import { logger } from '../services/logger';
import { randomBytes } from 'crypto';

// Store challenges in memory (in a real implementation, use Redis or another distributed cache)
const challenges: Map<string, { challenge: string, expiresAt: number }> = new Map();

// Clean up expired challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of challenges.entries()) {
    if (value.expiresAt < now) {
      challenges.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const apiKeyAuthRouter = (apiKeyService: ApiKeyService): Router => {
  const router = Router();

  /**
   * Get a challenge for API key authentication
   *
   * GET /api/auth/api-key-challenge
   */
  router.get('/api-key-challenge', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate a random challenge
      const challenge = randomBytes(32).toString('base64');

      // Set expiration time (5 minutes)
      const expiresAt = Date.now() + (5 * 60 * 1000);

      // Store the challenge
      challenges.set(challenge, { challenge, expiresAt });

      // Return the challenge using the shared ApiKeyChallenge type
      const challengeResponse: ApiKeyChallenge = {
        challenge,
        expiresIn: 300 // 5 minutes in seconds
      };
      res.json(challengeResponse);
    } catch (error) {
      logger.error('Error generating API key challenge', error);
      next(new ApiError(500, 'Failed to generate challenge'));
    }
  });

  /**
   * Verify a challenge response for API key authentication
   *
   * POST /api/auth/verify-api-key-challenge
   */
  router.post('/verify-api-key-challenge', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { challenge, response } = req.body;

      // Validate request
      if (!challenge || !response) {
        throw new ApiError(400, 'Missing required parameters: challenge, response');
      }

      // Check if the challenge exists and is not expired
      const challengeData = challenges.get(challenge);
      if (!challengeData || challengeData.expiresAt < Date.now()) {
        throw new ApiError(400, 'Invalid or expired challenge');
      }

      // Extract the key ID from the response
      const [keyId] = response.split('.');
      if (!keyId) {
        throw new ApiError(400, 'Invalid response format');
      }

      // Get the API key data
      const keyData = await apiKeyService.getApiKeyById(keyId);
      if (!keyData || keyData.revoked) {
        throw new ApiError(401, 'Invalid API key');
      }

      // Import the ZKP API key service
      const { zkpApiKeyService } = await import('../services/zkpApiKeyService');

      // Verify the response
      const isValid = await apiKeyService.verifyApiKeyResponse(challenge, response, keyData.verificationHash);

      if (!isValid) {
        throw new ApiError(401, 'Invalid API key');
      }

      // Delete the challenge
      challenges.delete(challenge);

      // Return the verification result using the shared ApiKeyChallengeVerification type
      const verificationResult: ApiKeyChallengeVerification = {
        valid: true,
        userId: keyData.userId,
        tenantId: keyData.tenantId,
        scopes: keyData.scopes
      };
      res.json(verificationResult);
    } catch (error) {
      logger.error('Error verifying API key challenge', error);
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(new ApiError(500, 'Failed to verify challenge'));
      }
    }
  });

  return router;
};
