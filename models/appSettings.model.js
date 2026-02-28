const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    label: {
        type: String
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    description: {
        type: String
    },
    category: {
        type: String,
        enum: ['credits', 'ai', 'general', 'payments', 'subscription'],
        default: 'general'
    }
}, { timestamps: true });

// Static helper: get a setting value by key (with optional default)
appSettingsSchema.statics.get = async function (key, defaultValue = null) {
    const setting = await this.findOne({ key });
    return setting ? setting.value : defaultValue;
};

// Static helper: set a setting value by key
appSettingsSchema.statics.set = async function (key, value, description, category) {
    return this.findOneAndUpdate(
        { key },
        { value, ...(description && { description }), ...(category && { category }) },
        { upsert: true, new: true }
    );
};

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);

// Default settings — seeded on first run
AppSettings.seedDefaults = async function () {
    const defaults = [
        {
            key: 'app_name',
            label: 'Application Name',
            value: 'Resume Builder',
            description: 'The name of the application displayed throughout the UI',
            category: 'general'
        },
        {
            key: 'initial_credits',
            label: 'Initial Credits',
            value: 3,
            description: 'Number of free credits given to a new user on registration',
            category: 'credits'
        },
        {
            key: 'credits_per_resume',
            label: 'Credits Per Resume',
            value: 1,
            description: 'Number of credits deducted when a user creates a resume',
            category: 'credits'
        },
        {
            key: 'credits_per_job_post_cover_letter',
            label: 'Credits Per Job Post Cover Letter',
            value: 1,
            description: 'Number of credits deducted when a user generates a job post cover letter',
            category: 'credits'
        },
        {
            key: 'credits_per_upwork_estimate',
            label: 'Credits Per Upwork Estimate',
            value: 1,
            description: 'Number of credits deducted when a user estimates Upwork timeline & budget',
            category: 'credits'
        },
        {
            key: 'credits_per_upwork_proposal',
            label: 'Credits Per Upwork Proposal',
            value: 1,
            description: 'Number of credits deducted when a user generates an Upwork proposal',
            category: 'credits'
        },
        {
            key: 'credits_per_fiverr_estimate',
            label: 'Credits Per Fiverr Estimate',
            value: 1,
            description: 'Number of credits deducted when a user estimates Fiverr timeline & pricing',
            category: 'credits'
        },
        {
            key: 'credits_per_fiverr_proposal',
            label: 'Credits Per Fiverr Proposal',
            value: 1,
            description: 'Number of credits deducted when a user generates a Fiverr proposal',
            category: 'credits'
        },
        {
            key: 'ai_provider',
            label: 'AI Provider',
            value: 'mock',
            description: 'Active AI provider (mock, openai, anthropic, etc.). Set to "openai" when API key is ready.',
            category: 'ai'
        },
        {
            key: 'ai_model',
            label: 'AI Model',
            value: 'gpt-4o-mini',
            description: 'AI model to use for generation (ignored when provider is mock)',
            category: 'ai'
        },
        {
            key: 'openai_api_key',
            label: 'OpenAI API Key',
            value: '',
            description: 'OpenAI API key. Leave empty to use the OPENAI_API_KEY environment variable as fallback.',
            category: 'ai'
        },
        {
            key: 'price_per_credit',
            label: 'Price Per Credit',
            value: 0.80,
            description: 'Price in base currency for a single credit (pay-as-you-go rate)',
            category: 'payments'
        },
        {
            key: 'currency',
            label: 'Currency',
            value: 'usd',
            description: 'Default currency for payments (ISO 4217 lowercase)',
            category: 'payments'
        },
        {
            key: 'subscription_monthly_price',
            label: 'Monthly Subscription Price',
            value: 7.99,
            description: 'Monthly subscription price (display only — actual price set in Stripe)',
            category: 'subscription'
        },
        {
            key: 'subscription_yearly_price',
            label: 'Yearly Subscription Price',
            value: 59.99,
            description: 'Yearly subscription price (display only — actual price set in Stripe)',
            category: 'subscription'
        },
        {
            key: 'subscription_monthly_credits',
            label: 'Monthly Subscription Credits',
            value: 50,
            description: 'Number of AI credits included with the monthly subscription plan',
            category: 'subscription'
        },
        {
            key: 'subscription_yearly_credits',
            label: 'Yearly Subscription Credits',
            value: 700,
            description: 'Number of AI credits included with the yearly subscription plan',
            category: 'subscription'
        },
        {
            key: 'stripe_monthly_price_id',
            label: 'Stripe Monthly Price ID',
            value: '',
            description: 'Stripe Price ID for the monthly subscription plan (set after creating in Stripe Dashboard)',
            category: 'subscription'
        },
        {
            key: 'stripe_yearly_price_id',
            label: 'Stripe Yearly Price ID',
            value: '',
            description: 'Stripe Price ID for the yearly subscription plan (set after creating in Stripe Dashboard)',
            category: 'subscription'
        }
    ];

    for (const setting of defaults) {
        const exists = await AppSettings.findOne({ key: setting.key });
        if (!exists) {
            await AppSettings.create(setting);
        } else if (!exists.label) {
            // Backfill label for existing settings
            exists.label = setting.label;
            await exists.save();
        }
    }
};

// Keys whose values should be masked when returned to the admin UI
const SENSITIVE_KEY_PATTERNS = ['api_key', 'secret', 'password', 'token'];

/**
 * Check if a setting key is sensitive (contains api_key, secret, etc.)
 */
AppSettings.isSensitiveKey = function (key) {
    const lower = key.toLowerCase();
    return SENSITIVE_KEY_PATTERNS.some(p => lower.includes(p));
};

/**
 * Mask a sensitive value — show first 4 and last 4 chars.
 * Returns the original value if it's too short or empty.
 */
AppSettings.maskValue = function (value) {
    if (typeof value !== 'string' || value.length <= 8) return value ? '••••••••' : '';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
};

module.exports = AppSettings;
