import { Router } from 'express';
import { KEKVersionController } from '../controllers/KEKVersionController';
import { authMiddleware, permissionMiddleware } from '../middleware/AuthMiddleware';

const router = Router();
const kekVersionController = new KEKVersionController();

/**
 * @swagger
 * /kek/versions:
 *   get:
 *     summary: Get all KEK versions for the tenant
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of KEK versions
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/versions', authMiddleware, kekVersionController.getKEKVersions);

/**
 * @swagger
 * /kek/versions:
 *   post:
 *     summary: Create a new KEK version
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for creating the new version
 *     responses:
 *       201:
 *         description: KEK version created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/versions', authMiddleware, permissionMiddleware('admin', 'kek'), kekVersionController.createKEKVersion);

/**
 * @swagger
 * /kek/rotate:
 *   post:
 *     summary: Rotate KEK
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for rotation
 *               removed_users:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to remove
 *     responses:
 *       201:
 *         description: KEK rotated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/rotate', authMiddleware, permissionMiddleware('admin', 'kek'), kekVersionController.rotateKEK);

/**
 * @swagger
 * /kek/versions/{id}/status:
 *   put:
 *     summary: Update KEK version status
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: KEK version ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, decrypt-only, deprecated]
 *                 description: New status
 *     responses:
 *       200:
 *         description: KEK version status updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: KEK version not found
 *       500:
 *         description: Server error
 */
router.put('/versions/:id/status', authMiddleware, permissionMiddleware('admin', 'kek'), kekVersionController.updateKEKVersionStatus);

/**
 * @swagger
 * /kek/versions/active:
 *   get:
 *     summary: Get active KEK version for the tenant
 *     tags: [KEK]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active KEK version
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active KEK version found
 *       500:
 *         description: Server error
 */
router.get('/versions/active', authMiddleware, kekVersionController.getActiveKEKVersion);

export default router;
