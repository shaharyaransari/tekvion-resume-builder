const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Stripe references
    stripeSessionId: { type: String, index: true },
    stripePaymentIntentId: { type: String },
    stripeSubscriptionId: { type: String },
    stripeInvoiceId: { type: String },

    // Transaction type
    type: {
        type: String,
        enum: ['credit_purchase', 'credit_usage', 'subscription_payment', 'subscription_renewal', 'refund'],
        required: true
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },

    // Amount
    amount: { type: Number, required: true },           // In major currency units (e.g. dollars)
    currency: { type: String, default: 'usd' },

    // Credit-specific
    creditsAdded: { type: Number, default: 0 },
    creditsDeducted: { type: Number, default: 0 },

    // Subscription-specific
    plan: { type: String, enum: ['monthly', 'yearly', null], default: null },

    // Metadata
    description: { type: String },
    stripeEventType: { type: String },                   // The Stripe event that created/updated this
    metadata: { type: mongoose.Schema.Types.Mixed },     // Raw Stripe metadata

    isDeleted: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Indexes
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });

/**
 * Get all transactions for a user (paginated).
 */
transactionSchema.statics.getUserTransactions = async function (userId, { page = 1, limit = 20, type } = {}) {
    const skip = (page - 1) * limit;
    const filter = { userId, isDeleted: false };
    if (type) filter.type = type;
    const [transactions, total] = await Promise.all([
        this.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        this.countDocuments(filter)
    ]);

    return {
        transactions,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
};

module.exports = mongoose.model('Transaction', transactionSchema);
