// validations/resume.validation.js
const Joi = require('joi');
const mongoose = require('mongoose');

// ObjectId validator helper
const objectId = () => Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId Validation');

// Main schema
const resumeSchema = Joi.object({
  title: Joi.string().max(100).optional(),
  summary: Joi.string().max(2000).optional(),
  jobDescription: Joi.string().max(5000).optional(),

  template_id: Joi.string().optional(),

  educations: Joi.array().items(objectId()).optional(),
  experiences: Joi.array().items(objectId()).optional(),
  projects: Joi.array().items(objectId()).optional(),
  certifications: Joi.array().items(objectId()).optional(),
  awards: Joi.array().items(objectId()).optional(),

  selectedSkills: Joi.array().items(Joi.string().max(50)).optional(),
  selectedLanguages: Joi.array().items(Joi.string().max(50)).optional(),
  selectedSocialMedia: Joi.array().items(
    Joi.string().valid('LinkedIn', 'Twitter', 'GitHub', 'Facebook', 'Instagram', 'Portfolio', 'Other')
  ).optional(),

  salaryEstimate: Joi.object({
    low: Joi.number().optional(),
    high: Joi.number().optional(),
    currency: Joi.string().max(10).optional(),
    period: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional()
  }).optional().allow(null),

  hiringChance: Joi.object({
    percentage: Joi.number().min(0).max(100).optional(),
    level: Joi.string().max(50).optional(),
    factors: Joi.object().pattern(Joi.string(), Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())).optional()
  }).optional().allow(null),

  suggestions: Joi.array().items(Joi.string().max(500)).optional(),

  customFields: Joi.array().items(
    Joi.object({
      label: Joi.string().max(100).required(),
      value: Joi.string().allow('', null),
      icon: Joi.string().optional(),
      category: Joi.string().optional()
    })
  ).optional(),

  visibility: Joi.string().valid('private', 'public').optional(),

  linkedTemplateId: objectId().optional().allow(null)
});

module.exports = {
  resumeSchema
};