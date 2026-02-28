const mongoose = require('mongoose');

const resumeAnalyticsSchema = new mongoose.Schema({
    resumeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resume',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    slug: {
        type: String,
        required: true,
        index: true
    },

    // Counters
    totalViews: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    pdfDownloads: { type: Number, default: 0 },

    // Detailed view log — capped to last 500 entries
    viewLog: [{
        viewedAt: { type: Date, default: Date.now },
        ip: { type: String },
        userAgent: { type: String },
        referer: { type: String },
        country: { type: String },
        _id: false
    }],

    // Daily aggregation for chart display
    dailyStats: [{
        date: { type: String }, // "YYYY-MM-DD"
        views: { type: Number, default: 0 },
        uniqueViews: { type: Number, default: 0 },
        pdfDownloads: { type: Number, default: 0 },
        _id: false
    }]
}, { timestamps: true });

// Compound index for fast lookups
resumeAnalyticsSchema.index({ resumeId: 1, userId: 1 }, { unique: true });

/**
 * Record a view event for a resume.
 */
resumeAnalyticsSchema.statics.recordView = async function (resumeId, userId, slug, { ip, userAgent, referer } = {}) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Upsert analytics doc
    let analytics = await this.findOne({ resumeId });

    if (!analytics) {
        analytics = await this.create({
            resumeId,
            userId,
            slug,
            totalViews: 0,
            uniqueViews: 0,
            viewLog: [],
            dailyStats: []
        });
    }

    // Check if this IP already viewed (for unique count)
    const isUnique = ip ? !analytics.viewLog.some(v => v.ip === ip) : true;

    // Increment total views
    analytics.totalViews += 1;
    if (isUnique) analytics.uniqueViews += 1;

    // Add to view log (keep last 500)
    analytics.viewLog.push({
        viewedAt: new Date(),
        ip: ip || 'unknown',
        userAgent: userAgent ? userAgent.substring(0, 200) : undefined,
        referer: referer ? referer.substring(0, 200) : undefined
    });
    if (analytics.viewLog.length > 500) {
        analytics.viewLog = analytics.viewLog.slice(-500);
    }

    // Update daily stats
    const dayStat = analytics.dailyStats.find(d => d.date === today);
    if (dayStat) {
        dayStat.views += 1;
        if (isUnique) dayStat.uniqueViews += 1;
    } else {
        analytics.dailyStats.push({
            date: today,
            views: 1,
            uniqueViews: isUnique ? 1 : 0,
            pdfDownloads: 0
        });
    }

    // Keep last 90 days
    if (analytics.dailyStats.length > 90) {
        analytics.dailyStats = analytics.dailyStats.slice(-90);
    }

    await analytics.save();
    return { totalViews: analytics.totalViews, uniqueViews: analytics.uniqueViews };
};

/**
 * Record a PDF download.
 */
resumeAnalyticsSchema.statics.recordPdfDownload = async function (resumeId) {
    const today = new Date().toISOString().split('T')[0];

    await this.findOneAndUpdate(
        { resumeId },
        {
            $inc: { pdfDownloads: 1 },
            $push: {
                dailyStats: {
                    $each: [],
                    $slice: -90
                }
            }
        }
    );

    // Also update daily stat
    const analytics = await this.findOne({ resumeId });
    if (analytics) {
        const dayStat = analytics.dailyStats.find(d => d.date === today);
        if (dayStat) {
            dayStat.pdfDownloads += 1;
        }
        await analytics.save();
    }
};

const ResumeAnalytics = mongoose.model('ResumeAnalytics', resumeAnalyticsSchema);
module.exports = ResumeAnalytics;
