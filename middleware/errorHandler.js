const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message); 

  const message = process.env.NODE_ENV === 'production'
    ? 'Something went wrong...Please wait'
    : err.message;

  res.status(err.status || 500).json({ message });
};

module.exports = errorHandler;