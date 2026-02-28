const Joi = require('joi');

const jobPostSchema = Joi.object({
    jobDescription: Joi.string().min(10).max(10000).required()
        .messages({ 'string.min': 'Job description must be at least 10 characters' }),
    additionalInstructions: Joi.string().max(2000).optional().allow('')
});

const upworkEstimateSchema = Joi.object({
    jobDescription: Joi.string().min(10).max(10000).required()
        .messages({ 'string.min': 'Job description must be at least 10 characters' }),
    clientName: Joi.string().max(100).optional().allow(''),
    additionalInstructions: Joi.string().max(2000).optional().allow('')
});

const upworkProposalSchema = Joi.object({
    jobDescription: Joi.string().min(10).max(10000).required()
        .messages({ 'string.min': 'Job description must be at least 10 characters' }),
    clientName: Joi.string().max(100).optional().allow(''),
    additionalInstructions: Joi.string().max(2000).optional().allow('')
});

const fiverrEstimateSchema = Joi.object({
    jobDescription: Joi.string().min(10).max(10000).required()
        .messages({ 'string.min': 'Job description must be at least 10 characters' }),
    clientName: Joi.string().max(100).optional().allow(''),
    additionalInstructions: Joi.string().max(2000).optional().allow('')
});

const fiverrProposalSchema = Joi.object({
    jobDescription: Joi.string().min(10).max(10000).required()
        .messages({ 'string.min': 'Job description must be at least 10 characters' }),
    clientName: Joi.string().max(100).optional().allow(''),
    additionalInstructions: Joi.string().max(2000).optional().allow('')
});

const updateInstructionsSchema = Joi.object({
    jobPost: Joi.string().max(2000).optional().allow(''),
    upwork: Joi.string().max(2000).optional().allow(''),
    fiverr: Joi.string().max(2000).optional().allow('')
});

module.exports = {
    jobPostSchema,
    upworkEstimateSchema,
    upworkProposalSchema,
    fiverrEstimateSchema,
    fiverrProposalSchema,
    updateInstructionsSchema
};
