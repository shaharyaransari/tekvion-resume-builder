const Joi = require('joi');

const projectSchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
  role: Joi.string().max(100).allow('', null).optional(),
  description: Joi.string().max(2000).allow('', null).optional(),
  technologies: Joi.array().items(Joi.string().max(50)).optional(),
  highlights: Joi.array().items(Joi.string().max(300)).optional(),
  teamSize: Joi.number().integer().min(1).max(100).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  isOngoing: Joi.boolean().optional(),
  projectUrl: Joi.string().uri().allow('', null).optional(),
  githubRepo: Joi.string().uri().allow('', null).optional()
});

module.exports = {
  projectSchema
};