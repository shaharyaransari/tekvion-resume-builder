const Joi = require('joi');

const createCreditCheckoutSchema = Joi.object({
    creditAmount: Joi.number().integer().min(1).max(100).required()
        .messages({ 'number.min': 'Must purchase at least 1 credit' })
});

const createSubscriptionCheckoutSchema = Joi.object({
    plan: Joi.string().valid('monthly', 'yearly').required()
});

module.exports = {
    createCreditCheckoutSchema,
    createSubscriptionCheckoutSchema
};
