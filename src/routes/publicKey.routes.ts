import { Router } from 'express';
import { PublicKeyController } from '../controllers/PublicKey.controller';
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const publicKeyController = new PublicKeyController();

/**
 * @swagger
 * /users/me/publicKey:
 *   post:
 *     summary: Upload a public key
 *     description: Upload a public key for the current user
 *     tags: [PublicKey]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publicKey
 *             properties:
 *               publicKey:
 *                 type: string
 *                 description: The public key as a base64 string
 *               purpose:
 *                 type: string
 *                 description: The purpose of the key (e.g., 'admin-promotion')
 *                 default: 'admin-promotion'
 *     responses:
 *       200:
 *         description: Public key uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/users/me/publicKey',
  authMiddleware,
  publicKeyController.uploadPublicKey
);

/**
 * @swagger
 * /users/{userId}/publicKey:
 *   get:
 *     summary: Get a user's public key
 *     description: Get a user's public key by user ID
 *     tags: [PublicKey]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *       - in: query
 *         name: purpose
 *         schema:
 *           type: string
 *         description: The purpose of the key (e.g., 'admin-promotion')
 *         default: 'admin-promotion'
 *     responses:
 *       200:
 *         description: Public key retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Public key not found
 *       500:
 *         description: Server error
 */
router.get(
  '/users/:userId/publicKey',
  authMiddleware,
  publicKeyController.getUserPublicKey
);

export default router;
