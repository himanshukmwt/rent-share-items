const Joi = require("joi");

exports.reviewSchema = Joi.object({
  rentalId: Joi.string()
    .required()
    .messages({
      'any.required': 'Rental ID is required'
    }),

  rating: Joi.number()
    .min(1)
    .max(5)
    .integer()        
    .required()
    .messages({
      'number.min':     'Rating must be at least 1',
      'number.max':     'Rating cannot exceed 5',
      'number.integer': 'Rating must be a whole number',
      'any.required':   'Rating is required'
    }),

  comment: Joi.string()
    .max(500)
    .allow('')        
    .optional()
    .messages({
      'string.max': 'Comment cannot exceed 500 characters'
    })
});