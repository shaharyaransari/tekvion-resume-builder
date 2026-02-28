/**
 * @swagger
 * tags:
 *   name: MasterData
 *   description: Master list of skills and languages for autocomplete & selection
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MasterDataItem:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [skill, language]
 *           example: "skill"
 *         name:
 *           type: string
 *           example: "JavaScript"
 *         category:
 *           type: string
 *           example: "Programming"
 *         isActive:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const express = require('express');
const masterDataRouter = express.Router();
const {
    listMasterData,
    getCategories,
    createMasterData,
    bulkCreateMasterData,
    updateMasterData,
    deleteMasterData,
    bulkDeleteMasterData
} = require('../controllers/masterData.controller');
const { authenticateUser, requireAdminRole } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');

// ─── Public routes (any authenticated user) ──────────────────────────────────

/**
 * @swagger
 * /master-data:
 *   get:
 *     summary: List skills or languages with search & filtering
 *     tags: [MasterData]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [skill, language]
 *         description: Type of data to list
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name (case-insensitive)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (skills only)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (admin only)
 *     responses:
 *       200:
 *         description: Paginated list of items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MasterDataItem'
 */
masterDataRouter.get('/', authenticateUser, tryCatch(listMasterData));

/**
 * @swagger
 * /master-data/categories:
 *   get:
 *     summary: Get all distinct categories for a type
 *     tags: [MasterData]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [skill, language]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 */
masterDataRouter.get('/categories', authenticateUser, tryCatch(getCategories));

// ─── Admin-only routes ───────────────────────────────────────────────────────

/**
 * @swagger
 * /master-data:
 *   post:
 *     summary: Create a single skill or language (Admin)
 *     tags: [MasterData]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, name]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [skill, language]
 *               name:
 *                 type: string
 *                 example: "GraphQL"
 *               category:
 *                 type: string
 *                 example: "Backend"
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MasterDataItem'
 *       409:
 *         description: Duplicate name
 */
masterDataRouter.post('/', authenticateUser, requireAdminRole, tryCatch(createMasterData));

/**
 * @swagger
 * /master-data/bulk:
 *   post:
 *     summary: Bulk create skills or languages (Admin)
 *     tags: [MasterData]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, items]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [skill, language]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name]
 *                   properties:
 *                     name:
 *                       type: string
 *                     category:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                 example:
 *                   - name: "GraphQL"
 *                     category: "Backend"
 *                   - name: "gRPC"
 *                     category: "Backend"
 *     responses:
 *       201:
 *         description: Bulk creation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 inserted:
 *                   type: integer
 *                 skipped:
 *                   type: array
 *                   items:
 *                     type: string
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MasterDataItem'
 */
masterDataRouter.post('/bulk', authenticateUser, requireAdminRole, tryCatch(bulkCreateMasterData));

/**
 * @swagger
 * /master-data/{id}:
 *   put:
 *     summary: Update a skill or language (Admin)
 *     tags: [MasterData]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated item
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MasterDataItem'
 *       404:
 *         description: Item not found
 *       409:
 *         description: Duplicate name
 */
masterDataRouter.put('/:id', authenticateUser, requireAdminRole, tryCatch(updateMasterData));

/**
 * @swagger
 * /master-data/{id}:
 *   delete:
 *     summary: Delete a skill or language (Admin)
 *     tags: [MasterData]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Item not found
 */
masterDataRouter.delete('/:id', authenticateUser, requireAdminRole, tryCatch(deleteMasterData));

/**
 * @swagger
 * /master-data/delete-multiple:
 *   post:
 *     summary: Bulk delete skills or languages (Admin)
 *     tags: [MasterData]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Bulk deletion result
 */
masterDataRouter.post('/delete-multiple', authenticateUser, requireAdminRole, tryCatch(bulkDeleteMasterData));

module.exports = masterDataRouter;
