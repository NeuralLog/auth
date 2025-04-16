/**
 * KEK Recovery Service
 */

import { db } from '../db';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';
// Define the types locally until they are properly exported from the client-sdk
interface KekRecoverySession {
  id: string;
  versionId: string;
  initiatedBy: string;
  tenantId: string;
  threshold: number;
  reason: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  shares: any[];
  createdAt: string;
  expiresAt: string;
}

interface KekRecoveryResult {
  sessionId: string;
  versionId: string;
  newVersionId: string;
  status: 'completed';
  completedAt: string;
}

import { SerializedSecretShare } from '@neurallog/client-sdk/dist/types/api';
import { RedisKEKService } from './RedisKEKService';

/**
 * KEK Recovery Service
 */
export class KEKRecoveryService {
  // Redis key prefixes
  private readonly RECOVERY_SESSION_PREFIX = 'kek-recovery:session:';
  private readonly TENANT_RECOVERY_SESSIONS_PREFIX = 'tenants:';
  private kekService: RedisKEKService;

  /**
   * Constructor
   */
  constructor() {
    this.kekService = RedisKEKService.getInstance();
  }

  /**
   * Initiate KEK version recovery
   *
   * @param userId User ID initiating the recovery
   * @param versionId KEK version ID to recover
   * @param threshold Number of shares required for recovery
   * @param reason Reason for recovery
   * @param tenantId Tenant ID
   * @param expiresIn Expiration time in seconds (optional)
   * @returns The created recovery session
   */
  async initiateKEKRecovery(
    userId: string,
    versionId: string,
    threshold: number,
    reason: string,
    tenantId: string,
    expiresIn?: number
  ): Promise<KekRecoverySession> {
    try {
      // Check if the KEK version exists
      const kekVersion = await this.kekService.getKEKVersion(tenantId, versionId);
      if (!kekVersion) {
        throw new Error('KEK version not found');
      }

      // Check if the user is authorized to initiate recovery
      // This would typically involve checking if the user is an admin
      // For now, we'll just check if the user is in the same tenant
      if (kekVersion.tenantId !== tenantId) {
        throw new Error('Not authorized to recover this KEK version');
      }

      // Create recovery session
      const sessionId = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (expiresIn || 86400) * 1000); // Default to 24 hours

      const session: KekRecoverySession = {
        id: sessionId,
        versionId,
        initiatedBy: userId,
        tenantId,
        threshold,
        reason,
        status: 'pending',
        shares: [],
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      // Store recovery session in Redis
      const key = `${this.RECOVERY_SESSION_PREFIX}${sessionId}`;
      await db.setJSON(key, session);

      // Add recovery session to tenant
      await db.sadd(`${this.TENANT_RECOVERY_SESSIONS_PREFIX}${tenantId}:recovery-sessions`, key);

      logger.info('Initiated KEK recovery', { userId, versionId, tenantId, sessionId });

      return session;
    } catch (error) {
      logger.error('Error initiating KEK recovery', { error, userId, versionId, tenantId });
      throw error;
    }
  }

  /**
   * Get KEK recovery session
   *
   * @param sessionId Recovery session ID
   * @returns Recovery session or null if not found
   */
  async getKEKRecoverySession(sessionId: string): Promise<KekRecoverySession | null> {
    try {
      // Get recovery session from Redis
      const key = `${this.RECOVERY_SESSION_PREFIX}${sessionId}`;
      const session = await db.getJSON<KekRecoverySession>(key);

      // Check if the session has expired
      if (session && session.status === 'pending') {
        const expiresAt = new Date(session.expiresAt);
        if (expiresAt < new Date()) {
          // Update session status to expired
          session.status = 'expired';
          await db.setJSON(key, session);
        }
      }

      return session;
    } catch (error) {
      logger.error('Error getting KEK recovery session', { error, sessionId });
      return null;
    }
  }

  /**
   * Submit a recovery share
   *
   * @param userId User ID submitting the share
   * @param sessionId Recovery session ID
   * @param share The recovery share
   * @param encryptedFor User ID for whom the share is encrypted
   * @returns The updated recovery session
   */
  async submitRecoveryShare(
    userId: string,
    sessionId: string,
    share: SerializedSecretShare,
    encryptedFor: string
  ): Promise<KekRecoverySession> {
    try {
      // Get the recovery session
      const session = await this.getKEKRecoverySession(sessionId);
      if (!session) {
        throw new Error('Recovery session not found');
      }

      // Check if the session is still pending
      if (session.status !== 'pending') {
        throw new Error(`Recovery session is ${session.status}`);
      }

      // Check if the user has already submitted a share
      const existingShareIndex = session.shares.findIndex((s: any) => s.userId === userId);
      if (existingShareIndex >= 0) {
        throw new Error('User has already submitted a share');
      }

      // Add the share to the session
      session.shares.push({
        userId,
        submittedAt: new Date().toISOString()
      });

      // Store the share in Redis
      // Note: In a real implementation, the share would be encrypted for the target user
      // and stored securely. For simplicity, we're just storing the user ID.
      const shareKey = `${this.RECOVERY_SESSION_PREFIX}${sessionId}:share:${userId}`;
      await db.setJSON(shareKey, {
        share,
        encryptedFor
      });

      // Update the session in Redis
      const sessionKey = `${this.RECOVERY_SESSION_PREFIX}${sessionId}`;
      await db.setJSON(sessionKey, session);

      logger.info('Submitted recovery share', { userId, sessionId, encryptedFor });

      return session;
    } catch (error) {
      logger.error('Error submitting recovery share', { error, userId, sessionId });
      throw error;
    }
  }

  /**
   * Complete KEK recovery
   *
   * @param userId User ID completing the recovery
   * @param sessionId Recovery session ID
   * @param recoveredKEK The recovered KEK (encrypted with the user's public key)
   * @param newKEKVersion Information about the new KEK version
   * @returns The recovery result
   */
  async completeKEKRecovery(
    userId: string,
    sessionId: string,
    recoveredKEK: string,
    newKEKVersion: { id: string, reason: string }
  ): Promise<KekRecoveryResult> {
    try {
      // Get the recovery session
      const session = await this.getKEKRecoverySession(sessionId);
      if (!session) {
        throw new Error('Recovery session not found');
      }

      // Check if the session is still pending
      if (session.status !== 'pending') {
        throw new Error(`Recovery session is ${session.status}`);
      }

      // Check if enough shares have been submitted
      if (session.shares.length < session.threshold) {
        throw new Error(`Not enough shares submitted (${session.shares.length}/${session.threshold})`);
      }

      // Update the session status
      session.status = 'completed';
      const sessionKey = `${this.RECOVERY_SESSION_PREFIX}${sessionId}`;
      await db.setJSON(sessionKey, session);

      // Create the recovery result
      const result: KekRecoveryResult = {
        sessionId,
        versionId: session.versionId,
        newVersionId: newKEKVersion.id,
        status: 'completed',
        completedAt: new Date().toISOString()
      };

      // Store the recovery result
      const resultKey = `${this.RECOVERY_SESSION_PREFIX}${sessionId}:result`;
      await db.setJSON(resultKey, result);

      logger.info('Completed KEK recovery', { userId, sessionId, newVersionId: newKEKVersion.id });

      return result;
    } catch (error) {
      logger.error('Error completing KEK recovery', { error, userId, sessionId });
      throw error;
    }
  }

  /**
   * Get all recovery sessions for a tenant
   *
   * @param tenantId Tenant ID
   * @returns Array of recovery sessions
   */
  async getRecoverySessionsForTenant(tenantId: string): Promise<KekRecoverySession[]> {
    try {
      // Get all recovery session keys for the tenant
      const keys = await db.smembers(`${this.TENANT_RECOVERY_SESSIONS_PREFIX}${tenantId}:recovery-sessions`);

      // Get recovery session details for each key
      const sessions: KekRecoverySession[] = [];

      for (const key of keys) {
        const session = await db.getJSON<KekRecoverySession>(key);
        if (session) {
          // Check if the session has expired
          if (session.status === 'pending') {
            const expiresAt = new Date(session.expiresAt);
            if (expiresAt < new Date()) {
              // Update session status to expired
              session.status = 'expired';
              await db.setJSON(key, session);
            }
          }

          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Error getting recovery sessions for tenant', { error, tenantId });
      return [];
    }
  }
}

export const kekRecoveryService = new KEKRecoveryService();
