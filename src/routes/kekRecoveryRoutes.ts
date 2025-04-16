import { Router } from 'express';
import { kekRecoveryController } from '../controllers/KEKRecoveryController';
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

/**
 * @swagger
 * /kek/recovery:
 *   post:
 *     summary: Initiate KEK version recovery
 *     description: Initiate the recovery process for a KEK version
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - versionId
 *               - threshold
 *               - reason
 *             properties:
 *               versionId:
 *                 type: string
 *                 description: KEK version ID to recover
 *               threshold:
 *                 type: integer
 *                 description: Number of shares required for recovery
 *               reason:
 *                 type: string
 *                 description: Reason for recovery
 *               expiresIn:
 *                 type: integer
 *                 description: Expiration time in seconds
 *     responses:
 *       201:
 *         description: Recovery session created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: KEK version not found
 *       500:
 *         description: Server error
 */
router.post(
  '/kek/recovery',
  authMiddleware,
  kekRecoveryController.initiateKEKRecovery
);

/**
 * @swagger
 * /kek/recovery/{sessionId}:
 *   get:
 *     summary: Get KEK recovery session
 *     description: Get details of a KEK recovery session
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recovery session ID
 *     responses:
 *       200:
 *         description: Recovery session retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Recovery session not found
 *       500:
 *         description: Server error
 */
router.get(
  '/kek/recovery/:sessionId',
  authMiddleware,
  kekRecoveryController.getKEKRecoverySession
);

/**
 * @swagger
 * /kek/recovery/{sessionId}/shares:
 *   post:
 *     summary: Submit a recovery share
 *     description: Submit a share for KEK recovery
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recovery session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - share
 *               - encryptedFor
 *             properties:
 *               share:
 *                 type: object
 *                 description: The recovery share
 *                 required:
 *                   - x
 *                   - y
 *                 properties:
 *                   x:
 *                     type: integer
 *                     description: The x-coordinate of the share
 *                   y:
 *                     type: string
 *                     description: The y-coordinate of the share (the actual share value) as a Base64 string
 *               encryptedFor:
 *                 type: string
 *                 description: User ID for whom the share is encrypted
 *     responses:
 *       200:
 *         description: Share submitted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Recovery session not found
 *       500:
 *         description: Server error
 */
router.post(
  '/kek/recovery/:sessionId/shares',
  authMiddleware,
  kekRecoveryController.submitRecoveryShare
);

/**
 * @swagger
 * /kek/recovery/{sessionId}/complete:
 *   post:
 *     summary: Complete KEK recovery
 *     description: Complete the KEK recovery process
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Recovery session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recoveredKEK
 *               - newKEKVersion
 *             properties:
 *               recoveredKEK:
 *                 type: string
 *                 description: The recovered KEK (encrypted with the user's public key)
 *               newKEKVersion:
 *                 type: object
 *                 description: Information about the new KEK version
 *                 required:
 *                   - id
 *                   - reason
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: New KEK version ID
 *                   reason:
 *                     type: string
 *                     description: Reason for the new KEK version
 *     responses:
 *       200:
 *         description: KEK recovery completed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Recovery session not found
 *       500:
 *         description: Server error
 */
router.post(
  '/kek/recovery/:sessionId/complete',
  authMiddleware,
  kekRecoveryController.completeKEKRecovery
);

export default router;
