const express = require('express');
const { protect, adminProtect } = require('../middleware/auth');
const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Comment = require('../models/Comment');
const Report = require('../models/Report');
const AdminLog = require('../models/AdminLog');
const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const FeedbackInsight = require('../models/FeedbackInsight');
const ScheduledAnnouncement = require('../models/ScheduledAnnouncement');
const SibApiV3Sdk = require('@getbrevo/brevo');
const ErrorLog = require('../models/ErrorLog');
const SystemConfig = require('../models/SystemConfig');
const mongoose = require('mongoose');

const router = express.Router();

// All admin routes are protected by adminProtect
router.use(protect, adminProtect);

// @desc    Get platform stats
// @route   GET /api/admin/stats
// @access  Admin
router.get('/stats', async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalReels = await Reel.countDocuments();
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const signups7Days = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const signups30Days = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const activeUsers24h = await User.countDocuments({ lastSeen: { $gte: activeThreshold } });
    
    // Fallback: If lastSeen is not frequently updated, we can also count users who are currently 'isOnline: true'
    const onlineUsersCount = await User.countDocuments({ isOnline: true });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPosts,
        totalReels,
        signups7Days,
        signups30Days,
        activeUsers24h: Math.max(activeUsers24h, onlineUsersCount),
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get support tickets
// @route   GET /api/admin/support
// @access  Admin
router.get('/support', async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const tickets = await SupportTicket.find(filter)
      .populate('user', 'name username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      tickets,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update support ticket status
// @route   PUT /api/admin/support/:id/status
// @access  Admin
router.put('/support/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const ticketId = req.params.id;

    const ticket = await SupportTicket.findById(ticketId).populate('user', 'name');
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.status = status;
    await ticket.save();

    await AdminLog.create({
      adminId: req.user._id || req.user.id,
      action: 'resolve_ticket',
      targetId: ticketId,
      targetModel: 'SupportTicket',
      details: `Marked ticket ${ticketId} as ${status}`,
    });

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    next(error);
  }
});

const { callGroq } = require('../utils/groq');
const { sendEmail } = require('../utils/email');

// @desc    Generate AI reply for a support ticket
// @route   POST /api/admin/support/:id/generate-reply
// @access  Admin
router.post('/support/:id/generate-reply', async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate('user', 'name');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const messages = [
      { role: 'system', content: 'You are a helpful customer support agent for the Spheral social media platform. Keep your replies friendly, concise, and professional.' },
      { role: 'user', content: `The user ${ticket.user.name} submitted this support ticket:\n\nSubject: ${ticket.subject}\nMessage: ${ticket.message}\n\nPlease generate a polite email response to help them or acknowledge their issue.` }
    ];

    const reply = await callGroq(messages);

    res.status(200).json({ success: true, reply });
  } catch (error) {
    next(error);
  }
});

// @desc    Send reply via email and resolve ticket
// @route   POST /api/admin/support/:id/send-reply
// @access  Admin
router.post('/support/:id/send-reply', async (req, res, next) => {
  try {
    const { message } = req.body;
    const ticketId = req.params.id;

    const ticket = await SupportTicket.findById(ticketId).populate('user', 'name email');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2>Hi ${ticket.user.name},</h2>
        <p style="white-space: pre-wrap;">${message}</p>
        <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">
          Re: ${ticket.subject || 'Your Support Ticket'}
        </p>
      </div>
    `;

    // Send email
    await sendEmail(ticket.user.email, `Re: ${ticket.subject || 'Your Support Ticket'}`, htmlContent);

    // Resolve ticket
    ticket.status = 'resolved';
    await ticket.save();

    await AdminLog.create({
      adminId: req.user._id || req.user.id,
      action: 'resolve_ticket',
      targetId: ticketId,
      targetModel: 'SupportTicket',
      details: `Replied and resolved ticket ${ticketId}`,
    });

    res.status(200).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
});

// @desc    Get reports
// @route   GET /api/admin/reports
// @access  Admin
router.get('/reports', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const reports = await Report.find(filter)
      .populate('reporter', 'name username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      reports,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update report status and take action
// @route   PUT /api/admin/reports/:id/status
// @access  Admin
router.put('/reports/:id/status', async (req, res, next) => {
  try {
    const { status, actionDetails } = req.body;
    const reportId = req.params.id;

    const report = await Report.findById(reportId).populate('reporter', 'name');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = status;
    await report.save();

    let targetModelForLog = report.contentType.charAt(0).toUpperCase() + report.contentType.slice(1);
    if (targetModelForLog === 'User') {
      targetModelForLog = 'User';
    }

    if (actionDetails) {
      await AdminLog.create({
        adminId: req.user._id || req.user.id,
        action: actionDetails, // e.g. 'dismiss_report', 'warn_user', 'remove_content', 'suspend_user', 'ban_user'
        targetId: report.contentId,
        targetModel: targetModelForLog,
        details: `Action taken on report ${reportId}`,
      });

      // Handle specific actions
      if (actionDetails === 'remove_content') {
        const Model = report.contentType === 'post' ? Post : report.contentType === 'reel' ? Reel : report.contentType === 'comment' ? Comment : null;
        if (Model) {
          await Model.findByIdAndDelete(report.contentId);
        }
      } else if (actionDetails === 'suspend_user' || actionDetails === 'ban_user') {
        let userIdToPunish = report.contentId; 
        if (report.contentType !== 'user') {
          // If the report was on a post/comment, we'd need to find the author.
          const Model = report.contentType === 'post' ? Post : report.contentType === 'reel' ? Reel : report.contentType === 'comment' ? Comment : null;
          if (Model) {
            const content = await Model.findById(report.contentId);
            if (content) userIdToPunish = content.user || content.author;
          }
        }
        
        if (userIdToPunish) {
          await User.findByIdAndUpdate(userIdToPunish, {
            accountStatus: actionDetails === 'suspend_user' ? 'suspended' : 'banned',
            statusReason: `Report ${reportId} resolved`,
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all users (searchable)
// @route   GET /api/admin/users
// @access  Admin
router.get('/users', async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]
      };
    }
    
    const users = await User.find(query)
      .select('name username email avatar accountStatus createdAt isOnline isAdmin verified')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Admin
router.put('/users/:id/status', async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    const userId = req.params.id;

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    userToUpdate.accountStatus = status;
    userToUpdate.statusReason = reason || '';
    await userToUpdate.save();

    let actionName = 'warn_user';
    if (status === 'suspended') actionName = 'suspend_user';
    if (status === 'banned') actionName = 'ban_user';
    if (status === 'active') actionName = 'unban_user';

    await AdminLog.create({
      adminId: req.user._id || req.user.id,
      action: actionName,
      targetId: userId,
      targetModel: 'User',
      details: reason || `User status changed to ${status}`,
    });

    res.status(200).json({
      success: true,
      user: userToUpdate,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Toggle verified status on user
// @route   PUT /api/admin/users/:id/verify
// @access  Admin
router.put('/users/:id/verify', async (req, res, next) => {
  try {
    const { verified } = req.body;
    const userId = req.params.id;

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    userToUpdate.verified = verified;
    if (verified) {
      userToUpdate.verificationCelebrationShown = false;
    }
    await userToUpdate.save();

    await AdminLog.create({
      adminId: req.user._id || req.user.id,
      action: verified ? 'verify_user' : 'unverify_user',
      targetId: userId,
      targetModel: 'User',
      details: verified ? 'User was verified by admin' : 'User verification was revoked by admin',
    });

    if (verified) {
      // Create DB notification
      await Notification.create({
        recipient: userId,
        actor: req.user._id || req.user.id,
        type: 'verification',
        content: '🎉 Congratulations! Your account has been verified',
      });

      // Emit real-time socket events
      const io = req.app.get('io');
      if (io) {
        const { onlineUsers } = require('../config/socket');
        const socketId = onlineUsers.get(userId.toString());
        if (socketId) {
          io.to(socketId).emit('newNotificationNotify', {
            message: '🎉 Congratulations! Your account has been verified'
          });
          io.to(socketId).emit('verified_celebration');
        }
      }
    }

    res.status(200).json({
      success: true,
      user: userToUpdate,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Toggle admin status on user
// @route   PUT /api/admin/users/:id/admin
// @access  Admin
router.put('/users/:id/admin', async (req, res, next) => {
  try {
    const { isAdmin } = req.body;
    const userId = req.params.id;

    // Prevent an admin from removing their own admin privilege to avoid lock-out
    if (userId.toString() === req.user._id.toString() || userId.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot revoke your own administrator privileges' });
    }

    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    userToUpdate.isAdmin = isAdmin;
    await userToUpdate.save();

    await AdminLog.create({
      adminId: req.user._id || req.user.id,
      action: isAdmin ? 'promote_admin' : 'demote_admin',
      targetId: userId,
      targetModel: 'User',
      details: isAdmin ? 'User was promoted to admin' : 'User admin role was revoked',
    });

    res.status(200).json({
      success: true,
      user: userToUpdate,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Broadcast announcement to all users
// @route   POST /api/admin/broadcast
// @access  Admin
router.post('/broadcast', async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const users = await User.find({ _id: { $ne: req.user.id } }, '_id');
    const notificationsData = users.map(u => ({
      recipient: u._id,
      actor: req.user.id,
      type: 'broadcast',
      content: message,
    }));

    await Notification.insertMany(notificationsData);

    // Emit socket event if io exists
    const io = req.app.get('io');
    if (io) {
      io.emit('broadcast_announcement', {
        actor: {
          _id: req.user.id,
          name: req.user.name,
          avatar: req.user.avatar,
        },
        type: 'broadcast',
        content: message,
      });
    }

    await AdminLog.create({
      adminId: req.user._id || req.user.id,
      action: 'broadcast_announcement',
      targetId: req.user._id || req.user.id,
      targetModel: 'User',
      details: `Broadcast: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
    });

    res.status(200).json({
      success: true,
      message: 'Announcement broadcasted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get cached feedback insights
// @route   GET /api/admin/feedback-insights
// @access  Admin
router.get('/feedback-insights', async (req, res, next) => {
  try {
    const latest = await FeedbackInsight.findOne().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      insights: latest ? JSON.parse(latest.insights) : null,
      lastGenerated: latest ? latest.lastGenerated : null
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Generate feedback insights using Groq
// @route   POST /api/admin/feedback-insights/generate
// @access  Admin
router.post('/feedback-insights/generate', async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const feedbackList = await SupportTicket.find({
      type: 'feedback',
      createdAt: { $gte: thirtyDaysAgo }
    }).populate('user', 'name email');

    if (feedbackList.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No feedback submissions found in the last 30 days.',
        insights: null
      });
    }

    const formattedFeedback = feedbackList.map((f, index) => {
      return `${index + 1}. User: ${f.user?.name || 'Anonymous'} (${f.user?.email || 'N/A'})\nDate: ${f.createdAt}\nFeedback: ${f.message}`;
    }).join('\n\n');

    const promptMessages = [
      {
        role: 'system',
        content: 'You are an AI feedback analyst. Analyze the following user feedback. Group similar issues/requests into themes. For each theme, count the number of users mentioning it and write a brief summary of their comments. Also identify the overall sentiment of all feedback as Positive, Negative, or Mixed. Output your response as a valid JSON object ONLY. Do not include markdown formatting, backticks, or explanation outside the JSON. The JSON structure must be exactly: {"sentiment": "Positive|Negative|Mixed", "themes": [{"themeName": "Theme Title", "count": number, "summary": "Theme summary"}]}'
      },
      {
        role: 'user',
        content: `Here is the user feedback:\n\n${formattedFeedback}`
      }
    ];

    let groqResponse = await callGroq(promptMessages);
    
    if (groqResponse.startsWith('```')) {
      groqResponse = groqResponse.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(groqResponse);
    
    if (parsed.themes && Array.isArray(parsed.themes)) {
      parsed.themes = parsed.themes.map(t => ({
        ...t,
        highPriority: t.count >= 5
      }));
    }

    await FeedbackInsight.create({
      insights: JSON.stringify(parsed),
      lastGenerated: new Date()
    });

    res.status(200).json({
      success: true,
      insights: parsed,
      lastGenerated: new Date()
    });
  } catch (error) {
    console.error('Error generating feedback insights:', error);
    res.status(500).json({ success: false, message: 'Failed to generate insights: ' + error.message });
  }
});

let cachedEngagement = null;
let lastCacheTime = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// @desc    Get engagement analytics
// @route   GET /api/admin/engagement
// @access  Admin
router.get('/engagement', async (req, res, next) => {
  try {
    const now = Date.now();
    if (cachedEngagement && lastCacheTime && (now - lastCacheTime < CACHE_DURATION)) {
      return res.status(200).json({
        success: true,
        cached: true,
        data: cachedEngagement,
        lastUpdated: lastCacheTime
      });
    }

    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // 1. DAU / MAU
    const dau = await User.countDocuments({
      $or: [
        { lastSeen: { $gte: oneDayAgo } },
        { isOnline: true }
      ]
    });
    const mau = await User.countDocuments({
      lastSeen: { $gte: thirtyDaysAgo }
    });

    // 2. Signups over time (last 30 days)
    const signupsRaw = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing days for continuous line chart
    const signupsMap = new Map(signupsRaw.map(item => [item._id, item.count]));
    const signupsOverTime = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      signupsOverTime.push({
        date: dateStr,
        count: signupsMap.get(dateStr) || 0
      });
    }

    // 3. Retention (Day-7 cohort)
    const startOfCohort = new Date(now - 8 * 24 * 60 * 60 * 1000);
    const endOfCohort = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const cohortTotal = await User.countDocuments({
      createdAt: { $gte: startOfCohort, $lte: endOfCohort }
    });
    const cohortActive = await User.countDocuments({
      createdAt: { $gte: startOfCohort, $lte: endOfCohort },
      lastSeen: { $gte: endOfCohort }
    });
    const retentionRate = cohortTotal > 0 ? Math.round((cohortActive / cohortTotal) * 100) : 0;

    // 4. Feature usage breakdown (last 30 days)
    const postsCount = await Post.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const reelsCount = await Reel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    const Message = require('../models/Message');
    const messagesCount = await Message.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    
    const Story = require('../models/Story');
    const storiesCount = await Story.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    const liveCount = await Notification.countDocuments({
      type: 'live',
      createdAt: { $gte: thirtyDaysAgo }
    });

    const featureUsage = {
      posts: postsCount,
      reels: reelsCount,
      messages: messagesCount,
      stories: storiesCount,
      liveStreams: liveCount
    };

    // 5. Peak usage hours (0-23)
    const postHours = await Post.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } }
    ]);
    const messageHours = await Message.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } }
    ]);

    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, count: 0 }));
    postHours.forEach(item => {
      if (item._id !== null && item._id >= 0 && item._id < 24) {
        hourlyActivity[item._id].count += item.count;
      }
    });
    messageHours.forEach(item => {
      if (item._id !== null && item._id >= 0 && item._id < 24) {
        hourlyActivity[item._id].count += item.count;
      }
    });

    cachedEngagement = {
      dau: Math.max(dau, 1),
      mau: Math.max(mau, 1),
      signupsOverTime,
      retention: {
        cohortTotal,
        cohortActive,
        rate: retentionRate
      },
      featureUsage,
      hourlyActivity
    };
    lastCacheTime = now;

    res.status(200).json({
      success: true,
      cached: false,
      data: cachedEngagement,
      lastUpdated: lastCacheTime
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get system health status
// @route   GET /api/admin/health
// @access  Admin
router.get('/health', async (req, res, next) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = dbStatus === 1 ? 'up' : 'down';
    const uptime = process.uptime();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const errorCount24h = await ErrorLog.countDocuments({
      statusCode: { $gte: 500 },
      createdAt: { $gte: oneDayAgo }
    });

    res.status(200).json({
      success: true,
      health: {
        database: dbStatusText,
        uptime,
        errorCount24h
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get geographic user signup breakdown
// @route   GET /api/admin/geo-insights
// @access  Admin
router.get('/geo-insights', async (req, res, next) => {
  try {
    const geoStats = await User.aggregate([
      {
        $group: {
          _id: "$country",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const countryBreakdown = geoStats.map(item => ({
      country: item._id || 'Unknown',
      count: item.count
    }));

    res.status(200).json({
      success: true,
      data: countryBreakdown
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get list of pending scheduled announcements
// @route   GET /api/admin/announcements/scheduled
// @access  Admin
router.get('/announcements/scheduled', async (req, res, next) => {
  try {
    const list = await ScheduledAnnouncement.find({ sent: false }).sort({ scheduledFor: 1 });
    res.status(200).json({
      success: true,
      scheduled: list
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Schedule an announcement for later
// @route   POST /api/admin/announcements/schedule
// @access  Admin
router.post('/announcements/schedule', async (req, res, next) => {
  try {
    const { message, scheduledFor } = req.body;
    if (!message || !message.trim() || !scheduledFor) {
      return res.status(400).json({ success: false, message: 'Message and schedule time are required' });
    }

    const scheduleDate = new Date(scheduledFor);
    if (isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
      return res.status(400).json({ success: false, message: 'Schedule time must be a valid future date' });
    }

    const scheduled = await ScheduledAnnouncement.create({
      message: message.trim(),
      scheduledFor: scheduleDate
    });

    await AdminLog.create({
      adminId: req.user._id || req.user.id,
      action: 'broadcast_announcement',
      targetId: scheduled._id,
      targetModel: 'ScheduledAnnouncement',
      details: `Scheduled announcement for ${scheduleDate.toISOString()}: "${message.substring(0, 30)}..."`,
    });

    res.status(201).json({
      success: true,
      scheduled,
      message: 'Announcement scheduled successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Send bulk email campaign via Brevo
// @route   POST /api/admin/email-campaign
// @access  Admin
router.post('/email-campaign', async (req, res, next) => {
  try {
    const { subject, body, filter } = req.body;
    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ success: false, message: 'Subject and body are required' });
    }

    const filterCriteria = {
      email: { $exists: true, $ne: '' },
      accountStatus: 'active',
      'preferences.emailMarketingSubscribed': { $ne: false }
    };

    if (filter === 'inactive') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filterCriteria.lastSeen = { $lt: thirtyDaysAgo };
    } else if (filter === 'verified') {
      filterCriteria.verified = true;
    }

    const users = await User.find(filterCriteria, 'name email');
    if (users.length === 0) {
      return res.status(200).json({ success: true, count: 0, message: 'No matching users found' });
    }

    const brevoApiKey = process.env.BREVO_API_KEY || '';
    if (!brevoApiKey || brevoApiKey === 'YOUR_BREVO_API_KEY_HERE' || brevoApiKey === 'YOUR_BREVO_API_KEY') {
      console.log(`⚠️ Brevo API Key not configured. [DEBUG bulk email simulation] Subject: "${subject}", Total targets: ${users.length}`);
      return res.status(200).json({
        success: true,
        count: users.length,
        message: `Brevo API Key not configured. Simulated campaign sending to ${users.length} users.`,
        debug: true
      });
    }

    const transacEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
    transacEmailsApi.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'verify@spheral.com';
    const senderName = process.env.BREVO_SENDER_NAME || 'Spheral Support';

    let successCount = 0;
    let failCount = 0;

    for (const u of users) {
      try {
        const unsubscribeLink = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/unsubscribe?email=${encodeURIComponent(u.email)}`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <div style="padding: 20px 0;">
              ${body}
            </div>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="font-size: 11px; color: #888; text-align: center;">
              You received this email because you are registered on Spheral.
              <br />
              If you no longer wish to receive marketing announcements, you can 
              <a href="${unsubscribeLink}" style="color: #3b82f6; text-decoration: underline;">unsubscribe here</a>.
            </p>
          </div>
        `;

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;
        sendSmtpEmail.sender = { name: senderName, email: senderEmail };
        sendSmtpEmail.to = [{ email: u.email, name: u.name }];

        await transacEmailsApi.sendTransacEmail(sendSmtpEmail);
        successCount++;
      } catch (err) {
        console.error(`Failed to send email to ${u.email}:`, err.message);
        failCount++;
      }
    }

    await AdminLog.create({
      adminId: req.user._id || req.user.id,
      action: 'email_campaign',
      targetId: req.user._id || req.user.id,
      targetModel: 'User',
      details: `Email Campaign: "${subject}" sent to ${successCount} users (${failCount} failed)`,
    });

    res.status(200).json({
      success: true,
      count: successCount,
      failed: failCount,
      message: `Campaign sent successfully. Success: ${successCount}, Failed: ${failCount}`
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Admin
router.get('/settings', async (req, res, next) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({});
    }
    res.status(200).json({ success: true, settings: config });
  } catch (error) {
    next(error);
  }
});

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Admin
router.put('/settings', async (req, res, next) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }
    
    if (req.body.maintenanceMode !== undefined) config.maintenanceMode = req.body.maintenanceMode;
    if (req.body.allowRegistrations !== undefined) config.allowRegistrations = req.body.allowRegistrations;
    if (req.body.requireEmailVerification !== undefined) config.requireEmailVerification = req.body.requireEmailVerification;
    
    await config.save();
    
    await AdminLog.create({
      adminId: req.user._id || req.user.id,
      action: 'system_settings_update',
      targetId: config._id,
      targetModel: 'SystemConfig',
      details: `Updated System Settings`,
    });
    
    res.status(200).json({ success: true, settings: config });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
