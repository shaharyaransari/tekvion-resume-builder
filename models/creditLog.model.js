const mongoose = require('mongoose');

const creditLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Type of credit event
    type: {
        type: String,
        enum: ['usage', 'addition', 'initial', 'admin_adjustment', 'purchase', 'refund'],
        required: true
    },

    // Action that caused this event (for usage type)
    action: {
        type: String,
        default: null
    },

    // Number of credits (always positive — type determines direction)
    credits: {
        type: Number,
        required: true,
        min: 0
    },

    // Balance after this event
    balanceAfter: {
        type: Number,
        default: null
    },

    // Human-readable description
    description: {
        type: String,
        required: true
    },

    // Extra data
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
creditLogSchema.index({ createdAt: -1 });
creditLogSchema.index({ userId: 1, createdAt: -1 });
creditLogSchema.index({ type: 1 });

/**
 * Get credit history for a user (paginated).
 */
creditLogSchema.statics.getUserHistory = async function (userId, { page = 1, limit = 20, type } = {}) {
    const skip = (page - 1) * limit;
    const filter = { userId };
    if (type) filter.type = type;

    const [logs, total] = await Promise.all([
        this.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(filter)
    ]);

    return {
        logs,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

module.exports = mongoose.model('CreditLog', creditLogSchema);
