const express = require('express');
const { protect } = require('../middleware/auth');
const Report = require('../models/Report');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AdminLog = require('../models/AdminLog');

const router = express.Router();

// @desc    Submit a content report and execute automatic AI moderation
// @route   POST /api/reports
// @access  Protected
router.post('/', protect, async (req, res, next) => {
  try {
    const { contentId, contentType, reason, description } = req.body;
    if (!contentId || !contentType || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide contentId, contentType, and reason' });
    }

    const report = await Report.create({
      reporter: req.user.id,
      contentId,
      contentType,
      reason,
      description: description || '',
    });

    // ─── Automatic AI Moderation Action ─────────────────────────────────────
    let reportedUserId = null;
    try {
      if (contentType === 'user') {
        reportedUserId = contentId;
      } else if (contentType === 'post') {
        const Post = require('../models/Post');
        const postObj = await Post.findById(contentId);
        if (postObj) reportedUserId = postObj.author;
      } else if (contentType === 'reel') {
        const Reel = require('../models/Reel');
        const reelObj = await Reel.findById(contentId);
        if (reelObj) reportedUserId = reelObj.author;
      } else if (contentType === 'comment') {
        const Comment = require('../models/Comment');
        const commentObj = await Comment.findById(contentId);
        if (commentObj) reportedUserId = commentObj.author;
      }

      if (reportedUserId && String(reportedUserId) !== String(req.user.id)) {
        const reportedUser = await User.findById(reportedUserId);
        if (reportedUser) {
          reportedUser.warningsCount = (reportedUser.warningsCount || 0) + 1;

          if (reportedUser.warningsCount < 3) {
            await reportedUser.save();

            // Send warning notification
            await Notification.create({
              recipient: reportedUserId,
              actor: req.user.id,
              type: 'warning',
              content: `A report was submitted against your content for "${reason}". This is warning #${reportedUser.warningsCount}/2. Please ensure your future posts respect our community rules to prevent account suspension.`,
            });
          } else {
            // Threshold exceeded -> Suspend user automatically
            reportedUser.accountStatus = 'suspended';
            reportedUser.statusReason = `Automatically suspended by AI moderation after exceeding warning limits (3 violations). Last violation reason: ${reason}.`;
            await reportedUser.save();

            // Log this administrative action
            await AdminLog.create({
              adminId: null, // null represents system/AI actor
              action: 'suspend_user',
              targetId: reportedUserId,
              targetModel: 'User',
              details: `User automatically suspended by AI moderation after warning threshold (3) exceeded. Reason for final report: ${reason}.`,
            });

            // Send final notice notification
            await Notification.create({
              recipient: reportedUserId,
              actor: req.user.id,
              type: 'warning',
              content: 'Your account has been automatically suspended due to multiple content policy violations.',
            });
          }

          // Mark report as resolved by AI system
          report.status = 'resolved';
          await report.save();
        }
      }
    } catch (moderationErr) {
      console.error('Error during automatic AI report moderation:', moderationErr);
    }

    res.status(201).json({ success: true, message: 'Content reported successfully', report });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
