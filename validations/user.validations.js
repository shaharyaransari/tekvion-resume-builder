const Joi = require('joi');

const userRegisterSchema = Joi.object({
  first_name: Joi.string().min(3).max(50).required(),
  last_name: Joi.string().min(3).max(50).required(),
  intro: Joi.string().optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  dateOfBirth: Joi.date().required(),
  role: Joi.string().valid('admin', 'user').default('user'),

  country: Joi.string().allow('').optional(),
  state: Joi.string().allow('').optional(),
  city: Joi.string().allow('').optional(),
  streetAddress: Joi.string().allow('').optional(),
  postalCode: Joi.string().allow('').optional(),
  profilePhoto: Joi.string().uri().allow('').optional(),


  phones: Joi.array().items(
    Joi.object({
      number: Joi.string().required(),
      isPrimary: Joi.boolean().optional()
    })
  ).optional(),

  socialMedia: Joi.array().items(
    Joi.object({
      platform: Joi.string().valid('LinkedIn', 'Twitter', 'GitHub', 'Facebook', 'Instagram', 'Portfolio', 'Other').required(),
      url: Joi.string().uri().optional()
    })
  ).optional(),

  hobbies: Joi.array().items(Joi.string()).optional(),
  skills: Joi.array().items(
    Joi.object({
      name: Joi.string().max(50).required(),
      expertise: Joi.string().valid('Beginner', 'Intermediate', 'Advanced', 'Expert').required()
    })
  ).optional(),

  languages: Joi.array().items(
    Joi.object({
      name: Joi.string().max(50).required(),
      level: Joi.string().valid('Basic', 'Conversational', 'Fluent', 'Native').required()
    })
  ).optional()
});

module.exports = {
  userRegisterSchema
};