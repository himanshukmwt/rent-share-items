const Joi = require("joi");
const depositRules = require('../config/depositRules'); 

const categories = Object.keys(depositRules).filter(key => key !== 'default');

exports.createItemSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Item name must be at least 3 characters',
      'string.max': 'Item name cannot exceed 100 characters',
      'any.required': 'Item name is required'
    }),

  category: Joi.string()
    .valid(...categories) 
    .required()
    .messages({
      'any.only': `Category must be one of: ${categories.join(', ')}`,
      'any.required': 'Category is required'
    }),

  description: Joi.string()
    .max(500)
    .allow('')
    .optional(),

  pricePerDay: Joi.number()
    .positive()
    .max(5000)
    .required()
    .messages({
      'number.positive': 'Price must be a positive number',
      'number.max':      'Price cannot exceed ₹20,000 per day',
      'any.required':    'Price per day is required'
    }),

  availability: Joi.boolean().optional(),
  attributes:   Joi.string().optional()
});