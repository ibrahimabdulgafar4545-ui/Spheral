const express = require('express');
const { protect } = require('../middleware/auth');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { parseMentionsAndNotify } = require('../utils/mentions');
const { checkContentModeration } = require('../utils/aiModerator');

const router = express.Router();

// @desc    Get comments for a post
// @route   GET /api/comments/:postId
// @access  Protected
router.get('/:postId', protect, async (req, res, next) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'name username avatar verified')
      .populate('replies.author', 'name username avatar verified')
      .sort({ createdAt: 1 });

    const commentsWithReactions = comments.map(c => {
      const reaction = c.reactions ? c.reactions.find(r => r.user.toString() === req.user.id) : null;
      return {
        ...c.toJSON(),
        id: c._id,
        liked: !!reaction,
        currentReaction: reaction ? reaction.type : null,
      };
    });

    res.status(200).json({ success: true, comments: commentsWithReactions });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a comment
// @route   POST /api/comments/:postId
// @access  Protected
router.post('/:postId', protect, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Please add comment content' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = await Comment.create({
      post: req.params.postId,
      author: req.user.id,
      content,
    });

    // Parse mentions and notify friends
    await parseMentionsAndNotify(content, req.user.id, 'comment', post._id, req);

    // Increment comment count on Post
    post.commentsCount += 1;
    await post.save();

    // Run AI content moderation in background
    if (content) {
      checkContentModeration(comment._id, 'comment', content, req.user.id);
    }

    // Create notification
    if (post.author.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.author,
        actor: req.user.id,
        type: 'comment',
        post: post._id,
        content: `commented on your post: "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`,
        postImage: post.image,
      });
    }

    const populated = await Comment.findById(comment._id).populate('author', 'name username avatar verified');

    res.status(201).json({
      success: true,
      comment: {
        ...populated.toJSON(),
        id: populated._id,
        liked: false,
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Like / Unlike a comment
// @route   PUT /api/comments/:commentId/like
// @access  Protected
router.put('/:commentId/like', protect, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const isLiked = comment.likes.includes(req.user.id);
    let updated;

    if (isLiked) {
      updated = await Comment.findByIdAndUpdate(
        req.params.commentId,
        {
          $pull: { likes: req.user.id },
          $inc: { likesCount: -1 }
        },
        { new: true }
      );
    } else {
      updated = await Comment.findByIdAndUpdate(
        req.params.commentId,
        {
          $addToSet: { likes: req.user.id },
          $inc: { likesCount: 1 }
        },
        { new: true }
      );

      // Trigger notification if liking someone else's comment
      if (comment.author.toString() !== req.user.id) {
        const author = await User.findById(comment.author);
        if (author && author.preferences?.likes !== false) {
          await Notification.create({
            recipient: comment.author,
            actor: req.user.id,
            type: 'like',
            content: 'liked your comment',
          });

          // Socket notify
          const io = req.app.get('io');
          if (io) {
            const { onlineUsers } = require('../config/socket');
            const targetSocketId = onlineUsers.get(comment.author.toString());
            if (targetSocketId) {
              io.to(targetSocketId).emit('newNotificationNotify', {
                message: `${req.user.name} liked your comment`
              });
            }
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      liked: !isLiked,
      likesCount: updated.likesCount
    });
  } catch (error) {
    next(error);
  }
});

// @desc    React to a comment (like / love / etc.)
// @route   PUT /api/comments/:commentId/react
// @access  Protected
router.put('/:commentId/react', protect, async (req, res, next) => {
  try {
    const { reaction } = req.body; // e.g. 'like', 'love', ...
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const userId = req.user.id.toString();
    const existing = comment.reactions.find(r => r.user.toString() === userId);

    if (existing) {
      if (existing.type === reaction || !reaction) {
        // toggle off or null reaction (remove)
        comment.reactions = comment.reactions.filter(r => r.user.toString() !== userId);
      } else {
        // change reaction type
        existing.type = reaction;
      }
    } else if (reaction) {
      comment.reactions.push({ user: userId, type: reaction });
      
      // Trigger notification if reacting to someone else's comment
      if (comment.author.toString() !== userId) {
        const author = await User.findById(comment.author);
        if (author && author.preferences?.likes !== false) {
          await Notification.create({
            recipient: comment.author,
            actor: req.user.id,
            type: 'reaction',
            content: `reacted ${reaction} to your comment`,
          });

          // Socket notify
          const io = req.app.get('io');
          if (io) {
            const { onlineUsers } = require('../config/socket');
            const targetSocketId = onlineUsers.get(comment.author.toString());
            if (targetSocketId) {
              io.to(targetSocketId).emit('newNotificationNotify', {
                message: `${req.user.name} reacted ${reaction} to your comment`
              });
            }
          }
        }
      }
    }

    await comment.save();
    res.status(200).json({
      success: true,
      reactions: comment.reactions,
      likesCount: comment.reactions.length,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add a reply to a comment
// @route   POST /api/comments/:commentId/reply
// @access  Protected
router.post('/:commentId/reply', protect, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, message: 'Please add reply content' });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const reply = {
      author: req.user.id,
      content,
      createdAt: new Date(),
      likes: [],
      likesCount: 0,
    };

    comment.replies.push(reply);
    await comment.save();

    const updated = await Comment.findById(comment._id)
      .populate('author', 'name username avatar verified')
      .populate('replies.author', 'name username avatar verified');

    res.status(200).json({ success: true, comment: updated });
  } catch (error) {
    next(error);
  }
});

// @desc    Edit a comment
// @route   PUT /api/comments/:commentId
// @access  Protected
router.put('/:commentId', protect, async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this comment' });
    }

    comment.content = content.trim();
    comment.isEdited = true;
    await comment.save();

    const populated = await Comment.findById(comment._id)
      .populate('author', 'name username avatar verified')
      .populate('replies.author', 'name username avatar verified');

    const reaction = populated.reactions ? populated.reactions.find(r => r.user.toString() === req.user.id) : null;

    res.json({
      success: true,
      comment: {
        ...populated.toJSON(),
        id: populated._id,
        liked: !!reaction,
        currentReaction: reaction ? reaction.type : null,
        isEdited: true,
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a comment
// @route   DELETE /api/comments/:commentId
// @access  Protected
router.delete('/:commentId', protect, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const post = await Post.findById(comment.post);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Associated post not found' });
    }

    // Check authority: comment author OR post owner
    if (comment.author.toString() !== req.user.id && post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    await comment.deleteOne();

    post.commentsCount = Math.max(0, post.commentsCount - 1);
    await post.save();

    res.status(200).json({ success: true, message: 'Comment removed successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
