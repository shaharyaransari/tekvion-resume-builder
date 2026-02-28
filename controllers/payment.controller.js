const paymentService = require('../services/payment.service');
const Subscription = require('../models/subscription.model');
const Transaction = require('../models/transaction.model');
const { createCreditCheckoutSchema, createSubscriptionCheckoutSchema } = require('../validations/payment.validation');
const logger = require('../utils/logger');

// ─── Credit Purchase ──────────────────────────────────────────────────────────

/**
 * Create a Stripe checkout session for buying credits.
 */
exports.createCreditCheckout = async (req, res) => {
    const { error, value } = createCreditCheckoutSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const result = await paymentService.createCreditCheckoutSession(req.user._id, value.creditAmount);
        res.json(result);
    } catch (err) {
        logger.error(`Credit checkout failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// ─── Subscription ─────────────────────────────────────────────────────────────

/**
 * Create a Stripe checkout session for starting a subscription.
 */
exports.createSubscriptionCheckout = async (req, res) => {
    const { error, value } = createSubscriptionCheckoutSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const result = await paymentService.createSubscriptionCheckoutSession(req.user._id, value.plan);
        res.json(result);
    } catch (err) {
        logger.error(`Subscription checkout failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Get current user's subscription status.
 */
exports.getMySubscription = async (req, res) => {
    try {
        const subscription = await Subscription.getActiveForUser(req.user._id);

        if (!subscription) {
            return res.json({
                subscribed: false,
                subscription: null
            });
        }

        res.json({
            subscribed: true,
            subscription: {
                plan: subscription.plan,
                status: subscription.status,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                features: subscription.features
            }
        });
    } catch (err) {
        logger.error(`Get subscription failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to retrieve subscription' });
    }
};

/**
 * Cancel the current subscription (at period end).
 */
exports.cancelSubscription = async (req, res) => {
    try {
        const subscription = await paymentService.cancelSubscription(req.user._id);
        res.json({
            message: 'Subscription will be canceled at the end of the current billing period',
            cancelAtPeriodEnd: true,
            currentPeriodEnd: subscription.currentPeriodEnd
        });
    } catch (err) {
        logger.error(`Cancel subscription failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Reactivate a subscription that was set to cancel.
 */
exports.reactivateSubscription = async (req, res) => {
    try {
        const subscription = await paymentService.reactivateSubscription(req.user._id);
        res.json({
            message: 'Subscription reactivated successfully',
            subscription: {
                plan: subscription.plan,
                status: subscription.status,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
            }
        });
    } catch (err) {
        logger.error(`Reactivate subscription failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Switch subscription plan between monthly and yearly.
 */
exports.switchPlan = async (req, res) => {
    const { plan } = req.body;
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
        return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "yearly".' });
    }

    try {
        const subscription = await paymentService.switchPlan(req.user._id, plan);
        res.json({
            message: `Switched to ${plan} plan successfully`,
            subscription: {
                plan: subscription.plan,
                status: subscription.status,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                features: subscription.features
            }
        });
    } catch (err) {
        logger.error(`Switch plan failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Create a Stripe billing portal session.
 */
exports.getBillingPortal = async (req, res) => {
    try {
        const result = await paymentService.createBillingPortalSession(req.user._id);
        res.json(result);
    } catch (err) {
        logger.error(`Billing portal failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

// ─── Webhook ──────────────────────────────────────────────────────────────────

/**
 * Handle Stripe webhook events.
 * This endpoint receives raw body (not JSON parsed).
 */
exports.handleWebhook = async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        logger.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    try {
        await paymentService.handleWebhookEvent(event);
        res.json({ received: true });
    } catch (err) {
        logger.error(`Webhook processing failed: ${err.message}`);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
};

// ─── Pricing Info (Public) ────────────────────────────────────────────────────

/**
 * Get current pricing information (including credit costs & plan limits).
 */
exports.getPricing = async (req, res) => {
    const AppSettings = require('../models/appSettings.model');

    try {
        const [
            pricePerCredit, monthlyPrice, yearlyPrice, currency, initialCredits,
            creditsPerResume, creditsPerJobPostCoverLetter,
            creditsPerUpworkEstimate, creditsPerUpworkProposal,
            creditsPerFiverrEstimate, creditsPerFiverrProposal,
            monthlyCredits, yearlyCredits
        ] = await Promise.all([
            AppSettings.get('price_per_credit', 1.00),
            AppSettings.get('subscription_monthly_price', 9.99),
            AppSettings.get('subscription_yearly_price', 99.99),
            AppSettings.get('currency', 'usd'),
            AppSettings.get('initial_credits', 3),
            AppSettings.get('credits_per_resume', 1),
            AppSettings.get('credits_per_job_post_cover_letter', 1),
            AppSettings.get('credits_per_upwork_estimate', 1),
            AppSettings.get('credits_per_upwork_proposal', 1),
            AppSettings.get('credits_per_fiverr_estimate', 1),
            AppSettings.get('credits_per_fiverr_proposal', 1),
            AppSettings.get('subscription_monthly_credits', 50),
            AppSettings.get('subscription_yearly_credits', 700)
        ]);

        res.json({
            credits: {
                pricePerCredit,
                currency
            },
            subscription: {
                monthly: {
                    price: monthlyPrice,
                    currency,
                    creditLimit: monthlyCredits
                },
                yearly: {
                    price: yearlyPrice,
                    currency,
                    savings: `${Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100)}%`,
                    creditLimit: yearlyCredits
                }
            },
            creditCosts: {
                resume: creditsPerResume,
                jobPostCoverLetter: creditsPerJobPostCoverLetter,
                upworkEstimate: creditsPerUpworkEstimate,
                upworkProposal: creditsPerUpworkProposal,
                fiverrEstimate: creditsPerFiverrEstimate,
                fiverrProposal: creditsPerFiverrProposal
            },
            initialCredits,
            features: {
                free: [
                    `${initialCredits} free credits on signup`,
                    'AI-powered resume generation',
                    'All templates',
                    'PDF export',
                    'Buy more credits anytime'
                ],
                subscriber: [
                    `${monthlyCredits} credits/month (${yearlyCredits}/year)`,
                    'Cover letter generation',
                    'Freelancer proposal tools (Upwork & Fiverr)',
                    'Public resume hosting',
                    'Resume view analytics',
                    'AI salary estimation & hiring chance',
                    'Priority support'
                ]
            }
        });
    } catch (err) {
        logger.error(`Get pricing failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to retrieve pricing' });
    }
};

// ─── Manual Session Verification ──────────────────────────────────────────────

/**
 * Manually verify a checkout session if webhook was missed.
 * Checks with Stripe, processes the payment, and records the transaction.
 */
exports.verifySession = async (req, res) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }

    try {
        const result = await paymentService.verifyAndProcessSession(sessionId, req.user._id);

        if (result.alreadyProcessed) {
            return res.json({
                message: 'This payment was already processed',
                transaction: result.transaction
            });
        }

        res.json({
            message: 'Payment verified and processed successfully',
            transaction: result.transaction
        });
    } catch (err) {
        logger.error(`Session verification failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

// ─── Sync Subscription ────────────────────────────────────────────────────────

/**
 * Sync the user's subscription status from Stripe.
 */
exports.syncSubscription = async (req, res) => {
    try {
        const result = await paymentService.syncSubscriptionFromStripe(req.user._id);
        res.json(result);
    } catch (err) {
        logger.error(`Sync subscription failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * Get the authenticated user's transaction history.
 * Excludes credit_usage — those go to /credits/history now.
 */
exports.getMyTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const { type } = req.query;

        // Build filter — only financial transactions
        const filter = { userId: req.user._id, isDeleted: false, type: { $ne: 'credit_usage' } };
        if (type) filter.type = type;

        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Transaction.countDocuments(filter)
        ]);

        res.json({
            transactions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        logger.error(`Get transactions failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to retrieve transactions' });
    }
};

/**
 * Sync transactions from Stripe.
 * Fetches charges/invoices from Stripe for the user's customer and imports
 * any that are missing from the local Transaction collection.
 */
exports.syncTransactions = async (req, res) => {
    try {
        const result = await paymentService.syncTransactionsFromStripe(req.user._id);
        res.json(result);
    } catch (err) {
        logger.error(`Sync transactions failed: ${err.message}`);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Admin: Get all transactions (with filters).
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const { type, status, userId } = req.query;

        const filter = { isDeleted: false };
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (userId) filter.userId = userId;

        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            Transaction.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'first_name last_name email')
                .lean(),
            Transaction.countDocuments(filter)
        ]);

        res.json({
            transactions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        logger.error(`Get all transactions failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to retrieve transactions' });
    }
};
