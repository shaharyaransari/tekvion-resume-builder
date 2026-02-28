const Subscription = require('../models/subscription.model');

/**
 * Middleware: Require an active subscription.
 * Blocks access with 403 if user has no active subscription.
 * Must be placed after authenticateUser.
 */
exports.requireSubscription = async (req, res, next) => {
    try {
        // Admin users bypass subscription requirements
        if (req.user.role === 'admin') {
            req.subscription = { isAdminBypass: true, features: { publicResumes: true, resumeAnalytics: true, salaryEstimation: true } };
            return next();
        }

        const subscription = await Subscription.getActiveForUser(req.user._id);

        if (!subscription) {
            return res.status(403).json({
                error: 'Active subscription required',
                message: 'This feature is available exclusively for subscribers. Upgrade your plan to unlock it.',
                upgradeUrl: '/subscription/plans'
            });
        }

        // Attach subscription to request for downstream use
        req.subscription = subscription;
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Middleware: Require a specific subscription feature.
 * @param {string} featureKey - Key from subscription.features (e.g. 'publicResumes', 'salaryEstimation')
 */
exports.requireFeature = (featureKey) => {
    return async (req, res, next) => {
        try {
            // Admin users bypass feature requirements
            if (req.user.role === 'admin') {
                return next();
            }

            const subscription = req.subscription || await Subscription.getActiveForUser(req.user._id);

            if (!subscription) {
                return res.status(403).json({
                    error: 'Active subscription required',
                    message: `The "${featureKey}" feature requires an active subscription.`,
                    upgradeUrl: '/subscription/plans'
                });
            }

            if (!subscription.features[featureKey]) {
                return res.status(403).json({
                    error: 'Feature not included',
                    message: `Your subscription plan does not include the "${featureKey}" feature.`
                });
            }

            req.subscription = subscription;
            next();
        } catch (err) {
            next(err);
        }
    };
};

/**
 * Middleware: Attach subscription info if available (non-blocking).
 * Useful for routes that behave differently for subscribers but don't require one.
 */
exports.attachSubscription = async (req, res, next) => {
    try {
        req.subscription = await Subscription.getActiveForUser(req.user._id);
    } catch {
        req.subscription = null;
    }
    next();
};
