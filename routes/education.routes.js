/**
 * @swagger
 * tags:
 *   name: Educations
 *   description: Education history management
 */
const express = require('express');
const educationRouter = express.Router();
const educationController = require('../controllers/education.controller');
const { authenticateUser, requireAdminRole } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');

/**
 * @swagger
 * /educations:
 *   post:
 *     summary: Create a new education record
 *     tags: [Educations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - institution
 *               - degree
 *               - fieldOfStudy
 *               - startDate
 *             properties:
 *               institution:
 *                 type: string
 *               degree:
 *                 type: string
 *               fieldOfStudy:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               grade:
 *                 type: string
 *               description:
 *                 type: string
 *             example:
 *               institution: "Harvard University"
 *               degree: "Bachelor of Computer Science"
 *               fieldOfStudy: "Software Engineering"
 *               startDate: "2015-09-01"
 *               endDate: "2019-06-15"
 *               grade: "A"
 *               description: "Focused on algorithms and AI"
 *     responses:
 *       201:
 *         description: Education created
 */
educationRouter.post('/', authenticateUser, tryCatch(educationController.createEducation));

/**
 * @swagger
 * /educations:
 *   get:
 *     summary: Get all education records (with pagination and search)
 *     tags: [Educations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by institution, degree, or field
 *     responses:
 *       200:
 *         description: List of education records
 */
educationRouter.get('/', authenticateUser, tryCatch(educationController.getAllEducations));

/**
 * @swagger
 * /educations/{id}:
 *   get:
 *     summary: Get a single education record by ID
 *     tags: [Educations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Education ID
 *     responses:
 *       200:
 *         description: Education record found
 *       403:
 *         description: Access denied
 *       404:
 *         description: Education not found
 */
educationRouter.get('/:id', authenticateUser, tryCatch(educationController.getEducationById));

/**
 * @swagger
 * /educations/{id}:
 *   put:
 *     summary: Update an education record
 *     tags: [Educations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Education ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               institution: "MIT"
 *               degree: "Master of Science"
 *               fieldOfStudy: "Data Science"
 *               startDate: "2020-01-01"
 *               endDate: "2022-01-01"
 *               grade: "A+"
 *               description: "Thesis on machine learning"
 *     responses:
 *       200:
 *         description: Education updated
 */
educationRouter.put('/:id', authenticateUser, tryCatch(educationController.updateEducation));

/**
 * @swagger
 * /educations/{id}:
 *   delete:
 *     summary: Delete a single education record (soft or force)
 *     tags: [Educations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Education ID
 *       - name: force
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *         description: If true, force deletes the record
 *     responses:
 *       200:
 *         description: Education deleted
 */
educationRouter.delete('/:id', authenticateUser, tryCatch(educationController.deleteEducation));

/**
 * @swagger
 * /educations/bulk-delete:
 *   post:
 *     summary: Bulk delete education records
 *     tags: [Educations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               force:
 *                 type: boolean
 *             example:
 *               ids: ["eduId1", "eduId2"]
 *               force: false
 *     responses:
 *       200:
 *         description: Education records deleted
 */
educationRouter.post('/bulk-delete', authenticateUser, tryCatch(educationController.deleteMultipleEducations));

/**
 * @swagger
 * /educations/restore/{id}:
 *   post:
 *     summary: Restore a soft-deleted education record by ID
 *     tags: [Educations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Education restored
 */
educationRouter.post('/restore/:id', authenticateUser, tryCatch(educationController.restoreEducation));

/**
 * @swagger
 * /educations/bulk-restore:
 *   post:
 *     summary: Restore multiple soft-deleted education records
 *     tags: [Educations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               ids: ["eduId1", "eduId2"]
 *     responses:
 *       200:
 *         description: Educations restored
 */
educationRouter.post('/bulk-restore', authenticateUser, tryCatch(educationController.restoreMultipleEducations));

module.exports = educationRouter;
