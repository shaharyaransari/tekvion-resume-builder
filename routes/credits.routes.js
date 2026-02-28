/**
 * @swagger
 * tags:
 *   name: Credits
 *   description: Credit management system for users
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreditBalance:
 *       type: object
 *       properties:
 *         credits:
 *           type: number
 *           description: Current credit balance
 *           example: 100
 *     CreditUpdateRequest:
 *       type: object
 *       required:
 *         - userId
 *         - credits
 *         - operation
 *       properties:
 *         userId:
 *           type: string
 *           description: ID of the user whose credits need to be updated
 *           example: "685e3f46d8198df230ef1c1b"
 *         credits:
 *           type: number
 *           description: Amount of credits to add, subtract, or set
 *           minimum: 0
 *           example: 50
 *         operation:
 *           type: string
 *           description: Type of credit operation to perform
 *           enum: [add, subtract, set]
 *           example: "add"
 *     CreditUpdateResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Credits updated successfully"
 *         credits:
 *           type: number
 *           description: New credit balance
 *           example: 150
 *         previousCredits:
 *           type: number
 *           description: Credit balance before update
 *           example: 100
 *         operation:
 *           type: string
 *           enum: [add, subtract, set]
 *           example: "add"
 */

const express = require('express');
const creditsRouter = express.Router();
const { authenticateUser, requireAdminRole } = require('../middlewares/auth.middleware');
const { getCredits, updateCredits, getCreditHistory } = require('../controllers/credits.controller');
const tryCatch = require('../utils/tryCatch');

/**
 * @swagger
 * /credits/balance:
 *   get:
 *     summary: Get user's credit balance
 *     description: Retrieves the current credit balance for the authenticated user
 *     tags: [Credits]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current credit balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreditBalance'
 *       401:
 *         description: Unauthorized - User not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
creditsRouter.get('/balance', authenticateUser, tryCatch(getCredits));

/**
 * @swagger
 * /credits/history:
 *   get:
 *     summary: Get credit history
 *     description: Returns the authenticated user's credit usage and addition history (paginated)
 *     tags: [Credits]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [usage, addition, initial, admin_adjustment, purchase, refund]
 *     responses:
 *       200:
 *         description: Credit history with pagination
 *       401:
 *         description: Unauthorized
 */
creditsRouter.get('/history', authenticateUser, tryCatch(getCreditHistory));

/**
 * @swagger
 * /credits/update:
 *   post:
 *     summary: Update user credits
 *     description: Allows administrators to modify a user's credit balance
 *     tags: [Credits]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreditUpdateRequest'
 *     responses:
 *       200:
 *         description: Credits updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreditUpdateResponse'
 *       400:
 *         description: Invalid request body or operation would result in negative credits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid operation or insufficient credits"
 *       401:
 *         description: Unauthorized - User not authenticated
 *       403:
 *         description: Forbidden - User is not an admin
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
creditsRouter.post('/update', authenticateUser, requireAdminRole, tryCatch(updateCredits));

module.exports = creditsRouter;