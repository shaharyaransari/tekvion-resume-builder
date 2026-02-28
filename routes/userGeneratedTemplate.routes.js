
/**
 * @swagger
 * tags:
 *   name: UserGeneratedTemplates
 *   description: Manage user-customized resume templates (HTML/PDF/Preview)
 */

const express = require('express');
const userGeneratedTemplateRouter = express.Router();
const controller = require('../controllers/userGeneratedTemplate.controller');
const tryCatch = require('../utils/tryCatch');
const { authenticateUser } = require('../middlewares/auth.middleware');

userGeneratedTemplateRouter.use(authenticateUser);

/**
 * @swagger
 * /user-generated-templates:
 *   get:
 *     summary: Get all user-generated templates
 *     tags: [UserGeneratedTemplates]
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
 *         description: Search by resume title or slug
 *     responses:
 *       200:
 *         description: List of templates
 */

userGeneratedTemplateRouter.get('/', tryCatch(controller.getUserTemplates));

/**
 * @swagger
 * /user-generated-templates:
 *   post:
 *     summary: Create or update a user-generated resume template
 *     tags: [UserGeneratedTemplates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resumeId
 *               - html
 *             properties:
 *               resumeId:
 *                 type: string
 *               html:
 *                 type: string
 *             example:
 *               resumeId: "60f83a8c0e984c001f0e7a4e"
 *               html: "<html><body><h1>My Resume</h1></body></html>"
 *     responses:
 *       200:
 *         description: Template created or updated
 *       400:
 *         description: Validation error
 */

userGeneratedTemplateRouter.post('/', tryCatch(controller.createOrUpdateUserGeneratedTemplate));

/**
 * @swagger
 * /user-generated-templates/render-preview:
 *   get:
 *     summary: Preview a template rendered with a resume's data (without saving)
 *     tags: [UserGeneratedTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: initialTemplateId
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         description: ID of the admin template to render
 *       - name: resumeId
 *         in: query
 *         required: true
 *         schema: { type: string }
 *         description: ID of the resume to use as data source
 *     responses:
 *       200:
 *         description: Rendered HTML
 *         content:
 *           text/html:
 *             schema: { type: string }
 *       400:
 *         description: Missing required query params
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Template or resume not found
 */
userGeneratedTemplateRouter.get('/render-preview', tryCatch(controller.renderPreview));

/**
 * @swagger
 * /user-generated-templates/resume/{resumeId}:
 *   get:
 *     summary: Get all generated templates for a specific resume
 *     tags: [UserGeneratedTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: resumeId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of templates for this resume
 */
userGeneratedTemplateRouter.get('/resume/:resumeId', tryCatch(controller.getByResumeId));

/**
 * @swagger
 * /user-generated-templates/{id}:
 *   get:
 *     summary: Get a single template by ID (metadata only)
 *     tags: [UserGeneratedTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Template metadata
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 */
userGeneratedTemplateRouter.get('/:id', tryCatch(controller.getTemplateById));

/**
 * @swagger
 * /user-generated-templates/{id}/files/{type}:
 *   get:
 *     summary: Serve template files securely (owner or admin only)
 *     tags: [UserGeneratedTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: type
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [html, preview, pdf]
 *       - name: token
 *         in: query
 *         schema: { type: string }
 *         description: JWT token (alternative to Bearer auth, for img src / direct links)
 *     responses:
 *       200:
 *         description: File content
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
userGeneratedTemplateRouter.get('/:id/files/:type', tryCatch(controller.serveFile));

/**
 * @swagger
 * /user-generated-templates/{id}/generate-pdf:
 *   post:
 *     summary: Generate PDF and preview image for a template
 *     tags: [UserGeneratedTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF and preview generated
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 */
userGeneratedTemplateRouter.post('/:id/generate-pdf', tryCatch(controller.generatePDFforTemplate));

/**
 * @swagger
 * /user-generated-templates/{id}/regenerate:
 *   put:
 *     summary: Regenerate a template with latest resume data
 *     tags: [UserGeneratedTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Template regenerated with latest data
 *       400:
 *         description: Template was created with raw HTML and cannot be regenerated
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 */
userGeneratedTemplateRouter.put('/:id/regenerate', tryCatch(controller.regenerateTemplate));

/**
 * @swagger
 * /user-generated-templates/{id}:
 *   delete:
 *     summary: Delete a template (soft or permanent)
 *     tags: [UserGeneratedTemplates]
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
 *         description: true = permanent delete
 *     responses:
 *       200:
 *         description: Template deleted
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 */

userGeneratedTemplateRouter.delete('/:id', tryCatch(controller.deleteTemplate));

/**
 * @swagger
 * /user-generated-templates/{id}/restore:
 *   post:
 *     summary: Restore a soft-deleted template
 *     tags: [UserGeneratedTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Template restored
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: Template not found or not deleted
 */
userGeneratedTemplateRouter.post('/:id/restore', tryCatch(controller.restoreTemplate)); // Restore route

module.exports = userGeneratedTemplateRouter;