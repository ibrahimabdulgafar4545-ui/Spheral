const ErrorLog = require('../models/ErrorLog');

const errorHandler = async (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('💥 Error Handler:', err);

  // Log 500 server errors to database for dashboard monitoring
  const statusCode = err.statusCode || error.statusCode || 500;
  if (statusCode >= 500) {
    try {
      await ErrorLog.create({
        message: err.message || 'Server Error',
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        statusCode,
        user: req.user ? (req.user._id || req.user.id) : null
      });
    } catch (logErr) {
      console.error('Failed to log error to database:', logErr);
    }
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    return res.status(400).json({ success: false, message });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    return res.status(400).json({ success: false, message });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({ success: false, message });
  }

  // JWT Token Invalid/Expired
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token, authorization denied' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired, please log in again' });
  }

  // Default response
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
  });
};

module.exports = errorHandler;
