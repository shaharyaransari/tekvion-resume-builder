// validations/certification.validations.js
const Joi = require('joi');

const certificationSchema = Joi.object({
  name: Joi.string().min(2).max(150).required(),
  issuingOrganization: Joi.string().max(150).allow('', null).optional(),
  issueDate: Joi.date().optional(),
  expirationDate: Joi.date().optional(),
  doesNotExpire: Joi.boolean().optional(),
  credentialId: Joi.string().max(100).allow('', null).optional(),
  credentialUrl: Joi.string().uri().allow('', null).optional()
});

module.exports = { certificationSchema };
