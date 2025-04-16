import { Router } from 'express';
import { publicKeyController } from '../controllers/PublicKeyController';
import { authMiddleware } from '../middleware/AuthMiddleware';

const router = Router();

/**
 * @swagger
 * /public-keys:
 *   post:
 *     summary: Register a public key
 *     description: Register a new public key for the current user
 *     tags: [Public Keys]
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
 *               - purpose
 *             properties:
 *               publicKey:
 *                 type: string
 *                 description: Public key data (Base64-encoded)
 *               purpose:
 *                 type: string
 *                 description: Purpose of the public key (e.g., 'admin-promotion')
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       201:
 *         description: Public key registered successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/public-keys',
  authMiddleware,
  publicKeyController.registerPublicKey
);

/**
 * @swagger
 * /public-keys/{userId}:
 *   get:
 *     summary: Get a user's public key
 *     description: Get a user's public key by user ID
 *     tags: [Public Keys]
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
 *         description: Purpose of the public key
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
  '/public-keys/:userId',
  authMiddleware,
  publicKeyController.getPublicKey
);

/**
 * @swagger
 * /public-keys/{keyId}:
 *   put:
 *     summary: Update a public key
 *     description: Update an existing public key
 *     tags: [Public Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The public key ID
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
 *                 description: Public key data (Base64-encoded)
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       200:
 *         description: Public key updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Public key not found
 *       500:
 *         description: Server error
 */
router.put(
  '/public-keys/:keyId',
  authMiddleware,
  publicKeyController.updatePublicKey
);

/**
 * @swagger
 * /public-keys/{keyId}:
 *   delete:
 *     summary: Revoke a public key
 *     description: Revoke an existing public key
 *     tags: [Public Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *         description: The public key ID
 *     responses:
 *       204:
 *         description: Public key revoked successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Public key not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/public-keys/:keyId',
  authMiddleware,
  publicKeyController.revokePublicKey
);

/**
 * @swagger
 * /public-keys/verify:
 *   post:
 *     summary: Verify ownership of a public key
 *     description: Verify that a user owns a public key by signing a challenge
 *     tags: [Public Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keyId
 *               - challenge
 *               - signature
 *             properties:
 *               keyId:
 *                 type: string
 *                 description: Public key ID
 *               challenge:
 *                 type: string
 *                 description: Challenge to sign
 *               signature:
 *                 type: string
 *                 description: Signature of the challenge
 *     responses:
 *       200:
 *         description: Public key verified successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Public key not found
 *       500:
 *         description: Server error
 */
router.post(
  '/public-keys/verify',
  authMiddleware,
  publicKeyController.verifyPublicKey
);

export default router;
