/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Resume view analytics (subscriber feature)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ResumeAnalyticsSummary:
 *       type: object
 *       properties:
 *         totalResumes:
 *           type: integer
 *         totals:
 *           type: object
 *           properties:
 *             totalViews:
 *               type: integer
 *             uniqueViews:
 *               type: integer
 *             pdfDownloads:
 *               type: integer
 *         analytics:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               resumeId:
 *                 type: string
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               totalViews:
 *                 type: integer
 *               uniqueViews:
 *                 type: integer
 *               pdfDownloads:
 *                 type: integer
 *     ResumeAnalyticsDetail:
 *       type: object
 *       properties:
 *         resumeId:
 *           type: string
 *         slug:
 *           type: string
 *         totalViews:
 *           type: integer
 *         uniqueViews:
 *           type: integer
 *         pdfDownloads:
 *           type: integer
 *         dailyStats:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               views:
 *                 type: integer
 *               uniqueViews:
 *                 type: integer
 *               pdfDownloads:
 *                 type: integer
 *         recentViews:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               viewedAt:
 *                 type: string
 *                 format: date-time
 *               referer:
 *                 type: string
 *               country:
 *                 type: string
 */

const express = require('express');
const analyticsRouter = express.Router();
const { authenticateUser } = require('../middlewares/auth.middleware');
const { requireSubscription, requireFeature } = require('../middlewares/subscription.middleware');
const tryCatch = require('../utils/tryCatch');
const {
    getResumeAnalytics,
    getAllResumeAnalytics,
    getResumeAnalyticsSummary
} = require('../controllers/resumeAnalytics.controller');

/**
 * @swagger
 * /analytics/resumes:
 *   get:
 *     summary: Get analytics for all public resumes
 *     description: Returns analytics summary for all user's public resumes (subscriber only)
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResumeAnalyticsSummary'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Subscription required
 */
analyticsRouter.get(
    '/resumes',
    authenticateUser,
    requireSubscription,
    requireFeature('resumeAnalytics'),
    tryCatch(getAllResumeAnalytics)
);

/**
 * @swagger
 * /analytics/resumes/{resumeId}:
 *   get:
 *     summary: Get analytics for a specific resume
 *     description: Returns detailed analytics for a specific resume (subscriber only)
 *     tags: [Analytics]
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
 *         description: Detailed analytics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResumeAnalyticsDetail'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Subscription required
 *       404:
 *         description: Resume not found
 */
analyticsRouter.get(
    '/resumes/:resumeId',
    authenticateUser,
    requireSubscription,
    requireFeature('resumeAnalytics'),
    tryCatch(getResumeAnalytics)
);

/**
 * @swagger
 * /analytics/resumes/{resumeId}/summary:
 *   get:
 *     summary: Get basic analytics summary for a resume
 *     description: Returns basic view counts for a resume. Available to all authenticated users (frontend handles subscriber gating for detailed data).
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resumeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Basic analytics summary
 *       404:
 *         description: Resume not found
 *       401:
 *         description: Unauthorized
 */
analyticsRouter.get(
    '/resumes/:resumeId/summary',
    authenticateUser,
    tryCatch(getResumeAnalyticsSummary)
);

module.exports = analyticsRouter;
