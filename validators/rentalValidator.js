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


// to check body,query,params
// exports.createRentalSchema = Joi.object({

//   body: Joi.object({
//     itemId: Joi.string().required(),
//     startDate: Joi.date().required(),
//     endDate: Joi.date()
//       .greater(Joi.ref("startDate"))
//       .required()
//   }),

//   query: Joi.object({}).unknown(true),

//   params: Joi.object({}).unknown(true)

// });