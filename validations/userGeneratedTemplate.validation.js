const Joi = require('joi');

const userGeneratedTemplateSchema = Joi.object({
  resumeId: Joi.string().required(),
  initialTemplateId: Joi.string().optional(),
  html: Joi.string().optional()
}).or('initialTemplateId', 'html'); // At least one must be provided

module.exports = {
  userGeneratedTemplateSchema
};