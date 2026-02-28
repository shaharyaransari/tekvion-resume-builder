/**
 * @swagger
 * tags:
 *   name: InitialTemplates
 *   description: Admin-managed resume HTML templates
 */

const express = require('express');
const initialTemplateRouter = express.Router();

const {
  createInitialTemplate,
  getAllInitialTemplates,
  getInitialTemplateById,
  previewInitialTemplate,
  deleteInitialTemplate,
  updateInitialTemplate
} = require('../controllers/initialTemplate.controller');

const { authenticateUser, requireAdminRole } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');
const createUploader = require('../utils/multer');

// Multer uploader for HTML and preview image
const uploader = createUploader({
  destination: 'admin-assets/initial-templates',
  filenameField: 'name'
});

// ── Public routes (no auth required) ────────────────────────────────────────

/**
 * @swagger
 * /initial-templates/{id}/preview:
 *   get:
 *     summary: Preview a template rendered with sample data (returns HTML)
 *     tags: [InitialTemplates]
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Rendered HTML preview
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Template not found
 */
initialTemplateRouter.get('/:id/preview', tryCatch(previewInitialTemplate));

// ── Protected routes ────────────────────────────────────────────────────────

initialTemplateRouter.use(authenticateUser);

/**
 * @swagger
 * /initial-templates:
 *   post:
 *     summary: Create a new initial template (Admin only)
 *     tags: [InitialTemplates]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - title
 *               - htmlFile
 *             properties:
 *               name:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               htmlFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Validation error or missing file
 */
initialTemplateRouter.post('/', requireAdminRole, uploader.fields([{ name: 'htmlFile', maxCount: 1 }]), tryCatch(createInitialTemplate));

/**
 * @swagger
 * /initial-templates/{id}:
 *   delete:
 *     summary: Delete an initial template (Admin only)
 *     tags: [InitialTemplates]
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
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 */
initialTemplateRouter.delete('/:id', requireAdminRole, tryCatch(deleteInitialTemplate));

/**
 * @swagger
 * /initial-templates/{id}:
 *   put:
 *     summary: Update an initial template (Admin only)
 *     tags: [InitialTemplates]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               htmlFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       404:
 *         description: Template not found
 */
initialTemplateRouter.put(
  '/:id',
  requireAdminRole,
  uploader.fields([
    { name: 'htmlFile', maxCount: 1 }
  ]),
  tryCatch(updateInitialTemplate)
);

/**
 * @swagger
 * /initial-templates:
 *   get:
 *     summary: Get all initial templates (public)
 *     tags: [InitialTemplates]
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
 *         description: Filter by title or description
 *     responses:
 *       200:
 *         description: List of templates
 */
initialTemplateRouter.get('/', tryCatch(getAllInitialTemplates));

// Note: /:id/preview route is defined above (public, no auth required)

/**
 * @swagger
 * /initial-templates/{id}:
 *   get:
 *     summary: Get a single initial template by ID (public)
 *     tags: [InitialTemplates]
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         description: Template not found
 */
initialTemplateRouter.get('/:id', tryCatch(getInitialTemplateById));

module.exports = initialTemplateRouter;