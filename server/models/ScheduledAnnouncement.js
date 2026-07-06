const mongoose = require('mongoose');

const ScheduledAnnouncementSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    sent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduledAnnouncement', ScheduledAnnouncementSchema);
