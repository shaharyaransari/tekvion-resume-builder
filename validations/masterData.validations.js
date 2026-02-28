const Joi = require('joi');

const masterDataCreateSchema = Joi.object({
    type: Joi.string().valid('skill', 'language', 'industry').required(),
    name: Joi.string().trim().min(1).max(100).required(),
    category: Joi.string().trim().max(50).optional().allow('', null),
    isActive: Joi.boolean().optional()
});

const masterDataUpdateSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    category: Joi.string().trim().max(50).optional().allow('', null),
    isActive: Joi.boolean().optional()
}).min(1); // At least one field required

const masterDataBulkCreateSchema = Joi.object({
    type: Joi.string().valid('skill', 'language', 'industry').required(),
    items: Joi.array().items(
        Joi.object({
            name: Joi.string().trim().min(1).max(100).required(),
            category: Joi.string().trim().max(50).optional().allow('', null),
            isActive: Joi.boolean().optional()
        })
    ).min(1).max(500).required()
});

module.exports = {
    masterDataCreateSchema,
    masterDataUpdateSchema,
    masterDataBulkCreateSchema
};
