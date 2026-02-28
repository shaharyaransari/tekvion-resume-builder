const Joi = require('joi');

const experienceSchema = Joi.object({
  jobTitle: Joi.string().min(2).max(100).required(),
  company: Joi.string().min(2).max(100).required(),
  location: Joi.string().max(200).optional().allow(null, ''),
  companyLogo: Joi.string().uri().optional().allow(null, ''),

  employmentType: Joi.string().valid(
    'Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Temporary', 'Self-employed'
  ).optional(),

  industry: Joi.string().max(100).optional().allow(null, ''),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  isCurrent: Joi.boolean().optional(),

  description: Joi.string().max(2000).optional().allow(null, ''),
  achievements: Joi.array().items(Joi.string().max(300)).optional(),
  technologiesUsed: Joi.array().items(Joi.string().max(100)).optional()
});

module.exports = { experienceSchema };