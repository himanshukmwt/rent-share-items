const Joi = require("joi");

exports.createRentalSchema = Joi.object({
  itemId: Joi.string()
    .required()
    .messages({
      'any.required': 'Item ID is required'
    }),

  startDate: Joi.date()
    .min('now')  
    .required()
    .messages({
      'date.min':     'Start date cannot be in the past',
      'any.required': 'Start date is required'
    }),

  endDate: Joi.date()
    .greater(Joi.ref('startDate')) 
    .required()
    .messages({
      'date.greater': 'End date must be after start date',
      'any.required': 'End date is required'
    })
});