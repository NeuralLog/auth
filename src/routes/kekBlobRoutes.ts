import { Router } from 'express';
import { KEKBlobController } from '../controllers/KEKBlobController';
import { authMiddleware, permissionMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const kekBlobController = new KEKBlobController();

/**
 * @swagger
 * /kek/blobs/users/{userId}/versions/{versionId}:
 *   get:
 *     summary: Get KEK blob for a user and version
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *         description: KEK version ID
 *     responses:
 *       200:
 *         description: KEK blob
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: KEK blob not found
 *       500:
 *         description: Server error
 */
router.get('/blobs/users/:userId/versions/:versionId', authMiddleware, permissionMiddleware('admin', 'kek'), kekBlobController.getKEKBlob);

/**
 * @swagger
 * /kek/blobs/users/{userId}:
 *   get:
 *     summary: Get all KEK blobs for a user
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of KEK blobs
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/blobs/users/:userId', authMiddleware, permissionMiddleware('admin', 'kek'), kekBlobController.getUserKEKBlobs);

/**
 * @swagger
 * /kek/blobs:
 *   post:
 *     summary: Provision a KEK blob for a user
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
 *               - user_id
 *               - kek_version_id
 *               - encrypted_blob
 *             properties:
 *               user_id:
 *                 type: string
 *                 description: User ID
 *               kek_version_id:
 *                 type: string
 *                 description: KEK version ID
 *               encrypted_blob:
 *                 type: string
 *                 description: Encrypted KEK blob
 *     responses:
 *       201:
 *         description: KEK blob provisioned
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: KEK version not found
 *       500:
 *         description: Server error
 */
router.post('/blobs', authMiddleware, permissionMiddleware('admin', 'kek'), kekBlobController.provisionKEKBlob);

/**
 * @swagger
 * /kek/blobs/users/{userId}/versions/{versionId}:
 *   delete:
 *     summary: Delete a KEK blob
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *         description: KEK version ID
 *     responses:
 *       204:
 *         description: KEK blob deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: KEK blob not found
 *       500:
 *         description: Server error
 */
router.delete('/blobs/users/:userId/versions/:versionId', authMiddleware, permissionMiddleware('admin', 'kek'), kekBlobController.deleteKEKBlob);

/**
 * @swagger
 * /kek/blobs/me:
 *   get:
 *     summary: Get KEK blobs for the current user
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of KEK blobs for the current user
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/blobs/me', authMiddleware, kekBlobController.getCurrentUserKEKBlobs);

export default router;
