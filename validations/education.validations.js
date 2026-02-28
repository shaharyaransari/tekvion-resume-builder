// validations/education.validations.js
const Joi = require('joi');

const educationSchema = Joi.object({
  institution: Joi.string().min(2).max(100).required(),
  degree: Joi.string().min(2).max(100).required(),
  fieldOfStudy: Joi.string().max(100).allow('', null).optional(),

  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  isOngoing: Joi.boolean().optional(),

  grade: Joi.string().max(50).allow('', null).optional(),
  description: Joi.string().max(2000).allow('', null).optional(),
  activities: Joi.array().items(Joi.string().max(200)).optional()
});

module.exports = {
  educationSchema
};
