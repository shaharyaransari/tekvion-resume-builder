/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Stripe payment integration for credits and subscriptions
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreditCheckoutRequest:
 *       type: object
 *       required:
 *         - creditAmount
 *       properties:
 *         creditAmount:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           description: Number of credits to purchase
 *           example: 10
 *     SubscriptionCheckoutRequest:
 *       type: object
 *       required:
 *         - plan
 *       properties:
 *         plan:
 *           type: string
 *           enum: [monthly, yearly]
 *           description: Subscription plan type
 *           example: "monthly"
 *     CheckoutResponse:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *           description: Stripe checkout session ID
 *         url:
 *           type: string
 *           description: URL to redirect user to Stripe checkout
 *     SubscriptionStatus:
 *       type: object
 *       properties:
 *         subscribed:
 *           type: boolean
 *         subscription:
 *           type: object
 *           properties:
 *             plan:
 *               type: string
 *               enum: [monthly, yearly]
 *             status:
 *               type: string
 *             currentPeriodStart:
 *               type: string
 *               format: date-time
 *             currentPeriodEnd:
 *               type: string
 *               format: date-time
 *             cancelAtPeriodEnd:
 *               type: boolean
 *             features:
 *               type: object
 *     PricingInfo:
 *       type: object
 *       properties:
 *         credits:
 *           type: object
 *           properties:
 *             pricePerCredit:
 *               type: number
 *             currency:
 *               type: string
 *         subscription:
 *           type: object
 *           properties:
 *             monthly:
 *               type: object
 *             yearly:
 *               type: object
 *         features:
 *           type: object
 */

const express = require('express');
const paymentRouter = express.Router();
const { authenticateUser } = require('../middlewares/auth.middleware');
const tryCatch = require('../utils/tryCatch');
const {
    createCreditCheckout,
    createSubscriptionCheckout,
    getMySubscription,
    cancelSubscription,
    reactivateSubscription,
    switchPlan,
    getBillingPortal,
    handleWebhook,
    getPricing,
    verifySession,
    syncSubscription,
    getMyTransactions,
    syncTransactions,
    getAllTransactions
} = require('../controllers/payment.controller');

/**
 * @swagger
 * /payments/pricing:
 *   get:
 *     summary: Get pricing information
 *     description: Returns current pricing for credits and subscriptions (public)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Pricing information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PricingInfo'
 */
paymentRouter.get('/pricing', tryCatch(getPricing));

/**
 * @swagger
 * /payments/credits/checkout:
 *   post:
 *     summary: Create credit purchase checkout
 *     description: Creates a Stripe checkout session for purchasing credits
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreditCheckoutRequest'
 *     responses:
 *       200:
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
paymentRouter.post('/credits/checkout', authenticateUser, tryCatch(createCreditCheckout));

/**
 * @swagger
 * /payments/subscription/checkout:
 *   post:
 *     summary: Create subscription checkout
 *     description: Creates a Stripe checkout session for starting a subscription
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscriptionCheckoutRequest'
 *     responses:
 *       200:
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutResponse'
 *       400:
 *         description: Invalid request or already subscribed
 *       401:
 *         description: Unauthorized
 */
paymentRouter.post('/subscription/checkout', authenticateUser, tryCatch(createSubscriptionCheckout));

/**
 * @swagger
 * /payments/subscription:
 *   get:
 *     summary: Get subscription status
 *     description: Returns the authenticated user's current subscription details
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionStatus'
 *       401:
 *         description: Unauthorized
 */
paymentRouter.get('/subscription', authenticateUser, tryCatch(getMySubscription));

/**
 * @swagger
 * /payments/subscription/cancel:
 *   post:
 *     summary: Cancel subscription
 *     description: Cancels the subscription at the end of current billing period
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancellation scheduled
 *       400:
 *         description: No active subscription
 *       401:
 *         description: Unauthorized
 */
paymentRouter.post('/subscription/cancel', authenticateUser, tryCatch(cancelSubscription));

/**
 * @swagger
 * /payments/subscription/reactivate:
 *   post:
 *     summary: Reactivate subscription
 *     description: Reactivates a subscription that was scheduled for cancellation
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription reactivated
 *       400:
 *         description: No subscription pending cancellation
 *       401:
 *         description: Unauthorized
 */
paymentRouter.post('/subscription/reactivate', authenticateUser, tryCatch(reactivateSubscription));

/**
 * @swagger
 * /payments/subscription/switch:
 *   post:
 *     summary: Switch subscription plan
 *     description: Switch between monthly and yearly plans. Stripe handles proration automatically.
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [monthly, yearly]
 *     responses:
 *       200:
 *         description: Plan switched successfully
 *       400:
 *         description: Invalid request or cannot switch
 *       401:
 *         description: Unauthorized
 */
paymentRouter.post('/subscription/switch', authenticateUser, tryCatch(switchPlan));

/**
 * @swagger
 * /payments/billing-portal:
 *   get:
 *     summary: Get billing portal URL
 *     description: Creates a Stripe billing portal session for managing payment methods
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Billing portal URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       400:
 *         description: No billing account found
 *       401:
 *         description: Unauthorized
 */
paymentRouter.get('/billing-portal', authenticateUser, tryCatch(getBillingPortal));

/**
 * @swagger
 * /payments/subscription/sync:
 *   post:
 *     summary: Sync subscription from Stripe
 *     description: Checks Stripe for active subscriptions and syncs them to the local database. Useful when a webhook was missed.
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sync result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 synced:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 subscription:
 *                   $ref: '#/components/schemas/SubscriptionStatus'
 *       400:
 *         description: Sync failed
 *       401:
 *         description: Unauthorized
 */
paymentRouter.post('/subscription/sync', authenticateUser, tryCatch(syncSubscription));

/**
 * @swagger
 * /payments/verify/{sessionId}:
 *   post:
 *     summary: Verify a checkout session
 *     description: Manually verify and process a Stripe checkout session if webhook was missed
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe checkout session ID
 *     responses:
 *       200:
 *         description: Payment verified and processed
 *       400:
 *         description: Invalid session or not paid
 *       401:
 *         description: Unauthorized
 */
paymentRouter.post('/verify/:sessionId', authenticateUser, tryCatch(verifySession));

/**
 * @swagger
 * /payments/transactions/sync:
 *   post:
 *     summary: Sync transactions from Stripe
 *     description: Imports missing payment records from Stripe for the authenticated user's customer account
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sync result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 synced:
 *                   type: boolean
 *                 imported:
 *                   type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Sync failed (no Stripe customer)
 *       401:
 *         description: Unauthorized
 */
paymentRouter.post('/transactions/sync', authenticateUser, tryCatch(syncTransactions));

/**
 * @swagger
 * /payments/transactions:
 *   get:
 *     summary: Get my transactions
 *     description: Returns the authenticated user's transaction history (paginated)
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Transaction list with pagination
 *       401:
 *         description: Unauthorized
 */
paymentRouter.get('/transactions', authenticateUser, tryCatch(getMyTransactions));

/**
 * @swagger
 * /payments/transactions/all:
 *   get:
 *     summary: Get all transactions (Admin)
 *     description: Returns all transactions with optional filters (admin only)
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [credit_purchase, subscription_payment, subscription_renewal, refund]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All transactions with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
paymentRouter.get('/transactions/all', authenticateUser, (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    next();
}, tryCatch(getAllTransactions));

module.exports = paymentRouter;
