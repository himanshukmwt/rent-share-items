const Joi = require("joi");

exports.kycSchema = Joi.object({

  aadhaar: Joi.string()
    .length(12)
    .required(),

  pan: Joi.string()
    .length(10)
    .required()
});