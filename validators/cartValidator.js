const Joi = require("joi");

exports.addToCartSchema = Joi.object({

  itemId: Joi.string()
    .required(),

});