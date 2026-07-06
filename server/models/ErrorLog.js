const mongoose = require('mongoose');

const ErrorLogSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    stack: {
      type: String,
    },
    url: {
      type: String,
    },
    method: {
      type: String,
    },
    statusCode: {
      type: Number,
      default: 500,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ErrorLog', ErrorLogSchema);
