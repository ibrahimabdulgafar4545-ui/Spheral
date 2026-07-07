const express = require('express');
const { protect, optionalAuth } = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { uploadSingle } = require('../middleware/upload');
const { parseMentionsAndNotify } = require('../utils/mentions');
const { checkContentModeration } = require('../utils/aiModerator');

const router = express.Router();

// @desc    Get trending hashtags in the last 24h
// @route   GET /api/posts/trending
// @access  Protected
router.get('/trending', protect, async (req, res, next) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const results = await Post.aggregate([
      { $match: { createdAt: { $gte: twentyFourHoursAgo }, tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const trending = results.map((r, i) => ({
      tag: `#${r._id}`,
      posts: r.count,
      category: 'Spheral Buzz',
    }));
    res.status(200).json({ success: true, trending });
  } catch (error) {
    next(error);
  }
});

// @desc    Get Feed Posts (Own posts + Friends posts)
// @route   GET /api/posts
// @access  Protected
router.get('/', protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const myId = req.user.id;
    const friendIds = req.user.friends || [];

    const user = await User.findById(req.user.id);
    const blockedUsers = user.blockedUsers || [];
    
    // Also exclude users who blocked me
    const usersWhoBlockedMe = await User.find({ blockedUsers: myId }).select('_id');
    const usersWhoBlockedMeIds = usersWhoBlockedMe.map(u => u._id);
    
    const excludeUserIds = [...blockedUsers, ...usersWhoBlockedMeIds];

    // Query posts: authored by me OR friends OR is public (exclude group posts)
    // AND author is not in my blocked list or blocked me
    const query = {
      $and: [
        {
          $or: [
            { author: myId },
            { author: { $in: friendIds } },
            { privacy: 'public' }
          ]
        },
        { author: { $nin: excludeUserIds } },
        { group: null },
        { archived: { $ne: true } }
      ]
    };

    const posts = await Post.find(query)
      .populate('author', 'name username avatar verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Build postsWithLikes array with user-specific reaction info
    const postsWithLikes = posts.map(p => {
      const liked = p.reactions ? p.reactions.some(r => r.user.toString() === req.user.id) : false;
      const reaction = p.reactions ? p.reactions.find(r => r.user.toString() === req.user.id) : null;
      return {
        ...p.toJSON(),
        id: p._id,
        liked,
        currentReaction: reaction ? reaction.type : null,
      };
    });

    res.status(200).json({ success: true, page, limit, posts: postsWithLikes });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a Post
// @route   POST /api/posts
// @access  Protected
router.post('/', protect, uploadSingle, async (req, res, next) => {
  try {
    const { content, privacy, tags, feeling, location, groupId } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({ success: false, message: 'Please add text content or an image' });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = req.file.path && req.file.path.startsWith('http') 
        ? req.file.path 
        : `/uploads/images/${req.file.filename}`;
    }

    const parsedTags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [];

    const post = await Post.create({
      author: req.user.id,
      content,
      image: imagePath,
      privacy: privacy || 'public',
      tags: parsedTags,
      feeling: feeling || null,
      location: location || null,
      group: groupId || null,
    });

    // Parse mentions and notify friends
    await parseMentionsAndNotify(content, req.user.id, 'post', post._id, req);

    // Run AI content moderation in background
    if (content) {
      checkContentModeration(post._id, 'post', content, req.user.id);
    }

    const populatedPost = await Post.findById(post._id).populate('author', 'name username avatar verified');

    res.status(201).json({
      success: true,
      post: {
        ...populatedPost.toJSON(),
        id: populatedPost._id,
        liked: false,
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get logged-in user's archived posts
// @route   GET /api/posts/archived
// @access  Protected
router.get('/archived', protect, async (req, res, next) => {
  try {
    const posts = await Post.find({ author: req.user.id, archived: true })
      .populate('author', 'name username avatar verified')
      .sort({ createdAt: -1 });

    const postsWithLikes = posts.map(post => {
      const isLiked = post.reactions.some(r => r.user.toString() === req.user.id.toString());
      return {
        ...post.toJSON(),
        id: post._id,
        liked: isLiked,
      };
    });

    res.status(200).json({ success: true, posts: postsWithLikes });
  } catch (error) {
    next(error);
  }
});

// @desc    Toggle archive status of a post
// @route   PUT /api/posts/:id/archive
// @access  Protected
router.put('/:id/archive', protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to archive this post' });
    }

    post.archived = !post.archived;
    await post.save();

    res.status(200).json({
      success: true,
      message: post.archived ? 'Post archived successfully' : 'Post unarchived successfully',
      post: {
        ...post.toJSON(),
        id: post._id,
        liked: post.likes.includes(req.user.id),
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Optional
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name username avatar verified');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const userReaction = req.user ? post.reactions.find(r => r.user.toString() === req.user.id)?.type : null;

    // Log post view if viewer is authenticated and not the author
    if (req.user && post.author._id.toString() !== req.user.id) {
      await User.findByIdAndUpdate(post.author._id, {
        $push: { postViews: { viewer: req.user.id, post: post._id, createdAt: new Date() } }
      });
    }

    res.status(200).json({
      success: true,
      post: {
        ...post.toJSON(),
        id: post._id,
        userReaction: userReaction,
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Protected
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
    }

    // Delete post comments
    await Comment.deleteMany({ post: post._id });

    // Delete notifications associated with this post
    await Notification.deleteMany({ post: post._id });

    await post.deleteOne();

    res.status(200).json({ success: true, message: 'Post removed successfully' });
  } catch (error) {
    next(error);
  }
});



// @desc    React to a post (like / love / etc.)
// @route   PUT /api/posts/:id/react
// @access  Protected
router.put('/:id/react', protect, async (req, res, next) => {
  try {
    const { reaction } = req.body; // e.g., 'like', 'love', ...
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const existing = post.reactions.find(r => r.user.toString() === req.user.id);
    if (existing) {
      if (existing.type === reaction) {
        // toggle off
        post.reactions = post.reactions.filter(r => r.user.toString() !== req.user.id);
      } else {
        // change reaction type
        existing.type = reaction;
      }
    } else {
      post.reactions.push({ user: req.user.id, type: reaction });
      if (post.author.toString() !== req.user.id) {
        await Notification.create({
          recipient: post.author,
          actor: req.user.id,
          type: 'reaction',
          post: post._id,
          content: `reacted ${reaction} to your post`,
        });

        // Socket notify
        const io = req.app.get('io');
        if (io) {
          const { onlineUsers } = require('../config/socket');
          const targetSocketId = onlineUsers.get(post.author.toString());
          if (targetSocketId) {
            io.to(targetSocketId).emit('newNotificationNotify', {
              message: `${req.user.name} reacted ${reaction} to your post`
            });
          }
        }
      }
    }
    await post.save();
    res.status(200).json({ success: true, reactions: post.reactions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
