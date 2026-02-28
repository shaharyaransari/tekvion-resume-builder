const AppSettings = require('../models/appSettings.model');
const Subscription = require('../models/subscription.model');
const Transaction = require('../models/transaction.model');
const CreditLog = require('../models/creditLog.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');

/**
 * Stripe Payment Service
 * 
 * Handles:
 * - Customer creation
 * - Checkout sessions for credit purchases
 * - Subscription creation & management
 * - Webhook processing
 */

function getStripe() {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    return stripe;
}

/**
 * Extract currentPeriodStart / currentPeriodEnd from a Stripe subscription.
 * In API version 2026-02-25 (clover) these fields moved from the subscription
 * object to subscription.items.data[].  Fall back to top-level fields for
 * older API versions.
 */
function extractPeriodDates(stripeSub) {
    const item = stripeSub.items?.data?.[0];
    const start = item?.current_period_start ?? stripeSub.current_period_start;
    const end = item?.current_period_end ?? stripeSub.current_period_end;
    return {
        currentPeriodStart: start ? new Date(start * 1000) : new Date(),
        currentPeriodEnd: end ? new Date(end * 1000) : new Date()
    };
}

/**
 * Return the credit limit for a given plan (reads from AppSettings).
 */
async function creditLimitForPlan(plan) {
    const AppSettings = require('../models/appSettings.model');
    if (plan === 'yearly') {
        return await AppSettings.get('subscription_yearly_credits', 700);
    }
    return await AppSettings.get('subscription_monthly_credits', 50);
}

// ─── Customer Management ─────────────────────────────────────────────────────

/**
 * Get or create a Stripe customer for a user.
 */
async function getOrCreateCustomer(user) {
    const stripe = getStripe();

    // Check if user already has a subscription with a customer ID
    const existingSub = await Subscription.findOne({ userId: user._id, stripeCustomerId: { $exists: true } });
    if (existingSub && existingSub.stripeCustomerId) {
        return existingSub.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        metadata: {
            userId: user._id.toString()
        }
    });

    logger.info(`Stripe customer created: ${customer.id} for user ${user._id}`);
    return customer.id;
}

// ─── Credit Purchase ──────────────────────────────────────────────────────────

/**
 * Credit package pricing tiers.
 * Larger packages have a lower per-credit rate.
 */
const CREDIT_PACKAGES = {
    5:  { price: 3.99,  label: '5 credits' },
    15: { price: 9.99,  label: '15 credits' },
    30: { price: 14.99, label: '30 credits' },
};

/**
 * Create a Stripe checkout session for purchasing credits.
 */
async function createCreditCheckoutSession(userId, creditAmount) {
    const stripe = getStripe();

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const customerId = await getOrCreateCustomer(user);
    const currency = await AppSettings.get('currency', 'usd');

    // Use package pricing if available, otherwise fall back to per-credit rate
    const pkg = CREDIT_PACKAGES[creditAmount];
    let totalAmount;
    if (pkg) {
        totalAmount = Math.round(pkg.price * 100); // cents
    } else {
        const pricePerCredit = await AppSettings.get('price_per_credit', 0.80);
        totalAmount = Math.round(pricePerCredit * creditAmount * 100);
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency,
                product_data: {
                    name: `${creditAmount} Resume Credits`,
                    description: `Purchase ${creditAmount} credits for AI-powered generations`,
                },
                unit_amount: totalAmount,
            },
            quantity: 1,
        }],
        metadata: {
            userId: userId.toString(),
            type: 'credit_purchase',
            creditAmount: creditAmount.toString()
        },
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    logger.info(`Credit checkout session created: ${session.id} for ${creditAmount} credits, user ${userId}`);
    return { sessionId: session.id, url: session.url };
}

// ─── Subscription Management ──────────────────────────────────────────────────

/**
 * Create a Stripe checkout session for subscription.
 */
async function createSubscriptionCheckoutSession(userId, plan) {
    const stripe = getStripe();

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Check if user already has an active subscription in our DB
    const existingSub = await Subscription.getActiveForUser(userId);
    if (existingSub) {
        throw new Error('User already has an active subscription. Cancel it first to switch plans.');
    }

    const customerId = await getOrCreateCustomer(user);

    // Also check Stripe for active subscriptions not yet in our DB (e.g. webhook failed)
    const stripeActiveSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
    });
    if (stripeActiveSubs.data.length > 0) {
        // Sync the Stripe subscription to our DB so everything is consistent
        const stSub = stripeActiveSubs.data[0];
        const { currentPeriodStart, currentPeriodEnd } = extractPeriodDates(stSub);
        await Subscription.findOneAndUpdate(
            { userId, stripeSubscriptionId: stSub.id },
            {
                userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: stSub.id,
                plan: plan,
                status: stSub.status,
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd: stSub.cancel_at_period_end,
                features: { publicResumes: true, resumeAnalytics: true, salaryEstimation: true }
            },
            { upsert: true, new: true }
        );
        throw new Error('User already has an active subscription on Stripe. It has been synced — please refresh the page.');
    }

    // Get price ID from settings
    const priceKey = plan === 'yearly' ? 'stripe_yearly_price_id' : 'stripe_monthly_price_id';
    const priceId = await AppSettings.get(priceKey);

    if (!priceId) {
        throw new Error(`Stripe price ID not configured for ${plan} plan. Admin must set "${priceKey}" in settings.`);
    }

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{
            price: priceId,
            quantity: 1,
        }],
        metadata: {
            userId: userId.toString(),
            type: 'subscription',
            plan
        },
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    logger.info(`Subscription checkout session created: ${session.id}, plan: ${plan}, user: ${userId}`);
    return { sessionId: session.id, url: session.url };
}

/**
 * Cancel a user's subscription (at period end).
 */
async function cancelSubscription(userId) {
    const stripe = getStripe();

    const subscription = await Subscription.getActiveForUser(userId);
    if (!subscription) {
        throw new Error('No active subscription found');
    }

    // Cancel at period end (user keeps access until then)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true
    });

    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    logger.info(`Subscription ${subscription.stripeSubscriptionId} set to cancel at period end for user ${userId}`);
    return subscription;
}

/**
 * Reactivate a subscription that was set to cancel at period end.
 */
async function reactivateSubscription(userId) {
    const stripe = getStripe();

    const subscription = await Subscription.findOne({
        userId,
        status: 'active',
        cancelAtPeriodEnd: true
    });

    if (!subscription) {
        throw new Error('No subscription pending cancellation found');
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false
    });

    subscription.cancelAtPeriodEnd = false;
    await subscription.save();

    logger.info(`Subscription ${subscription.stripeSubscriptionId} reactivated for user ${userId}`);
    return subscription;
}

// ─── Plan Switching ──────────────────────────────────────────────────────────

/**
 * Switch a user's subscription between monthly and yearly plans.
 * Uses Stripe proration to handle billing differences.
 */
async function switchPlan(userId, newPlan) {
    const stripe = getStripe();

    const subscription = await Subscription.getActiveForUser(userId);
    if (!subscription) {
        throw new Error('No active subscription found');
    }

    if (subscription.plan === newPlan) {
        throw new Error(`Already on the ${newPlan} plan`);
    }

    if (subscription.cancelAtPeriodEnd) {
        throw new Error('Cannot switch plan while subscription is pending cancellation. Reactivate first.');
    }

    // Get the new price ID from settings
    const priceKey = newPlan === 'yearly' ? 'stripe_yearly_price_id' : 'stripe_monthly_price_id';
    const newPriceId = await AppSettings.get(priceKey);

    if (!newPriceId) {
        throw new Error(`Stripe price ID not configured for ${newPlan} plan. Admin must set "${priceKey}" in settings.`);
    }

    // Retrieve Stripe subscription to get the current item ID
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const currentItemId = stripeSub.items.data[0].id;

    // Update the subscription in Stripe — reset billing cycle so the new plan
    // starts immediately; always_invoice settles the proration right away.
    const updatedStripeSub = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{
            id: currentItemId,
            price: newPriceId,
        }],
        proration_behavior: 'always_invoice',
        billing_cycle_anchor: 'now',
    });

    const { currentPeriodStart, currentPeriodEnd } = extractPeriodDates(updatedStripeSub);
    const oldPlan = subscription.plan;

    // Update local subscription record (no credits added — credits are only
    // granted on initial activation and periodic renewals, not on plan switches)
    subscription.plan = newPlan;
    subscription.currentPeriodStart = currentPeriodStart;
    subscription.currentPeriodEnd = currentPeriodEnd;
    await subscription.save();

    logger.info(`Plan switched from ${oldPlan} to ${newPlan} for user ${userId}`);
    return subscription;
}

// ─── Webhook Processing ──────────────────────────────────────────────────────

/**
 * Process Stripe webhook events.
 */
async function handleWebhookEvent(event) {
    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object);
            break;

        case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object);
            break;

        case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(event.data.object);
            break;

        case 'invoice.payment_succeeded':
            await handleInvoicePaymentSucceeded(event.data.object);
            break;

        case 'invoice.payment_failed':
            await handlePaymentFailed(event.data.object);
            break;

        default:
            logger.info(`Unhandled Stripe event: ${event.type}`);
    }
}

async function handleCheckoutCompleted(session) {
    const { type, userId, creditAmount, plan } = session.metadata;

    // Calculate amount from Stripe session
    const amount = (session.amount_total || 0) / 100;
    const currency = session.currency || 'usd';

    if (type === 'credit_purchase') {
        const credits = parseInt(creditAmount, 10);

        // Add credits to user
        const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { credits } }, { new: true, select: '+credits' });

        // Record financial transaction
        await Transaction.create({
            userId,
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent,
            type: 'credit_purchase',
            status: 'completed',
            amount,
            currency,
            creditsAdded: credits,
            description: `Purchased ${credits} resume credits`,
            stripeEventType: 'checkout.session.completed',
            metadata: { sessionId: session.id, paymentIntent: session.payment_intent }
        });

        // Record credit addition in credit log
        await CreditLog.create({
            userId,
            type: 'purchase',
            credits,
            balanceAfter: updatedUser ? updatedUser.credits : null,
            description: `Purchased ${credits} credits ($${amount.toFixed(2)} ${currency.toUpperCase()})`,
            metadata: { stripeSessionId: session.id, amount, currency }
        });

        logger.info(`${credits} credits added to user ${userId} via Stripe payment. Transaction recorded.`);

    } else if (type === 'subscription') {
        const stripeSubscriptionId = session.subscription;

        const stripe = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const { currentPeriodStart, currentPeriodEnd } = extractPeriodDates(stripeSub);

        await Subscription.findOneAndUpdate(
            { userId, stripeSubscriptionId },
            {
                userId,
                stripeCustomerId: session.customer,
                stripeSubscriptionId,
                plan,
                status: stripeSub.status,
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
                features: {
                    publicResumes: true,
                    resumeAnalytics: true,
                    salaryEstimation: true
                }
            },
            { upsert: true, new: true }
        );

        // Add subscription credits to user balance
        const creditsToAdd = await creditLimitForPlan(plan);
        const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { credits: creditsToAdd } }, { new: true, select: '+credits' });

        await CreditLog.create({
            userId,
            type: 'addition',
            credits: creditsToAdd,
            balanceAfter: updatedUser ? updatedUser.credits : null,
            description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} subscription activated — ${creditsToAdd} credits added`,
            metadata: { plan, subscriptionId: stripeSubscriptionId }
        });

        // Record transaction
        await Transaction.create({
            userId,
            stripeSessionId: session.id,
            stripePaymentIntentId: session.payment_intent || null,
            stripeSubscriptionId,
            type: 'subscription_payment',
            status: 'completed',
            amount,
            currency,
            plan,
            creditsAdded: creditsToAdd,
            description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} subscription activated`,
            stripeEventType: 'checkout.session.completed',
            metadata: { sessionId: session.id, subscriptionId: stripeSubscriptionId }
        });

        logger.info(`Subscription created for user ${userId}: ${stripeSubscriptionId}. ${creditsToAdd} credits added. Transaction recorded.`);
    }
}

async function handleSubscriptionUpdated(stripeSubscription) {
    const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id
    });

    if (!subscription) {
        logger.warn(`Subscription not found for Stripe ID: ${stripeSubscription.id}`);
        return;
    }

    const { currentPeriodStart, currentPeriodEnd } = extractPeriodDates(stripeSubscription);

    subscription.status = stripeSubscription.status;
    subscription.currentPeriodStart = currentPeriodStart;
    subscription.currentPeriodEnd = currentPeriodEnd;
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

    // Detect plan change from Stripe (e.g. user switched via billing portal)
    const interval = stripeSubscription.items?.data?.[0]?.price?.recurring?.interval;
    if (interval) {
        subscription.plan = interval === 'year' ? 'yearly' : 'monthly';
    }

    await subscription.save();
    logger.info(`Subscription updated: ${stripeSubscription.id}, status: ${stripeSubscription.status}`);
}

async function handleSubscriptionDeleted(stripeSubscription) {
    const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id
    });

    if (subscription) {
        subscription.status = 'expired';
        await subscription.save();

        // Privatize all public resumes since subscription ended
        const Resume = require('../models/resume.model');
        const result = await Resume.updateMany(
            { userId: subscription.userId, visibility: 'public', isDeleted: false },
            { $set: { visibility: 'private' } }
        );
        if (result.modifiedCount > 0) {
            logger.info(`Privatized ${result.modifiedCount} public resume(s) for user ${subscription.userId} after subscription expired`);
        }

        logger.info(`Subscription expired: ${stripeSubscription.id}`);
    }
}

async function handleInvoicePaymentSucceeded(invoice) {
    // Only handle subscription invoices with actual payment
    // Skip 'subscription_create' — checkout.session.completed already records the initial payment
    if (!invoice.subscription || invoice.billing_reason === 'subscription_create') {
        return;
    }

    // Skip $0 invoices (e.g. proration credits with no net charge)
    const amount = (invoice.amount_paid || 0) / 100;
    if (amount <= 0) {
        logger.info(`Skipping $0 invoice ${invoice.id} (billing_reason: ${invoice.billing_reason})`);
        return;
    }

    const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription
    });

    if (!subscription) {
        logger.warn(`Invoice payment succeeded but no subscription found for: ${invoice.subscription}`);
        return;
    }

    // Avoid duplicates (check by invoiceId)
    const existing = await Transaction.findOne({ stripeInvoiceId: invoice.id });
    if (existing) {
        logger.info(`Transaction already exists for invoice ${invoice.id}, skipping.`);
        return;
    }

    const currency = invoice.currency || 'usd';
    const isSwitch = invoice.billing_reason === 'subscription_update';

    // Add subscription credits to user balance on renewal or paid plan switch
    const creditsToAdd = await creditLimitForPlan(subscription.plan);
    const updatedUser = await User.findByIdAndUpdate(
        subscription.userId,
        { $inc: { credits: creditsToAdd } },
        { new: true, select: '+credits' }
    );

    await CreditLog.create({
        userId: subscription.userId,
        type: 'addition',
        credits: creditsToAdd,
        balanceAfter: updatedUser ? updatedUser.credits : null,
        description: `${isSwitch ? 'Plan switch' : 'Subscription renewal'} — ${creditsToAdd} credits added`,
        metadata: { plan: subscription.plan, invoiceId: invoice.id }
    });

    await Transaction.create({
        userId: subscription.userId,
        stripeSubscriptionId: invoice.subscription,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent || null,
        type: isSwitch ? 'subscription_switch' : 'subscription_renewal',
        status: 'completed',
        amount,
        currency,
        plan: subscription.plan,
        creditsAdded: creditsToAdd,
        description: `${isSwitch ? 'Plan switch' : 'Subscription renewal'} — $${amount.toFixed(2)} ${currency.toUpperCase()}`,
        stripeEventType: 'invoice.payment_succeeded',
        metadata: { invoiceId: invoice.id, billingReason: invoice.billing_reason }
    });

    logger.info(`${isSwitch ? 'Plan switch' : 'Subscription renewal'} for user ${subscription.userId}: ${creditsToAdd} credits added. Invoice ${invoice.id}`);
}

async function handlePaymentFailed(invoice) {
    const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoice.subscription
    });

    if (subscription) {
        subscription.status = 'past_due';
        await subscription.save();

        // Record failed transaction
        await Transaction.create({
            userId: subscription.userId,
            stripeSubscriptionId: invoice.subscription,
            stripeInvoiceId: invoice.id,
            type: 'subscription_renewal',
            status: 'failed',
            amount: (invoice.amount_due || 0) / 100,
            currency: invoice.currency || 'usd',
            plan: subscription.plan,
            description: `Subscription renewal payment failed`,
            stripeEventType: 'invoice.payment_failed',
            metadata: { invoiceId: invoice.id }
        });

        logger.info(`Subscription payment failed: ${invoice.subscription}. Transaction recorded.`);
    }
}

// ─── Billing Portal ───────────────────────────────────────────────────────────

/**
 * Create a Stripe billing portal session for subscription management.
 */
async function createBillingPortalSession(userId) {
    const stripe = getStripe();

    const subscription = await Subscription.findOne({ userId, stripeCustomerId: { $exists: true } });
    if (!subscription || !subscription.stripeCustomerId) {
        throw new Error('No billing account found. Please make a purchase first.');
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL}/subscription`,
    });

    return { url: session.url };
}

// ─── Manual Session Verification ──────────────────────────────────────────────

/**
 * Manually verify a Stripe checkout session and process it.
 * Use this when the webhook was missed (e.g., server was down).
 */
async function verifyAndProcessSession(sessionId, userId) {
    const stripe = getStripe();

    // Check if this session was already processed
    const existingTx = await Transaction.findOne({ stripeSessionId: sessionId, status: 'completed' });
    if (existingTx) {
        return { alreadyProcessed: true, transaction: existingTx };
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
        throw new Error('Session not found on Stripe');
    }

    if (session.payment_status !== 'paid') {
        throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    // Verify it belongs to this user
    if (session.metadata.userId !== userId.toString()) {
        throw new Error('Session does not belong to this user');
    }

    // Process the session (same logic as webhook handler)
    await handleCheckoutCompleted(session);

    const transaction = await Transaction.findOne({ stripeSessionId: sessionId });
    return { alreadyProcessed: false, transaction };
}

// ─── Sync Subscription from Stripe ────────────────────────────────────────────

/**
 * Look up the user's Stripe customer (by local record or by email), then
 * check for any active/trialing subscriptions on that customer and sync them
 * into our database.  Returns the synced subscription or null.
 */
async function syncSubscriptionFromStripe(userId) {
    const stripe = getStripe();
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // 1. Try to find the Stripe customer ID from our DB first
    let customerId;
    const existingSub = await Subscription.findOne({ userId, stripeCustomerId: { $exists: true } });
    if (existingSub && existingSub.stripeCustomerId) {
        customerId = existingSub.stripeCustomerId;
    } else {
        // Search Stripe by email
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length === 0) {
            return { synced: false, message: 'No Stripe customer found for your account. Please make a purchase first.' };
        }
        customerId = customers.data[0].id;
    }

    // 2. List active / trialing subscriptions for this customer
    const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 5
    });

    // Also check trialing
    const trialSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'trialing',
        limit: 5
    });

    const allSubs = [...subs.data, ...trialSubs.data];

    if (allSubs.length === 0) {
        return { synced: false, message: 'No active subscription found on Stripe for your account.' };
    }

    // 3. Sync the first active subscription
    const stripeSub = allSubs[0];
    const { currentPeriodStart, currentPeriodEnd } = extractPeriodDates(stripeSub);

    // Determine plan from price interval
    let plan = 'monthly';
    const interval = stripeSub.items?.data?.[0]?.price?.recurring?.interval;
    if (interval === 'year') plan = 'yearly';

    const subscription = await Subscription.findOneAndUpdate(
        { userId, stripeSubscriptionId: stripeSub.id },
        {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: stripeSub.id,
            plan,
            status: stripeSub.status,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            features: {
                publicResumes: true,
                resumeAnalytics: true,
                salaryEstimation: true
            },
        },
        { upsert: true, new: true }
    );

    logger.info(`Subscription synced from Stripe for user ${userId}: ${stripeSub.id} (${stripeSub.status})`);
    return {
        synced: true,
        message: 'Subscription synced successfully from Stripe.',
        subscription: {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            features: subscription.features
        }
    };
}

// ─── Sync Transactions from Stripe ────────────────────────────────────────────

/**
 * Sync payment history from Stripe for a user.
 * Fetches charges from the user's Stripe customer and imports any
 * that don't already exist in the local Transaction collection.
 */
async function syncTransactionsFromStripe(userId) {
    const stripe = getStripe();
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Find the Stripe customer ID
    let customerId;
    const existingSub = await Subscription.findOne({ userId, stripeCustomerId: { $exists: true } });
    if (existingSub && existingSub.stripeCustomerId) {
        customerId = existingSub.stripeCustomerId;
    } else {
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length === 0) {
            return { synced: false, imported: 0, message: 'No Stripe customer found for your account.' };
        }
        customerId = customers.data[0].id;
    }

    // Fetch recent charges from Stripe
    const charges = await stripe.charges.list({
        customer: customerId,
        limit: 100,
    });

    // Also fetch payment intents (catches subscription payments that may not appear in charges)
    const paymentIntents = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 100,
    });

    let imported = 0;

    // --- Sync charges ---
    for (const charge of charges.data) {
        if (charge.status !== 'succeeded') continue;

        // Check if we already have a transaction for this charge (scoped to user)
        const exists = await Transaction.findOne({
            userId,
            $or: [
                { stripePaymentIntentId: charge.payment_intent },
                { 'metadata.chargeId': charge.id }
            ]
        });

        if (exists) continue;

        // Determine type from metadata
        let type = 'credit_purchase';
        let description = charge.description || 'Stripe payment';
        const amount = charge.amount / 100;
        const currency = charge.currency || 'usd';

        // Check if it's a subscription invoice
        if (charge.invoice) {
            // Try to determine if it's a renewal or initial payment
            try {
                const inv = await stripe.invoices.retrieve(charge.invoice);
                if (inv.billing_reason === 'subscription_cycle') {
                    type = 'subscription_renewal';
                    description = `Subscription renewal — $${amount.toFixed(2)} ${currency.toUpperCase()}`;
                } else {
                    type = 'subscription_payment';
                    description = `Subscription payment — $${amount.toFixed(2)} ${currency.toUpperCase()}`;
                }
            } catch {
                type = 'subscription_payment';
                description = `Subscription payment — $${amount.toFixed(2)} ${currency.toUpperCase()}`;
            }
        } else {
            description = `Credit purchase — $${amount.toFixed(2)} ${currency.toUpperCase()}`;
        }

        await Transaction.create({
            userId,
            stripePaymentIntentId: charge.payment_intent || charge.id,
            type,
            status: 'completed',
            amount,
            currency,
            creditsAdded: charge.metadata?.creditAmount ? parseInt(charge.metadata.creditAmount, 10) : 0,
            description,
            stripeEventType: 'charge.synced',
            metadata: {
                chargeId: charge.id,
                synced: true,
                originalCreatedAt: new Date(charge.created * 1000).toISOString()
            }
        });

        imported++;
    }

    // --- Sync payment intents (catches subscription payments missed by charges) ---
    for (const pi of paymentIntents.data) {
        if (pi.status !== 'succeeded') continue;

        // Skip if we already imported this via charges or it already exists
        const exists = await Transaction.findOne({
            userId,
            $or: [
                { stripePaymentIntentId: pi.id },
                { 'metadata.paymentIntentId': pi.id }
            ]
        });

        if (exists) continue;

        const amount = pi.amount / 100;
        const currency = pi.currency || 'usd';
        let type = 'credit_purchase';
        let description = pi.description || 'Stripe payment';
        let plan = null;
        let invoiceId = null;

        // Check if it's tied to a subscription invoice
        if (pi.invoice) {
            try {
                const inv = await stripe.invoices.retrieve(pi.invoice);
                invoiceId = inv.id;
                if (inv.billing_reason === 'subscription_cycle') {
                    type = 'subscription_renewal';
                    description = `Subscription renewal — $${amount.toFixed(2)} ${currency.toUpperCase()}`;
                } else {
                    type = 'subscription_payment';
                    description = `Subscription payment — $${amount.toFixed(2)} ${currency.toUpperCase()}`;
                }
                // Try to detect plan from subscription
                if (inv.subscription) {
                    try {
                        const sub = await stripe.subscriptions.retrieve(inv.subscription);
                        const interval = sub.items?.data?.[0]?.price?.recurring?.interval;
                        plan = interval === 'year' ? 'yearly' : 'monthly';
                    } catch { /* ignore */ }
                }
            } catch {
                type = 'subscription_payment';
                description = `Subscription payment — $${amount.toFixed(2)} ${currency.toUpperCase()}`;
            }
        } else if (pi.metadata?.type === 'credit_purchase') {
            const credits = pi.metadata.creditAmount ? parseInt(pi.metadata.creditAmount, 10) : 0;
            description = credits > 0
                ? `Credit purchase — ${credits} credits ($${amount.toFixed(2)} ${currency.toUpperCase()})`
                : `Credit purchase — $${amount.toFixed(2)} ${currency.toUpperCase()}`;
        } else {
            description = `Payment — $${amount.toFixed(2)} ${currency.toUpperCase()}`;
        }

        await Transaction.create({
            userId,
            stripePaymentIntentId: pi.id,
            stripeInvoiceId: invoiceId,
            type,
            status: 'completed',
            amount,
            currency,
            plan,
            creditsAdded: pi.metadata?.creditAmount ? parseInt(pi.metadata.creditAmount, 10) : 0,
            description,
            stripeEventType: 'payment_intent.synced',
            metadata: {
                paymentIntentId: pi.id,
                synced: true,
                originalCreatedAt: new Date(pi.created * 1000).toISOString()
            }
        });

        imported++;
    }

    logger.info(`Stripe transaction sync for user ${userId}: ${imported} new transactions imported`);
    return {
        synced: true,
        imported,
        message: imported > 0
            ? `${imported} transaction${imported !== 1 ? 's' : ''} synced from Stripe.`
            : 'All transactions are already in sync.'
    };
}

module.exports = {
    getOrCreateCustomer,
    createCreditCheckoutSession,
    createSubscriptionCheckoutSession,
    cancelSubscription,
    reactivateSubscription,
    switchPlan,
    handleWebhookEvent,
    createBillingPortalSession,
    verifyAndProcessSession,
    syncSubscriptionFromStripe,
    syncTransactionsFromStripe,
    creditLimitForPlan
};
