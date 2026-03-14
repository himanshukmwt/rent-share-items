const Joi = require("joi");

exports.createRentalSchema = Joi.object({

  itemId: Joi.string()
    .required(),

  startDate: Joi.date()
    .required(),

  endDate: Joi.date()
    .greater(Joi.ref("startDate"))
    .required()

});


