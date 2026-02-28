const ResumeAnalytics = require('../models/resumeAnalytics.model');
const Resume = require('../models/resume.model');
const logger = require('../utils/logger');

/**
 * Get analytics for a specific resume (subscriber only).
 */
exports.getResumeAnalytics = async (req, res) => {
    try {
        const resume = await Resume.findOne({
            _id: req.params.resumeId,
            userId: req.user._id,
            isDeleted: false
        });

        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }

        const analytics = await ResumeAnalytics.findOne({ resumeId: resume._id });

        if (!analytics) {
            return res.json({
                resumeId: resume._id,
                slug: resume.slug,
                totalViews: 0,
                uniqueViews: 0,
                pdfDownloads: 0,
                dailyStats: [],
                message: 'No analytics data yet. Make your resume public to start tracking views.'
            });
        }

        res.json({
            resumeId: analytics.resumeId,
            slug: analytics.slug,
            totalViews: analytics.totalViews,
            uniqueViews: analytics.uniqueViews,
            pdfDownloads: analytics.pdfDownloads,
            dailyStats: analytics.dailyStats.slice(-30), // Last 30 days
            recentViews: analytics.viewLog.slice(-20) // Last 20 views
        });
    } catch (err) {
        logger.error(`Get resume analytics failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
};

/**
 * Get analytics summary for all user's resumes (subscriber only).
 */
exports.getAllResumeAnalytics = async (req, res) => {
    try {
        const resumes = await Resume.find({
            userId: req.user._id,
            isDeleted: false,
            visibility: 'public'
        }).select('_id title slug');

        if (resumes.length === 0) {
            return res.json({
                totalResumes: 0,
                analytics: [],
                message: 'No public resumes found. Set a resume to public to start tracking.'
            });
        }

        const resumeIds = resumes.map(r => r._id);
        const analyticsData = await ResumeAnalytics.find({ resumeId: { $in: resumeIds } });

        // Map analytics to resumes
        const analyticsMap = {};
        analyticsData.forEach(a => {
            analyticsMap[a.resumeId.toString()] = a;
        });

        const analytics = resumes.map(resume => {
            const data = analyticsMap[resume._id.toString()];
            return {
                resumeId: resume._id,
                title: resume.title,
                slug: resume.slug,
                totalViews: data ? data.totalViews : 0,
                uniqueViews: data ? data.uniqueViews : 0,
                pdfDownloads: data ? data.pdfDownloads : 0
            };
        });

        // Calculate totals
        const totals = analytics.reduce((acc, a) => ({
            totalViews: acc.totalViews + a.totalViews,
            uniqueViews: acc.uniqueViews + a.uniqueViews,
            pdfDownloads: acc.pdfDownloads + a.pdfDownloads
        }), { totalViews: 0, uniqueViews: 0, pdfDownloads: 0 });

        res.json({
            totalResumes: resumes.length,
            totals,
            analytics
        });
    } catch (err) {
        logger.error(`Get all resume analytics failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
};

/**
 * Get basic analytics summary for a resume (available to all authenticated users).
 * Returns only aggregate counts, not detailed view logs.
 */
exports.getResumeAnalyticsSummary = async (req, res) => {
    try {
        const resume = await Resume.findOne({
            _id: req.params.resumeId,
            userId: req.user._id,
            isDeleted: false
        });

        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }

        const analytics = await ResumeAnalytics.findOne({ resumeId: resume._id });

        res.json({
            resumeId: resume._id,
            slug: resume.slug,
            visibility: resume.visibility,
            totalViews: analytics ? analytics.totalViews : 0,
            uniqueViews: analytics ? analytics.uniqueViews : 0,
            pdfDownloads: analytics ? analytics.pdfDownloads : 0
        });
    } catch (err) {
        logger.error(`Get resume analytics summary failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to retrieve analytics summary' });
    }
};
