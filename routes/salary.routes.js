/**
 * @swagger
 * tags:
 *   name: Salary
 *   description: AI-powered salary estimation and hiring chance analysis (subscriber feature)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SalaryEstimationRequest:
 *       type: object
 *       required:
 *         - jobDescription
 *       properties:
 *         jobDescription:
 *           type: string
 *           minLength: 10
 *           maxLength: 5000
 *           description: The job description to analyze
 *           example: "Senior Full Stack Developer with 5+ years experience in React, Node.js..."
 *         country:
 *           type: string
 *           description: Target country for salary estimation
 *           example: "United States"
 *           default: "United States"
 *     SalaryEstimationResponse:
 *       type: object
 *       properties:
 *         jobDescription:
 *           type: string
 *           description: Truncated job description
 *         country:
 *           type: string
 *         salaryEstimate:
 *           type: object
 *           properties:
 *             low:
 *               type: number
 *               description: Lower end of salary range
 *             high:
 *               type: number
 *               description: Upper end of salary range
 *             currency:
 *               type: string
 *               description: ISO 4217 currency code
 *             period:
 *               type: string
 *               example: "yearly"
 *             country:
 *               type: string
 *         hiringChance:
 *           type: object
 *           properties:
 *             percentage:
 *               type: integer
 *               minimum: 0
 *               maximum: 100
 *             level:
 *               type: string
 *               enum: [High, Medium, Low]
 *             factors:
 *               type: object
 *         suggestions:
 *           type: array
 *           items:
 *             type: string
 */

const express = require('express');
const salaryRouter = express.Router();
const { authenticateUser } = require('../middlewares/auth.middleware');
const { requireSubscription, requireFeature } = require('../middlewares/subscription.middleware');
const tryCatch = require('../utils/tryCatch');
const { estimateSalary, estimateSalaryForResume } = require('../controllers/salary.controller');

/**
 * @swagger
 * /salary/estimate:
 *   post:
 *     summary: Estimate salary and hiring chance
 *     description: Uses AI to estimate market salary range and hiring chance percentage based on job description and user profile (subscriber only)
 *     tags: [Salary]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SalaryEstimationRequest'
 *     responses:
 *       200:
 *         description: Salary estimation results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalaryEstimationResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Subscription required
 */
salaryRouter.post(
    '/estimate',
    authenticateUser,
    requireSubscription,
    requireFeature('salaryEstimation'),
    tryCatch(estimateSalary)
);

/**
 * @swagger
 * /salary/estimate/resume/{resumeId}:
 *   get:
 *     summary: Estimate salary for a specific resume
 *     description: Uses the resume's job description and user's country to estimate salary range and hiring chance. Available to all authenticated users (frontend handles subscriber gating).
 *     tags: [Salary]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema:
 *           type: string
 *         description: The resume ID
 *     responses:
 *       200:
 *         description: Salary estimation results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SalaryEstimationResponse'
 *       400:
 *         description: Resume has no job description
 *       404:
 *         description: Resume not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Subscription required
 */
salaryRouter.get(
    '/estimate/resume/:resumeId',
    authenticateUser,
    requireSubscription,
    requireFeature('salaryEstimation'),
    tryCatch(estimateSalaryForResume)
);

module.exports = salaryRouter;
