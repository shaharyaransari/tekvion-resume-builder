/**
 * @swagger
 * components:
 *   schemas:
 *     Award:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 64d5d1f1e4a8a7b4b3c9a1c2
 *         userId:
 *           type: string
 *           example: 64d5d1f1e4a8a7b4b3c9a1c1
 *         title:
 *           type: string
 *           example: Best Developer
 *         issuer:
 *           type: string
 *           example: TechConf
 *         date:
 *           type: string
 *           format: date
 *           example: 2023-11-01
 *         description:
 *           type: string
 *           example: Awarded for outstanding code practices.
 *         isDeleted:
 *           type: boolean
 *           example: false
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: null
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

const express = require('express');
const awardRouter = express.Router();
const {
  createAward,
  getAllAwards,
  getAwardById,
  updateAward,
  deleteAward,
  deleteMultipleAwards,
  restoreAward,
  restoreMultipleAwards
} = require('../controllers/award.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');

awardRouter.use(authenticateUser);

/**
 * @swagger
 * /awards:
 *   post:
 *     summary: Create a new award
 *     tags: [Awards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               issuer:
 *                 type: string
 *                 maxLength: 100
 *                 nullable: true
 *               date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 nullable: true
 *             example:
 *               title: Best Developer
 *               issuer: TechConf
 *               date: 2023-11-01
 *               description: Awarded for outstanding code practices
 *     responses:
 *       201:
 *         description: Award created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Award'
 *       400:
 *         description: Validation error
 */
awardRouter.post('/', tryCatch(createAward));

/**
 * @swagger
 * /awards:
 *   get:
 *     summary: Get all awards of the logged-in user
 *     tags: [Awards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Page number (default: 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Results per page (default: 10)"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by award title
 *     responses:
 *       200:
 *         description: Paginated list of awards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 awards:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Award'
 */
awardRouter.get('/', tryCatch(getAllAwards));

/**
 * @swagger
 * /awards/{id}:
 *   get:
 *     summary: Get a specific award by ID
 *     tags: [Awards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Award ID
 *     responses:
 *       200:
 *         description: Award found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Award'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Award not found
 */
awardRouter.get('/:id', tryCatch(getAwardById));

/**
 * @swagger
 * /awards/{id}:
 *   put:
 *     summary: Update an award
 *     tags: [Awards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Award ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               issuer:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Award updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Award'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 *       404:
 *         description: Award not found
 */
awardRouter.put('/:id', tryCatch(updateAward));

/**
 * @swagger
 * /awards/{id}:
 *   delete:
 *     summary: Soft delete or permanently delete an award
 *     tags: [Awards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: force
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: "Set to 'true' for permanent delete, otherwise soft delete"
 *     responses:
 *       200:
 *         description: Award deleted successfully
 */
awardRouter.delete('/:id', tryCatch(deleteAward));

/**
 * @swagger
 * /awards/bulk-delete:
 *   post:
 *     summary: Soft delete or permanently delete multiple awards
 *     tags: [Awards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               force:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Bulk deletion completed
 */
awardRouter.post('/bulk-delete', tryCatch(deleteMultipleAwards));

/**
 * @swagger
 * /awards/restore/{id}:
 *   patch:
 *     summary: Restore a soft-deleted award
 *     tags: [Awards]
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
 *         description: Award restored successfully
 */
awardRouter.patch('/restore/:id', tryCatch(restoreAward));

/**
 * @swagger
 * /awards/restore:
 *   post:
 *     summary: Restore multiple soft-deleted awards
 *     tags: [Awards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Bulk restore completed
 */
awardRouter.post('/restore', tryCatch(restoreMultipleAwards));

module.exports = awardRouter;