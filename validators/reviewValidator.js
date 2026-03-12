const Joi = require("joi");

exports.reviewSchema = Joi.object({

  rentalId: Joi.string()
    .required(),

  rating: Joi.number()
    .min(1)
    .max(5)
    .required(),

  comment: Joi.string()
    .max(500)
});