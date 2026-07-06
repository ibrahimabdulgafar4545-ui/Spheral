const express = require('express');
const { protect } = require('../middleware/auth');
const Group = require('../models/Group');
const Post = require('../models/Post');

const router = express.Router();

// @desc    List groups (with search/category filtering)
// @route   GET /api/groups
// @access  Protected
router.get('/', protect, async (req, res, next) => {
  try {
    const { q, category } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') }
      ];
    }

    const groups = await Group.find(filter)
      .populate('admins', 'name username avatar verified')
      .sort({ memberCount: -1 });

    const groupsWithStatus = groups.map(g => {
      const isJoined = g.members.includes(req.user.id);
      return {
        ...g.toJSON(),
        id: g._id,
        isJoined,
      };
    });

    res.status(200).json({ success: true, groups: groupsWithStatus });
  } catch (error) {
    next(error);
  }
});

// @desc    Create a Group
// @route   POST /api/groups
// @access  Protected
router.post('/', protect, async (req, res, next) => {
  try {
    const { name, description, cover, category, privacy } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Please provide group name and category' });
    }

    const group = await Group.create({
      name,
      description,
      cover,
      category,
      privacy: privacy || 'public',
      admins: [req.user.id],
      members: [req.user.id],
      memberCount: 1,
      recentActivity: 'Group created just now',
    });

    res.status(201).json({
      success: true,
      group: {
        ...group.toJSON(),
        id: group._id,
        isJoined: true,
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get groups joined by current user
// @route   GET /api/groups/mine
// @access  Protected
router.get('/mine', protect, async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user.id })
      .populate('admins', 'name username avatar verified')
      .sort({ memberCount: -1 });

    const groupsWithStatus = groups.map(g => ({
      ...g.toJSON(),
      id: g._id,
      isJoined: true,
    }));

    res.status(200).json({ success: true, groups: groupsWithStatus });
  } catch (error) {
    next(error);
  }
});

// @desc    Get group detail
// @route   GET /api/groups/:id
// @access  Protected
router.get('/:id', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('admins', 'name username avatar verified')
      .populate('members', 'name username avatar verified');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isJoined = group.members.some(m => m._id.toString() === req.user.id);

    res.status(200).json({
      success: true,
      group: {
        ...group.toJSON(),
        id: group._id,
        isJoined,
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Join / Leave a Group
// @route   PUT /api/groups/:id/join
// @access  Protected
router.put('/:id/join', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isJoined = group.members.includes(req.user.id);
    let updated;

    if (isJoined) {
      updated = await Group.findByIdAndUpdate(
        req.params.id,
        {
          $pull: { members: req.user.id },
          $inc: { memberCount: -1 }
        },
        { new: true }
      );
    } else {
      updated = await Group.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: { members: req.user.id },
          $inc: { memberCount: 1 }
        },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      isJoined: !isJoined,
      memberCount: updated.memberCount,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get group posts
// @route   GET /api/groups/:id/posts
// @access  Protected
router.get('/:id/posts', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check membership for private groups
    if (group.privacy === 'private' && !group.members.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view private group posts' });
    }

    const posts = await Post.find({ group: req.params.id })
      .populate('author', 'name username avatar verified')
      .sort({ createdAt: -1 });

    const postsWithLikes = posts.map(post => {
      const isLiked = post.likes.includes(req.user.id);
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

// @desc    Create a post in group
// @route   POST /api/groups/:id/posts
// @access  Protected
router.post('/:id/posts', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Must be a member to post in this group' });
    }

    const { content, image } = req.body;
    if (!content && !image) {
      return res.status(400).json({ success: false, message: 'Please add text content or an image' });
    }

    const post = await Post.create({
      author: req.user.id,
      content,
      image,
      privacy: 'public', // Group posts are public to members
      group: group._id,
    });

    // Increment group post count
    group.postCount += 1;
    group.recentActivity = `New post added by ${req.user.name}`;
    await group.save();

    const populated = await Post.findById(post._id).populate('author', 'name username avatar verified');

    res.status(201).json({
      success: true,
      post: {
        ...populated.toJSON(),
        id: populated._id,
        liked: false,
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update a Group
// @route   PUT /api/groups/:id
// @access  Protected
router.put('/:id', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isAdmin = group.admins.some(a => a.toString() === req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this group' });
    }

    const { name, description, cover, category, privacy } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (cover) group.cover = cover;
    if (category) group.category = category;
    if (privacy) group.privacy = privacy;

    await group.save();

    res.status(200).json({ success: true, group });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a Group
// @route   DELETE /api/groups/:id
// @access  Protected
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isAdmin = group.admins.some(a => a.toString() === req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this group' });
    }

    // Delete all posts in this group
    await Post.deleteMany({ group: group._id });
    
    // Delete the group itself
    await Group.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
