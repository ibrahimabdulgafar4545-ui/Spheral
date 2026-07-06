const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: ['dismiss_report', 'warn_user', 'remove_content', 'suspend_user', 'ban_user', 'unban_user', 'broadcast_announcement', 'email_campaign', 'verify_user', 'unverify_user', 'promote_admin', 'demote_admin', 'resolve_ticket', 'system_settings_update'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    targetModel: {
      type: String,
      required: true,
      enum: ['User', 'Post', 'Reel', 'Comment', 'Message', 'Report', 'ScheduledAnnouncement', 'SupportTicket', 'SystemConfig'],
    },
    details: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdminLog', AdminLogSchema);
