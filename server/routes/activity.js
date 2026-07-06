const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @desc    Get user activity log
// @route   GET /api/activity
// @access  Protected
router.get('/', protect, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const activities = [];

    // Posts
    const posts = await Post.find({ author: userId }).sort({ createdAt: -1 }).limit(30);
    posts.forEach(post => {
      activities.push({
        id: post._id.toString() + '-post',
        type: 'post',
        text: 'You created a new post.',
        timestamp: post.createdAt,
        link: `/?post=${post._id}`
      });
    });

    // Liked posts
    const likedPosts = await Post.find({ likes: userId }).sort({ createdAt: -1 }).limit(30);
    likedPosts.forEach(post => {
      activities.push({
        id: post._id.toString() + '-like',
        type: 'like',
        text: 'You liked a post.',
        timestamp: post.createdAt, // This isn't exactly when the like happened, but close enough for mockup
        link: `/?post=${post._id}`
      });
    });

    // Comments
    const comments = await Comment.find({ user: userId }).sort({ createdAt: -1 }).limit(30);
    comments.forEach(comment => {
      activities.push({
        id: comment._id.toString() + '-comment',
        type: 'comment',
        text: `You commented: "${comment.text}"`,
        timestamp: comment.createdAt,
        link: `/?post=${comment.post}`
      });
    });

    // Sort all activities by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json({ success: true, activity: activities });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
