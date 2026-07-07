const express = require('express');
const { protect } = require('../middleware/auth');
const Story = require('../models/Story');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadStoryCreative } = require('../middleware/upload');
const { parseMentionsAndNotify } = require('../utils/mentions');

const router = express.Router();

// @desc    Get current user and friends' stories
// @route   GET /api/stories
// @access  Protected
router.get('/', protect, async (req, res, next) => {
  try {
    const myId = req.user.id;
    const friendIds = req.user.friends || [];
    const userIds = [myId, ...friendIds];

    // Load blocked data
    const me = await User.findById(myId);
    const blockedByMe = me?.blockedUsers || [];
    const usersWhoBlockedMe = await User.find({ blockedUsers: myId }).select('_id');
    const blockedMeIds = usersWhoBlockedMe.map(u => u._id.toString());
    const excludeUserIds = [...blockedByMe.map(id => id.toString()), ...blockedMeIds];

    const stories = await Story.find({
      user: { $in: userIds },
      expiresAt: { $gt: new Date() }
    })
      .populate('user', 'name username avatar verified')
      .sort({ createdAt: -1 });

    const formatted = [];
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const s of stories) {
      // Skip if story owner is blocked or blocked me
      const ownerId = s.user._id.toString();
      if (excludeUserIds.includes(ownerId)) continue;

      // Skip if this user is explicitly excluded from the story
      if (s.excludedUsers && s.excludedUsers.map(id => id.toString()).includes(myId)) continue;

      // Visibility checks
      if (s.visibility === 'only_me' && ownerId !== myId) continue;
      if (s.visibility === 'friends' && !friendIds.map(id => id.toString()).includes(ownerId)) continue;
      // 'everyone' passes automatically

      const activeSlides = s.slides.filter(slide => new Date(slide.createdAt) > cutoff);
      if (activeSlides.length > 0) {
        formatted.push({
          id: s._id,
          user: s.user,
          isCurrentUser: ownerId === myId,
          hasStory: true,
          slides: activeSlides,
        });
      }
    }

    res.status(200).json({ success: true, stories: formatted });
  } catch (error) {
    next(error);
  }
});

// @desc    Create/Add to a Story
// @route   POST /api/stories
// @access  Protected
router.post('/', protect, uploadStoryCreative, async (req, res, next) => {
  try {
    const { caption, duration } = req.body;
    const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;
    const customAudioFile = req.files && req.files['customAudio'] ? req.files['customAudio'][0] : null;

    let imagePath = null;
    if (imageFile) {
      imagePath = `/uploads/images/${imageFile.filename}`;
    } else if (req.body.image) {
      imagePath = req.body.image;
    } else {
      return res.status(400).json({ success: false, message: 'Please upload or provide an image for the story' });
    }

    const slideDuration = parseInt(duration, 10) || 5000;

    let story = await Story.findOne({
      user: req.user.id,
      expiresAt: { $gt: new Date() }
    });

    // Apply visibility and excluded users if provided (for existing story)
    if (req.body.visibility) {
      story.visibility = req.body.visibility;
    }
    if (req.body.excludedUsers) {
      try {
        const excl = JSON.parse(req.body.excludedUsers);
        story.excludedUsers = excl;
      } catch (e) {
        console.error('Failed to parse excludedUsers', e);
      }
    }

    let overlays = [];
    if (req.body.overlays) {
      try { overlays = JSON.parse(req.body.overlays); } catch (e) { console.error('Failed to parse story overlays', e); }
    }
    let embed = null;
    if (req.body.embed) {
      try { embed = JSON.parse(req.body.embed); } catch (e) { console.error('Failed to parse story embed', e); }
    }

    let imagePath = null;
    if (imageFile) {
      imagePath = imageFile.path && imageFile.path.startsWith('http') 
        ? imageFile.path 
        : `/uploads/images/${imageFile.filename}`;
    } else if (req.body.image) {
      imagePath = req.body.image;
    } else {
      return res.status(400).json({ success: false, message: 'Please upload or provide an image for the story' });
    }

    const audioUrl = customAudioFile 
      ? (customAudioFile.path && customAudioFile.path.startsWith('http') ? customAudioFile.path : `/uploads/files/${customAudioFile.filename}`) 
      : (req.body.audioUrl || null);

    if (story) {
      // Add slide
      story.slides.push({
        image: imagePath,
        caption: caption || '',
        duration: slideDuration,
        audioUrl,
        overlays,
        embed,
        createdAt: new Date(),
      });
      // Extend expiration to 24 hours from now
      story.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await story.save();
    } else {
      // Create new story
      story = await Story.create({
          user: req.user.id,
          slides: [{
            image: imagePath,
            caption: caption || '',
            duration: slideDuration,
            audioUrl,
            overlays,
            embed,
            createdAt: new Date(),
          }],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          visibility: req.body.visibility || 'everyone',
          excludedUsers: req.body.excludedUsers ? JSON.parse(req.body.excludedUsers) : [],
        });
    }

    // Parse mentions and notify friends
    await parseMentionsAndNotify(caption, req.user.id, 'story', story._id, req);

    // Notify original content author if they aren't the sharer
    if (embed && embed.authorId && embed.authorId.toString() !== req.user.id) {
      const author = await User.findById(embed.authorId);
      if (author && author.preferences?.likes !== false) {
        await Notification.create({
          recipient: embed.authorId,
          actor: req.user.id,
          type: 'like', // fits likes activity notification structure
          content: `shared your ${embed.contentType} to their story`,
        });

        // Socket notify
        const io = req.app.get('io');
        if (io) {
          const { onlineUsers } = require('../config/socket');
          const targetSocketId = onlineUsers.get(embed.authorId.toString());
          if (targetSocketId) {
            io.to(targetSocketId).emit('newNotificationNotify', {
              message: `${req.user.name} shared your ${embed.contentType} to their story`
            });
          }
        }
      }
    }

    const populated = await Story.findById(story._id).populate('user', 'name username avatar verified');

    res.status(201).json({
      success: true,
      story: {
        id: populated._id,
        user: populated.user,
        isCurrentUser: true,
        hasStory: true,
        slides: populated.slides,
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Toggle like status of a specific slide in a story
// @route   PUT /api/stories/:storyId/slides/:slideId/like
// @access  Protected
router.put('/:storyId/slides/:slideId/like', protect, async (req, res, next) => {
  try {
    const { storyId, slideId } = req.params;
    const myId = req.user.id;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ success: false, message: 'Story not found' });

    // Find the slide
    const slide = story.slides.id(slideId);
    if (!slide) return res.status(404).json({ success: false, message: 'Slide not found' });

    // Check if user already liked
    if (!slide.likes) slide.likes = [];
    const likedIndex = slide.likes.indexOf(myId);
    let liked = false;

    if (likedIndex > -1) {
      // Unlike
      slide.likes.splice(likedIndex, 1);
    } else {
      // Like
      slide.likes.push(myId);
      liked = true;

      // Create notification for the story owner if it's not our own story
      if (story.user.toString() !== myId) {
        const Notification = require('../models/Notification');
        await Notification.create({
          recipient: story.user,
          actor: myId,
          type: 'like',
          content: 'liked your status update',
        });
      }
    }

    await story.save();
    res.status(200).json({ success: true, liked, likes: slide.likes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
