const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);

//      const dataToValidate = {
//     body: req.body,
//     query: req.query,
//     params: req.params
//   };

//   const { error } = schema.validate(dataToValidate);
  if (error) {
    return res.status(400).json({
      message: error.details[0].message
    });
  }

  next();
};

module.exports = validate;