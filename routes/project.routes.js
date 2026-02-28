/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management APIs
 */

const express = require('express');
const projectRouter = express.Router();

const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  deleteMultipleProjects,
  restoreProject,
  restoreMultipleProjects
} = require('../controllers/project.controller');

const { authenticateUser, requireAdminRole } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');

projectRouter.use(authenticateUser);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
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
 *               role:
 *                 type: string
 *               description:
 *                 type: string
 *               technologies:
 *                 type: array
 *                 items:
 *                   type: string
 *               highlights:
 *                 type: array
 *                 items:
 *                   type: string
 *               teamSize:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isOngoing:
 *                 type: boolean
 *               projectUrl:
 *                 type: string
 *                 format: uri
 *               githubRepo:
 *                 type: string
 *                 format: uri
 *             example:
 *               title: "Portfolio Website"
 *               role: "Frontend Developer"
 *               description: "Built a personal portfolio using React and Tailwind CSS"
 *               technologies: ["React", "Tailwind CSS"]
 *               highlights: ["Mobile responsive", "Dark mode toggle"]
 *               teamSize: 1
 *               startDate: "2023-01-01"
 *               endDate: "2023-03-01"
 *               isOngoing: false
 *               projectUrl: "https://example.com"
 *               githubRepo: "https://github.com/user/repo"
 *     responses:
 *       201:
 *         description: Project created
 */
projectRouter.post('/', tryCatch(createProject));

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects with filters and pagination
 *     tags: [Projects]
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
 *         description: Search by title, role, or description
 *     responses:
 *       200:
 *         description: List of projects
 */
projectRouter.get('/', tryCatch(getAllProjects));

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
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
 *         description: Project found
 *       403:
 *         description: Access denied
 *       404:
 *         description: Project not found
 */
projectRouter.get('/:id', tryCatch(getProjectById));

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             example:
 *               title: "Updated Project Title"
 *               isOngoing: true
 *     responses:
 *       200:
 *         description: Project updated
 */
projectRouter.put('/:id', tryCatch(updateProject));

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project (soft or permanent)
 *     tags: [Projects]
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
 *           type: boolean
 *         description: Set true to permanently delete
 *     responses:
 *       200:
 *         description: Project deleted
 */
projectRouter.delete('/:id', tryCatch(deleteProject));

/**
 * @swagger
 * /projects:
 *   delete:
 *     summary: Delete multiple projects (soft or force)
 *     tags: [Projects]
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
 *               ids: ["projectId1", "projectId2"]
 *               force: false
 *     responses:
 *       200:
 *         description: Projects deleted
 */
projectRouter.delete('/', tryCatch(deleteMultipleProjects));

/**
 * @swagger
 * /projects/{id}/restore:
 *   patch:
 *     summary: Restore a soft-deleted project
 *     tags: [Projects]
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
 *         description: Project restored
 */
projectRouter.patch('/:id/restore', tryCatch(restoreProject));

/**
 * @swagger
 * /projects/restore:
 *   patch:
 *     summary: Restore multiple projects
 *     tags: [Projects]
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
 *               ids: ["projectId1", "projectId2"]
 *     responses:
 *       200:
 *         description: Projects restored
 */
projectRouter.patch('/restore', tryCatch(restoreMultipleProjects));

module.exports = projectRouter;