const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Stripe references
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String, unique: true, sparse: true },

    plan: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: true
    },

    status: {
        type: String,
        enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete', 'expired'],
        default: 'incomplete'
    },

    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // Feature flags derived from subscription
    features: {
        publicResumes: { type: Boolean, default: true },
        resumeAnalytics: { type: Boolean, default: true },
        salaryEstimation: { type: Boolean, default: true }
    }
}, { timestamps: true });

/**
 * Check if subscription is currently active (or trialing).
 */
subscriptionSchema.methods.isActive = function () {
    return ['active', 'trialing'].includes(this.status) &&
        this.currentPeriodEnd > new Date();
};

/**
 * Static: get active subscription for a user (if any).
 */
subscriptionSchema.statics.getActiveForUser = async function (userId) {
    return this.findOne({
        userId,
        status: { $in: ['active', 'trialing'] },
        currentPeriodEnd: { $gt: new Date() }
    });
};

/**
 * Static: check if user has an active subscription.
 */
subscriptionSchema.statics.isUserSubscribed = async function (userId) {
    const sub = await this.getActiveForUser(userId);
    return !!sub;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
