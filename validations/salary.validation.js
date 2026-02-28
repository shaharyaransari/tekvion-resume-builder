const Joi = require('joi');

const salaryEstimationSchema = Joi.object({
    jobDescription: Joi.string().min(10).max(5000).required()
        .messages({ 'string.min': 'Job description must be at least 10 characters long' }),
    country: Joi.string().max(100).optional()
        .default('United States')
});

module.exports = {
    salaryEstimationSchema
};
