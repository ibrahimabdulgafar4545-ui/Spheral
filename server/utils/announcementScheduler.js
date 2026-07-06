const ScheduledAnnouncement = require('../models/ScheduledAnnouncement');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AdminLog = require('../models/AdminLog');

const startAnnouncementScheduler = (io) => {
  // Check every 30 seconds for higher time-picker accuracy
  setInterval(async () => {
    try {
      const now = new Date();
      const pending = await ScheduledAnnouncement.find({
        sent: false,
        scheduledFor: { $lte: now }
      });

      if (pending.length === 0) return;

      for (const ann of pending) {
        // Mark as sent immediately to avoid double processing
        ann.sent = true;
        await ann.save();

        console.log(`⏰ Executing scheduled announcement: "${ann.message}"`);

        // Create DB notifications for all users
        const users = await User.find({}, '_id');
        const notificationsData = users.map(u => ({
          recipient: u._id,
          actor: null,
          type: 'broadcast',
          content: ann.message,
        }));

        await Notification.insertMany(notificationsData);

        // Emit socket broadcast
        if (io) {
          io.emit('broadcast_announcement', {
            actor: null,
            type: 'broadcast',
            content: ann.message,
          });
        }

        // Log admin activity
        await AdminLog.create({
          adminId: null,
          action: 'broadcast_announcement',
          targetId: ann._id,
          targetModel: 'ScheduledAnnouncement',
          details: `Scheduled Broadcast auto-sent: "${ann.message.substring(0, 50)}..."`,
        });
      }
    } catch (err) {
      console.error('Error in scheduled announcement background job:', err);
    }
  }, 30 * 1000);
};

module.exports = { startAnnouncementScheduler };
