const Joi = require('joi');

const initialTemplateSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  category: Joi.string().valid('professional', 'creative', 'minimal', 'academic', 'modern', 'other').optional(),
  isActive: Joi.boolean().optional()
});

module.exports = {
  initialTemplateSchema
};
