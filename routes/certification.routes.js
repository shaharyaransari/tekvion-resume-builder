/**
 * @swagger
 * tags:
 *   name: Certifications
 *   description: Manage user certifications
 */

const express = require('express');
const {
  createCertification,
  getAllCertifications,
  getCertificationById,
  updateCertification,
  deleteCertification,
  deleteMultipleCertifications,
  restoreCertification,
  restoreMultipleCertifications
} = require('../controllers/certification.controller');

const { authenticateUser } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');

const certificationRouter = express.Router();

certificationRouter.use(authenticateUser);

/**
 * @swagger
 * tags:
 *   name: Certifications
 *   description: Manage certifications for resumes
 */

/**
 * @swagger
 * /certifications:
 *   post:
 *     summary: Create a new certification
 *     tags: [Certifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               issuingOrganization:
 *                 type: string
 *               issueDate:
 *                 type: string
 *                 format: date
 *               expirationDate:
 *                 type: string
 *                 format: date
 *               doesNotExpire:
 *                 type: boolean
 *               credentialId:
 *                 type: string
 *               credentialUrl:
 *                 type: string
 *             example:
 *               name: "AWS Certified Developer"
 *               issuingOrganization: "Amazon"
 *               issueDate: "2022-10-01"
 *               expirationDate: "2024-10-01"
 *               doesNotExpire: false
 *               credentialId: "ABC-123"
 *               credentialUrl: "https://example.com/verify"
 *     responses:
 *       201:
 *         description: Certification created
 */
certificationRouter.post('/', tryCatch(createCertification));

/**
 * @swagger
 * /certifications:
 *   get:
 *     summary: Get all certifications of the current user
 *     tags: [Certifications]
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
 *         description: Search by name or organization
 *     responses:
 *       200:
 *         description: List of certifications
 */
certificationRouter.get('/', tryCatch(getAllCertifications));

/**
 * @swagger
 * /certifications/{id}:
 *   get:
 *     summary: Get certification by ID
 *     tags: [Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Certification ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certification found
 *       403:
 *         description: Access denied
 *       404:
 *         description: Not found
 */
certificationRouter.get('/:id', tryCatch(getCertificationById));

/**
 * @swagger
 * /certifications/{id}:
 *   put:
 *     summary: Update a certification
 *     tags: [Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Certification ID
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             example:
 *               name: "Updated Certification"
 *               issuingOrganization: "Google"
 *               credentialId: "DEF-456"
 *               doesNotExpire: true
 *     responses:
 *       200:
 *         description: Certification updated
 */
certificationRouter.put('/:id', tryCatch(updateCertification));

/**
 * @swagger
 * /certifications/{id}:
 *   delete:
 *     summary: Soft or force delete a certification
 *     tags: [Certifications]
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
 *         description: Certification deleted
 */
certificationRouter.delete('/:id', tryCatch(deleteCertification));

/**
 * @swagger
 * /certifications:
 *   delete:
 *     summary: Soft or force delete multiple certifications
 *     tags: [Certifications]
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
 *               ids: ["id1", "id2"]
 *               force: true
 *     responses:
 *       200:
 *         description: Certifications deleted
 */
certificationRouter.delete('/', tryCatch(deleteMultipleCertifications));

/**
 * @swagger
 * /certifications:
 *   post:
 *     summary: Restore multiple deleted certifications
 *     tags: [Certifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
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
 *             example:
 *               ids: ["cert1", "cert2"]
 *     responses:
 *       200:
 *         description: Certifications restored
 */
certificationRouter.post('/restore', tryCatch(restoreMultipleCertifications));

/**
 * @swagger
 * /certifications/{id}/restore:
 *   post:
 *     summary: Restore a deleted certification
 *     tags: [Certifications]
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
 *         description: Certification restored
 */
certificationRouter.post('/:id/restore', tryCatch(restoreCertification));

module.exports = certificationRouter;