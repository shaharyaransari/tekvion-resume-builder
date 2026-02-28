/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Application settings management (Admin only)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AppSetting:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         key:
 *           type: string
 *           example: "initial_credits"
 *         value:
 *           oneOf:
 *             - type: string
 *             - type: number
 *             - type: boolean
 *             - type: object
 *           example: 10
 *         description:
 *           type: string
 *           example: "Number of free credits given to new users"
 *         category:
 *           type: string
 *           enum: [credits, ai, general]
 *           example: "credits"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const express = require('express');
const settingsRouter = express.Router();
const {
    getAllSettings,
    getSettingByKey,
    createSetting,
    updateSetting,
    deleteSetting
} = require('../controllers/appSettings.controller');
const { authenticateUser, requireAdminRole } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');

// Public route — no auth required
settingsRouter.get('/app-name', tryCatch(require('../controllers/appSettings.controller').getAppName));

// All routes below require admin auth
settingsRouter.use(authenticateUser, requireAdminRole);

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get all application settings
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *           enum: [credits, ai, general]
 *         description: Filter settings by category
 *     responses:
 *       200:
 *         description: List of settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 settings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AppSetting'
 */
settingsRouter.get('/', tryCatch(getAllSettings));

/**
 * @swagger
 * /settings/{key}:
 *   get:
 *     summary: Get a single setting by key
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key (e.g. initial_credits, credits_per_resume, ai_provider)
 *     responses:
 *       200:
 *         description: Setting found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppSetting'
 *       404:
 *         description: Setting not found
 */
settingsRouter.get('/:key', tryCatch(getSettingByKey));

/**
 * @swagger
 * /settings:
 *   post:
 *     summary: Create a new setting
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - value
 *             properties:
 *               key:
 *                 type: string
 *                 example: "max_resumes_per_user"
 *               value:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: boolean
 *                 example: 50
 *               description:
 *                 type: string
 *                 example: "Maximum resumes a user can create"
 *               category:
 *                 type: string
 *                 enum: [credits, ai, general]
 *                 example: "general"
 *     responses:
 *       201:
 *         description: Setting created
 *       409:
 *         description: Setting with this key already exists
 */
settingsRouter.post('/', tryCatch(createSetting));

/**
 * @swagger
 * /settings/{key}:
 *   put:
 *     summary: Update a setting value
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Setting key to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *                   - type: boolean
 *                 example: 20
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *           examples:
 *             changeInitialCredits:
 *               summary: Change initial credits to 20
 *               value:
 *                 value: 20
 *             changeAIProvider:
 *               summary: Switch AI provider
 *               value:
 *                 value: "anthropic"
 *                 description: "Switched to Anthropic Claude"
 *     responses:
 *       200:
 *         description: Setting updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 setting:
 *                   $ref: '#/components/schemas/AppSetting'
 *                 previousValue:
 *                   description: The value before update
 *       404:
 *         description: Setting not found
 */
settingsRouter.put('/:key', tryCatch(updateSetting));

/**
 * @swagger
 * /settings/{key}:
 *   delete:
 *     summary: Delete a setting
 *     tags: [Settings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Setting deleted
 *       404:
 *         description: Setting not found
 */
settingsRouter.delete('/:key', tryCatch(deleteSetting));

module.exports = settingsRouter;
