// validations/award.validations.js
const Joi = require('joi');

const awardSchema = Joi.object({
  title: Joi.string().min(2).max(100).required(),
  issuer: Joi.string().max(100).allow('', null).optional(),
  date: Joi.date().optional(),
  description: Joi.string().max(2000).allow('', null).optional()
});

module.exports = {
  awardSchema
};