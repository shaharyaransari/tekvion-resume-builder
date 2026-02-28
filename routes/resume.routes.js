/**
 * @swagger
 * tags:
 *   name: Resumes
 *   description: Resume management APIs
 */

const express = require('express');
const resumeRouter = express.Router();
const {
  createResume,
  getAllResumes,
  getResumeById,
  updateResume,
  deleteResume,
  deleteMultipleResumes,
  restoreResume,
  restoreMultipleResumes,
  generateResumeData,
  regenerateTitle,
  regenerateSummary,
  enforceVisibility
} = require('../controllers/resume.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');

resumeRouter.use(authenticateUser);

/**
 * @swagger
 * /resumes/generate-resume-data:
 *   post:
 *     summary: Generate AI-assisted resume data from user profile and job description
 *     tags: [Resumes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Target job description
 *               title:
 *                 type: string
 *                 description: Optional resume title override
 *               useAI:
 *                 type: boolean
 *                 default: true
 *                 description: Set false to skip AI and return all data for manual selection
 *             example:
 *               description: "Looking for a Senior Full Stack Developer with React and Node.js experience..."
 *               title: "Senior Developer Resume"
 *               useAI: true
 *     responses:
 *       200:
 *         description: Generated resume data (AI or manual)
 *       400:
 *         description: Job description is required
 *       503:
 *         description: AI service temporarily unavailable
 */
resumeRouter.post('/generate-resume-data', tryCatch(generateResumeData));

/**
 * @swagger
 * /resumes/regenerate-title:
 *   post:
 *     summary: Regenerate resume title with AI
 *     tags: [Resumes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobDescription
 *             properties:
 *               jobDescription:
 *                 type: string
 *               currentTitle:
 *                 type: string
 *               customInstructions:
 *                 type: string
 *     responses:
 *       200:
 *         description: Regenerated title
 */
resumeRouter.post('/regenerate-title', tryCatch(regenerateTitle));

/**
 * @swagger
 * /resumes/regenerate-summary:
 *   post:
 *     summary: Regenerate resume professional summary with AI
 *     tags: [Resumes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobDescription
 *             properties:
 *               jobDescription:
 *                 type: string
 *               currentSummary:
 *                 type: string
 *               customInstructions:
 *                 type: string
 *     responses:
 *       200:
 *         description: Regenerated summary
 */
resumeRouter.post('/regenerate-summary', tryCatch(regenerateSummary));
/**
 * @swagger
 * /resumes:
 *   post:
 *     summary: Create a new resume (deducts credits)
 *     description: Creates a resume from selected profile data. Deducts credits (configurable via admin settings). Returns 402 if insufficient credits.
 *     tags: [Resumes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               summary:
 *                 type: string
 *               jobDescription:
 *                 type: string
 *                 description: The target job description this resume is tailored for
 *               educations:
 *                 type: array
 *                 items: { type: string }
 *               experiences:
 *                 type: array
 *                 items: { type: string }
 *               projects:
 *                 type: array
 *                 items: { type: string }
 *               certifications:
 *                 type: array
 *                 items: { type: string }
 *               awards:
 *                 type: array
 *                 items: { type: string }
 *               selectedSkills:
 *                 type: array
 *                 items: { type: string }
 *               selectedLanguages:
 *                 type: array
 *                 items: { type: string }
 *               selectedSocialMedia:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [LinkedIn, Twitter, GitHub, Facebook, Instagram, Portfolio, Other]
 *               customFields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     label:
 *                       type: string
 *                     value:
 *                       type: string
 *                     icon:
 *                       type: string
 *                     category:
 *                       type: string
 *               visibility:
 *                 type: string
 *                 enum: [private, public]
 *             example:
 *               title: "Software Engineer Resume"
 *               summary: "A resume showcasing my skills and projects"
 *               jobDescription: "Looking for a full-stack developer with React and Node.js..."
 *               selectedSkills: ["JavaScript", "Node.js"]
 *               visibility: "public"
 *     responses:
 *       201:
 *         description: Resume created successfully (includes creditsDeducted and creditsRemaining)
 *       402:
 *         description: Insufficient credits
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Insufficient credits. Required: 1, Available: 0"
 *                 creditsRequired:
 *                   type: number
 *                 creditsAvailable:
 *                   type: number
 */
resumeRouter.post('/', tryCatch(createResume));

/**
 * @swagger
 * /resumes:
 *   get:
 *     summary: Get all resumes for the logged-in user (with pagination and search)
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer }
 *       - name: limit
 *         in: query
 *         schema: { type: integer }
 *       - name: search
 *         in: query
 *         schema: { type: string }
 *         description: Filter by title or summary
 *     responses:
 *       200:
 *         description: List of resumes
 */
resumeRouter.get('/', tryCatch(getAllResumes));

/**
 * @swagger
 * /resumes/{id}:
 *   get:
 *     summary: Get a single resume by ID
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Resume details
 *       403:
 *         description: Access denied
 *       404:
 *         description: Resume not found
 */
resumeRouter.get('/:id', tryCatch(getResumeById));

/**
 * @swagger
 * /resumes/{id}:
 *   put:
 *     summary: Update a resume
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             example:
 *               title: "Updated Resume Title"
 *               visibility: "private"
 *     responses:
 *       200:
 *         description: Resume updated
 */
resumeRouter.put('/:id', tryCatch(updateResume));

/**
 * @swagger
 * /resumes/{id}:
 *   delete:
 *     summary: Delete a resume (soft or permanent)
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: force
 *         in: query
 *         schema: { type: boolean }
 *         description: Set true for permanent delete
 *     responses:
 *       200:
 *         description: Resume deleted
 */
resumeRouter.delete('/:id', tryCatch(deleteResume));

/**
 * @swagger
 * /resumes/bulk-delete:
 *   post:
 *     summary: Delete multiple resumes (soft or force)
 *     tags: [Resumes]
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
 *                 items: { type: string }
 *               force:
 *                 type: boolean
 *             example:
 *               ids: ["resumeId1", "resumeId2"]
 *               force: false
 *     responses:
 *       200:
 *         description: Resumes deleted
 */
resumeRouter.post('/bulk-delete', tryCatch(deleteMultipleResumes));

/**
 * @swagger
 * /resumes/restore/{id}:
 *   patch:
 *     summary: Restore a soft-deleted resume
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Resume restored
 */
resumeRouter.patch('/restore/:id', tryCatch(restoreResume));

/**
 * @swagger
 * /resumes/restore:
 *   post:
 *     summary: Restore multiple resumes
 *     tags: [Resumes]
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
 *                 items: { type: string }
 *             example:
 *               ids: ["resumeId1", "resumeId2"]
 *     responses:
 *       200:
 *         description: Resumes restored
 */
resumeRouter.post('/restore', tryCatch(restoreMultipleResumes));

/**
 * @swagger
 * /resumes/enforce-visibility:
 *   post:
 *     summary: Privatize public resumes if user has no active subscription
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of resumes privatized
 */
resumeRouter.post('/enforce-visibility', tryCatch(enforceVisibility));

module.exports = resumeRouter;