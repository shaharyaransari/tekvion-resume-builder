/**
 * @swagger
 * tags:
 *   name: Experiences
 *   description: Manage professional experiences
 */

const express = require('express');
const experienceRouter = express.Router();
const {
  createExperience,
  getAllExperiences,
  getExperienceById,
  updateExperience,
  deleteExperience,
  deleteMultipleExperiences,
  restoreExperience,
  restoreMultipleExperiences
} = require('../controllers/experience.controller');

const { authenticateUser } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');

experienceRouter.use(authenticateUser);

/**
 * @swagger
 * /experiences:
 *   post:
 *     summary: Create a new experience
 *     tags: [Experiences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobTitle
 *               - company
 *             properties:
 *               jobTitle:
 *                 type: string
 *               company:
 *                 type: string
 *               location:
 *                 type: string
 *               companyLogo:
 *                 type: string
 *                 format: uri
 *               employmentType:
 *                 type: string
 *                 enum: [Full-time, Part-time, Contract, Internship, Freelance, Temporary, Self-employed]
 *               industry:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isCurrent:
 *                 type: boolean
 *               description:
 *                 type: string
 *               achievements:
 *                 type: array
 *                 items:
 *                   type: string
 *               technologiesUsed:
 *                 type: array
 *                 items:
 *                   type: string
 *             example:
 *               jobTitle: "Software Engineer"
 *               company: "Google"
 *               location: "Mountain View, CA"
 *               companyLogo: "https://example.com/logo.png"
 *               employmentType: "Full-time"
 *               industry: "Tech"
 *               startDate: "2021-01-01"
 *               endDate: "2023-01-01"
 *               isCurrent: false
 *               description: "Worked on frontend and backend"
 *               achievements: ["Promoted to Team Lead", "Delivered key projects"]
 *               technologiesUsed: ["Node.js", "React"]
 *     responses:
 *       201:
 *         description: Experience created
 */
experienceRouter.post('/', tryCatch(createExperience));

/**
 * @swagger
 * /experiences:
 *   get:
 *     summary: Get all experiences for the current user
 *     tags: [Experiences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by jobTitle, company or description
 *     responses:
 *       200:
 *         description: List of experiences
 */
experienceRouter.get('/', tryCatch(getAllExperiences));

/**
 * @swagger
 * /experiences/{id}:
 *   get:
 *     summary: Get a single experience by ID
 *     tags: [Experiences]
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
 *         description: Experience found
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not found
 */
experienceRouter.get('/:id', tryCatch(getExperienceById));

/**
 * @swagger
 * /experiences/{id}:
 *   put:
 *     summary: Update an experience
 *     tags: [Experiences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             example:
 *               jobTitle: "Senior Developer"
 *               company: "Meta"
 *               isCurrent: true
 *     responses:
 *       200:
 *         description: Experience updated
 */
experienceRouter.put('/:id', tryCatch(updateExperience));

/**
 * @swagger
 * /experiences/{id}:
 *   delete:
 *     summary: Soft or permanently delete an experience
 *     tags: [Experiences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: force
 *         in: query
 *         required: false
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Experience deleted
 */
experienceRouter.delete('/:id', tryCatch(deleteExperience));

/**
 * @swagger
 * /experiences:
 *   delete:
 *     summary: Soft or force delete multiple experiences
 *     tags: [Experiences]
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
 *               force:
 *                 type: boolean
 *             example:
 *               ids: ["exp1", "exp2"]
 *               force: false
 *     responses:
 *       200:
 *         description: Experiences deleted
 */
experienceRouter.delete('/', tryCatch(deleteMultipleExperiences));

/**
 * @swagger
 * /experiences/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted experience
 *     tags: [Experiences]
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
 *         description: Experience restored
 */
experienceRouter.patch('/:id/restore', tryCatch(restoreExperience));

/**
 * @swagger
 * /experiences/restore:
 *   patch:
 *     summary: Restore multiple deleted experiences
 *     tags: [Experiences]
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
 *               ids: ["exp1", "exp2"]
 *     responses:
 *       200:
 *         description: Experiences restored
 */
experienceRouter.patch('/restore', tryCatch(restoreMultipleExperiences));

module.exports = experienceRouter;