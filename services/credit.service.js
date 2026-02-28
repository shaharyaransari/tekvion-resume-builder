const User = require('../models/user.model');
const AppSettings = require('../models/appSettings.model');
const CreditLog = require('../models/creditLog.model');
const logger = require('../utils/logger');

/**
 * Human-readable labels for credit actions.
 */
const actionLabels = {
    resume_creation: 'Resume Generation',
    job_post_cover_letter: 'Job Post Cover Letter',
    upwork_estimate: 'Upwork Estimate',
    upwork_proposal: 'Upwork Proposal',
    fiverr_estimate: 'Fiverr Estimate',
    fiverr_proposal: 'Fiverr Proposal',
};

/**
 * Map action keys to their AppSettings cost keys.
 */
const costMap = {
    resume_creation: 'credits_per_resume',
    job_post_cover_letter: 'credits_per_job_post_cover_letter',
    upwork_estimate: 'credits_per_upwork_estimate',
    upwork_proposal: 'credits_per_upwork_proposal',
    fiverr_estimate: 'credits_per_fiverr_estimate',
    fiverr_proposal: 'credits_per_fiverr_proposal',
};

/**
 * Check if user has enough credits for an action.
 * All users (subscribers and non-subscribers) spend from their user.credits balance.
 * Admin users have unlimited credits.
 * @param {string} userId
 * @param {string} action - The action key (e.g. 'resume_creation')
 * @returns {{ hasCredits: boolean, required: number, available: number, unlimited?: boolean }}
 */
async function checkCredits(userId, action) {
    const user = await User.findById(userId).select('+credits role');
    if (!user) throw new Error('User not found');

    // Admin has unlimited credits
    if (user.role === 'admin') {
        return { hasCredits: true, required: 0, available: Infinity, unlimited: true };
    }

    const settingKey = costMap[action];
    if (!settingKey) throw new Error(`Unknown credit action: ${action}`);

    const required = await AppSettings.get(settingKey, 1);

    return {
        hasCredits: user.credits >= required,
        required,
        available: user.credits
    };
}

/**
 * Deduct credits from a user for a specific action.
 * Always deducts from user.credits balance (subscribers included).
 * Records a credit_usage entry in the credit log.
 * @param {string} userId
 * @param {string} action - The action key
 * @returns {{ success: boolean, creditsDeducted: number, remaining: number }}
 */
async function deductCredits(userId, action) {
    const creditCheck = await checkCredits(userId, action);
    const label = actionLabels[action] || action;

    // Admin — no deduction needed
    if (creditCheck.unlimited) {
        logger.info(`Credits skipped for admin ${userId}`);

        await CreditLog.create({
            userId,
            type: 'usage',
            action,
            credits: 0,
            balanceAfter: null,
            description: label,
            metadata: { action, unlimited: true }
        });

        return {
            success: true,
            creditsDeducted: 0,
            remaining: Infinity,
            unlimited: true
        };
    }

    // Insufficient credits
    if (!creditCheck.hasCredits) {
        return {
            success: false,
            creditsDeducted: 0,
            remaining: creditCheck.available,
            required: creditCheck.required,
            error: `Insufficient credits. Required: ${creditCheck.required}, Available: ${creditCheck.available}`
        };
    }

    // Deduct from user balance
    const required = creditCheck.required;
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { credits: -required } },
        { new: true, select: '+credits' }
    );

    logger.info(`Credits deducted: ${required} from user ${userId} for ${action}. Remaining: ${updatedUser.credits}`);

    await CreditLog.create({
        userId,
        type: 'usage',
        action,
        credits: required,
        balanceAfter: updatedUser.credits,
        description: label,
        metadata: { action, creditsBeforeDeduction: creditCheck.available, creditsAfterDeduction: updatedUser.credits }
    });

    return {
        success: true,
        creditsDeducted: required,
        remaining: updatedUser.credits
    };
}

/**
 * Get the initial credits value from settings.
 * @returns {number}
 */
async function getInitialCredits() {
    return AppSettings.get('initial_credits', 10);
}

/**
 * Log a credit event (addition, purchase, admin adjustment, etc.).
 * @param {Object} params
 * @param {string} params.userId
 * @param {'usage'|'addition'|'initial'|'admin_adjustment'|'purchase'|'refund'} params.type
 * @param {number} params.credits - Number of credits (positive)
 * @param {number|null} params.balanceAfter - Balance after event
 * @param {string} params.description
 * @param {string} [params.action] - Action key (for usage type)
 * @param {Object} [params.metadata]
 */
async function logCreditEvent({ userId, type, credits, balanceAfter, description, action, metadata }) {
    return CreditLog.create({
        userId,
        type,
        action: action || null,
        credits,
        balanceAfter: balanceAfter ?? null,
        description,
        metadata: metadata || null
    });
}

module.exports = {
    checkCredits,
    deductCredits,
    getInitialCredits,
    logCreditEvent
};
