const express = require('express');
const router = express.Router();
const Reel = require('../models/Reel');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { checkContentModeration } = require('../utils/aiModerator');
const { protect } = require('../middleware/auth');
const { uploadReelCreative } = require('../middleware/upload');

// Helper to format a reel for the client
const formatReel = (reel, userId) => ({
  ...reel.toJSON(),
  id: reel._id,
  liked: reel.reactions.some(r => r.user.toString() === userId.toString()),
  saved: reel.savedBy.some(id => id.toString() === userId.toString()),
  commentsCount: reel.comments.length,
  // Return the current user's reaction type if exists
  currentReaction: (reel.reactions.find(r => r.user.toString() === userId.toString()) || {}).type || null,
});

// ─── GET all reels ────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const blocked = user.blockedUsers || [];

    const reels = await Reel.find({
      author: { $nin: blocked },
      notInterested: { $nin: [req.user.id] }, // skip "not interested"
    })
      .populate('author', 'name username avatar verified')
      .populate('comments.user', 'name username avatar')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ success: true, reels: reels.map(r => formatReel(r, req.user.id)) });
  } catch (err) {
    next(err);
  }
});

// ─── POST upload reel ─────────────────────────────────────────────────────────
router.post('/upload', protect, uploadReelCreative, async (req, res, next) => {
  try {
    const videoFile = req.files && req.files['video'] ? req.files['video'][0] : null;
    const customAudioFile = req.files && req.files['customAudio'] ? req.files['customAudio'][0] : null;

    if (!videoFile) {
      return res.status(400).json({ success: false, message: 'Please upload a video file' });
    }
    const videoPath = videoFile.path && videoFile.path.startsWith('http') 
      ? videoFile.path 
      : `/uploads/files/${videoFile.filename}`;
    
    let overlays = [];
    if (req.body.overlays) {
      try { overlays = JSON.parse(req.body.overlays); } catch (e) { console.error('Failed to parse reel overlays', e); }
    }

    const audioUrl = customAudioFile 
      ? (customAudioFile.path && customAudioFile.path.startsWith('http') ? customAudioFile.path : `/uploads/files/${customAudioFile.filename}`) 
      : (req.body.audioUrl || null);

    const reel = await Reel.create({
      author: req.user.id,
      videoUrl: videoPath,
      caption: req.body.caption || '',
      audioName: req.body.audioName || 'Original Audio',
      audioUrl: audioUrl,
      overlays
    });
    const populated = await Reel.findById(reel._id)
      .populate('author', 'name username avatar verified');

    // Run AI content moderation in background
    if (req.body.caption) {
      checkContentModeration(reel._id, 'reel', req.body.caption, req.user.id);
    }

    res.status(201).json({ success: true, reel: formatReel(populated, req.user.id) });
  } catch (err) {
    console.error('Reel upload error:', err);
    next(err);
  }
});

// ─── PUT react (like / love / etc.) ────────────────────────────────────────────────
router.put('/:id/react', protect, async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const { reaction } = req.body; // e.g., 'like', 'love', ...
    const userId = req.user.id.toString();
    const existing = reel.reactions.find(r => r.user.toString() === userId);

    if (existing) {
      if (existing.type === reaction) {
        // toggle off
        reel.reactions = reel.reactions.filter(r => r.user.toString() !== userId);
      } else {
        // change reaction type
        existing.type = reaction;
      }
    } else {
      reel.reactions.push({ user: userId, type: reaction });
      if (reel.author.toString() !== userId) {
        await Notification.create({
          recipient: reel.author,
          actor: req.user.id,
          type: 'reaction',
          post: reel._id,
          content: `reacted ${reaction} to your reel`,
        });

        // Socket notify
        const io = req.app.get('io');
        if (io) {
          const { onlineUsers } = require('../config/socket');
          const targetSocketId = onlineUsers.get(reel.author.toString());
          if (targetSocketId) {
            io.to(targetSocketId).emit('newNotificationNotify', {
              message: `${req.user.name} reacted ${reaction} to your reel`
            });
          }
        }
      }
    }
    await reel.save();
    res.json({ success: true, reactions: reel.reactions });
  } catch (err) { next(err); }
});

// ─── PUT save / unsave ────────────────────────────────────────────────────────
router.put('/:id/save', protect, async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const isSaved = reel.savedBy.some(id => id.toString() === req.user.id);
    if (isSaved) {
      reel.savedBy.pull(req.user.id);
    } else {
      reel.savedBy.addToSet(req.user.id);
    }
    await reel.save();
    res.json({ success: true, saved: !isSaved });
  } catch (err) { next(err); }
});

// ─── PUT not interested ───────────────────────────────────────────────────────
router.put('/:id/not-interested', protect, async (req, res, next) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { notInterested: req.user.id } },
      { new: true }
    );
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ─── PUT share (increment count) ──────────────────────────────────────────────
router.put('/:id/share', protect, async (req, res, next) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { sharesCount: 1 } },
      { new: true }
    );
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
    res.json({ success: true, sharesCount: reel.sharesCount });
  } catch (err) { next(err); }
});

// ─── POST comment ─────────────────────────────────────────────────────────────
router.post('/:id/comment', protect, async (req, res, next) => {
  try {
    const { text, type, fileUrl } = req.body;
    if (type !== 'sticker' && !text?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text required' });
    }
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    reel.comments.push({
      user: req.user.id,
      text: text ? text.trim() : '',
      type: type || 'text',
      fileUrl: fileUrl || null,
      createdAt: Date.now()
    });
    await reel.save();

    const populated = await Reel.findById(reel._id)
      .populate('comments.user', 'name username avatar');

    const io = req.app.get('io');
    if (io) {
      io.emit('reelCommentAdded', { reelId: reel._id.toString(), comments: populated.comments });
    }

    res.status(201).json({ success: true, comments: populated.comments });
  } catch (err) { next(err); }
});

// ─── PUT edit a comment ────────────────────────────────────────────────────────
router.put('/:id/comment/:commentId', protect, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Text required' });
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
    const comment = reel.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }
    comment.text = text.trim();
    comment.isEdited = true;
    await reel.save();
    const populated = await Reel.findById(reel._id).populate('comments.user', 'name username avatar');

    const io = req.app.get('io');
    if (io) {
      io.emit('reelCommentEdited', {
        reelId: reel._id.toString(),
        commentId: req.params.commentId,
        comments: populated.comments
      });
    }

    res.json({ success: true, comments: populated.comments });
  } catch (err) { next(err); }
});

// ─── DELETE a comment ─────────────────────────────────────────────────────────
router.delete('/:id/comment/:commentId', protect, async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
    const comment = reel.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.user.toString() !== req.user.id && reel.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised' });
    }
    comment.deleteOne();
    await reel.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('reelCommentDeleted', { reelId: reel._id.toString(), commentId: req.params.commentId });
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) { next(err); }
});

// ─── GET saved reels for the current user ────────────────────────────────────
router.get('/saved', protect, async (req, res, next) => {
  try {
    const reels = await Reel.find({ savedBy: req.user.id })
      .populate('author', 'name username avatar verified')
      .sort({ createdAt: -1 });
    res.json({ success: true, reels: reels.map(r => formatReel(r, req.user.id)) });
  } catch (err) { next(err); }
});

// ─── GET reels by user ID ────────────────────────────────────────────────────
router.get('/user/:userId', protect, async (req, res, next) => {
  try {
    const reels = await Reel.find({ author: req.params.userId })
      .populate('author', 'name username avatar verified')
      .sort({ createdAt: -1 });
    res.json({ success: true, reels: reels.map(r => formatReel(r, req.user.id)) });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE reel (owner only) ─────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    // Only the author can delete
    if (reel.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this reel' });
    }

    // Remove video file from disk
    try {
      const filePath = path.join(__dirname, '..', reel.videoUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) { /* ignore missing file */ }

    await reel.deleteOne();
    res.json({ success: true, message: 'Reel deleted' });
  } catch (err) { next(err); }
});

// ─── PUT react to comment ────────────────────────────────────────────────────
router.put('/:id/comments/:commentId/react', protect, async (req, res, next) => {
  try {
    const { reaction } = req.body; // e.g. 'like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const comment = reel.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    if (!comment.reactions) {
      comment.reactions = [];
    }

    const myId = req.user.id.toString();
    const existingIndex = comment.reactions.findIndex(r => r.user.toString() === myId);

    if (existingIndex > -1) {
      if (comment.reactions[existingIndex].type === reaction) {
        // Toggle off
        comment.reactions.splice(existingIndex, 1);
      } else {
        // Change reaction type
        comment.reactions[existingIndex].type = reaction;
      }
    } else {
      // Add reaction
      comment.reactions.push({ user: myId, type: reaction });

      // Notify comment author
      if (comment.user.toString() !== myId) {
        await Notification.create({
          recipient: comment.user,
          actor: req.user.id,
          type: 'reaction',
          post: reel._id,
          content: `reacted ${reaction} to your comment`,
        });

        // Socket notify
        const io = req.app.get('io');
        if (io) {
          const { onlineUsers } = require('../config/socket');
          const targetSocketId = onlineUsers.get(comment.user.toString());
          if (targetSocketId) {
            io.to(targetSocketId).emit('newNotificationNotify', {
              message: `${req.user.name} reacted ${reaction} to your comment`
            });
          }
        }
      }
    }

    await reel.save();

    const populated = await Reel.findById(reel._id)
      .populate('comments.user', 'name username avatar');

    const io = req.app.get('io');
    if (io) {
      io.emit('reelCommentReacted', { reelId: reel._id.toString(), comments: populated.comments });
    }

    res.status(200).json({ success: true, comments: populated.comments });
  } catch (err) { next(err); }
});

module.exports = router;

