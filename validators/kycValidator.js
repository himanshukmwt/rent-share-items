const Joi = require("joi");

exports.kycSchema = Joi.object({
  documentType: Joi.string()
    .valid('aadhar', 'pan')
    .required()
    .messages({
      'any.only':     'Document type must be aadhar or pan',
      'any.required': 'Document type is required'
    }),

  documentNumber: Joi.string()
    .required()
    .when('documentType', {
      switch: [
        {
          is:   'aadhar',
          then: Joi.string()
            .length(12)
            .pattern(/^[0-9]+$/)
            .messages({
              'string.length':       'Aadhar number must be 12 digits',
              'string.pattern.base': 'Aadhar must contain only numbers'
            })
        },
        {
          is:   'pan',
          then: Joi.string()
            .length(10)
            .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
            .messages({
              'string.length':       'PAN must be 10 characters',
              'string.pattern.base': 'Invalid PAN format (e.g. ABCDE1234F)'
            })
        }
      ]
    })
    .messages({
      'any.required': 'Document number is required'
    })
});