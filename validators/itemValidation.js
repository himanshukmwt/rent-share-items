const Joi = require("joi");

exports.createItemSchema = Joi.object({

  name: Joi.string()
    .min(3)
    .max(100)
    .required(),

  category: Joi.string()
    .required(),

  pricePerDay: Joi.number()
    .positive()
    .required(),

  availability: Joi.boolean()
});