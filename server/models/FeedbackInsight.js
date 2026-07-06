const mongoose = require('mongoose');

const FeedbackInsightSchema = new mongoose.Schema(
  {
    insights: {
      type: String,
      required: true,
    },
    lastGenerated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeedbackInsight', FeedbackInsightSchema);
