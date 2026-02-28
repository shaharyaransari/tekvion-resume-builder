const Joi = require('joi');

const appSettingSchema = Joi.object({
    key: Joi.string().min(2).max(100).required(),
    value: Joi.alternatives().try(
        Joi.string(),
        Joi.number(),
        Joi.boolean(),
        Joi.object(),
        Joi.array()
    ).required(),
    description: Joi.string().max(500).optional(),
    category: Joi.string().valid('credits', 'ai', 'general').optional()
});

const appSettingUpdateSchema = Joi.object({
    value: Joi.alternatives().try(
        Joi.string().allow(''),
        Joi.number(),
        Joi.boolean(),
        Joi.object(),
        Joi.array()
    ).optional()
});

module.exports = {
    appSettingSchema,
    appSettingUpdateSchema
};
