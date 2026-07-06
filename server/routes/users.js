const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const { checkProfileImpersonation } = require('../utils/aiModerator');

const router = express.Router();

// @desc    Search Users
// @route   GET /api/users/search
// @access  Protected
router.get('/search', protect, async (req, res, next) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.status(200).json({ success: true, users: [] });
    }

    const regex = new RegExp(query, 'i');
    const users = await User.find({
      $or: [{ name: regex }, { username: regex }],
      _id: { $ne: req.user.id },
    })
      .select('name username avatar bio location verified')
      .limit(10);

    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

// @desc    Get User By Username
// @route   GET /api/users/username/:username
// @access  Protected
router.get('/username/:username', protect, async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('_id');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, userId: user._id });
  } catch (error) {
    next(error);
  }
});

// @desc    Get User Profile
// @route   GET /api/users/:id
// @access  Protected
router.get('/:id', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friends', 'name username avatar bio location verified');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Log profile view if not own profile
    if (req.user.id !== req.params.id) {
      await User.findByIdAndUpdate(req.params.id, {
        $push: { profileViews: { viewer: req.user.id, createdAt: new Date() } }
      });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// @desc    Update User Profile
// @route   PUT /api/users/:id
// @access  Protected
router.put('/:id', protect, async (req, res, next) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this profile' });
    }

    const userToUpdate = await User.findById(req.user._id);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, username, bio, location, website, workplace, education, age, relationshipStatus, city, country, school, avatar, coverPhoto, privacySettings, isProfessional, category, publicContact, preferences } = req.body;

    const fieldsToUpdate = {};
    
    // Cooldown logic for display name and username
    const nameChanged = name !== undefined && name !== userToUpdate.name;
    const usernameChanged = username !== undefined && username !== userToUpdate.username;

    if (nameChanged || usernameChanged) {
      // Check if cooldown is active (not admin and lastNameChangeAt is set)
      if (!userToUpdate.isAdmin && userToUpdate.lastNameChangeAt) {
        const cooldownDays = 30;
        const lastChange = new Date(userToUpdate.lastNameChangeAt);
        const cooldownEnd = new Date(lastChange.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
        if (cooldownEnd > new Date()) {
          const diffMs = cooldownEnd.getTime() - Date.now();
          const remainingDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
          return res.status(400).json({
            success: false,
            message: `You can change your name or username again in ${remainingDays} days.`
          });
        }
      }
      
      // Update lastNameChangeAt
      fieldsToUpdate.lastNameChangeAt = new Date();
    }

    if (name !== undefined) fieldsToUpdate.name = name;

    if (usernameChanged) {
      const lowerUsername = username.toLowerCase();
      if (lowerUsername.length < 3 || lowerUsername.length > 30 || !/^[a-zA-Z0-9_]+$/.test(lowerUsername)) {
        return res.status(400).json({ success: false, message: 'Username must be 3-30 alphanumeric characters' });
      }
      const usernameExists = await User.findOne({ username: lowerUsername });
      if (usernameExists) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }
      fieldsToUpdate.username = lowerUsername;
    }

    if (bio !== undefined) fieldsToUpdate.bio = bio;
    if (location !== undefined) fieldsToUpdate.location = location;
    if (website !== undefined) fieldsToUpdate.website = website;
    if (workplace !== undefined) fieldsToUpdate.workplace = workplace;
    if (education !== undefined) fieldsToUpdate.education = education;
    if (age !== undefined) fieldsToUpdate.age = age;
    if (relationshipStatus !== undefined) fieldsToUpdate.relationshipStatus = relationshipStatus;
    if (city !== undefined) fieldsToUpdate.city = city;
    if (country !== undefined) fieldsToUpdate.country = country;
    if (school !== undefined) fieldsToUpdate.school = school;
    if (avatar !== undefined) fieldsToUpdate.avatar = avatar;
    if (coverPhoto !== undefined) fieldsToUpdate.coverPhoto = coverPhoto;
    if (isProfessional !== undefined) fieldsToUpdate.isProfessional = isProfessional;
    if (category !== undefined) fieldsToUpdate.category = category;
    if (publicContact !== undefined) fieldsToUpdate.publicContact = publicContact;

    if (privacySettings !== undefined) {
      fieldsToUpdate.privacySettings = {
        ...userToUpdate.privacySettings,
        ...privacySettings
      };
    }

    if (preferences !== undefined) {
      fieldsToUpdate.preferences = {
        ...userToUpdate.preferences,
        ...preferences
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true }
    );

    if (fieldsToUpdate.name) {
      checkProfileImpersonation(updatedUser._id);
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    next(error);
  }
});

// @desc    Upload Profile Avatar / Cover
// @route   POST /api/users/:id/upload
// @access  Protected
router.post('/:id/upload', protect, uploadSingle, async (req, res, next) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload files' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const type = req.query.type || 'avatar';
    const filePath = `/uploads/images/${req.file.filename}`;

    const updateField = type === 'cover' ? { coverPhoto: filePath } : { avatar: filePath };

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateField },
      { new: true }
    );

    res.status(200).json({ success: true, user: updatedUser, path: filePath });
  } catch (error) {
    next(error);
  }
});

// @desc    Get User Posts
// @route   GET /api/users/:id/posts
// @access  Protected
router.get('/:id/posts', protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: req.params.id, archived: { $ne: true } })
      .populate('author', 'name username avatar verified')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, page, limit, posts });
  } catch (error) {
    next(error);
  }
});

// @desc    Get User Friends
// @route   GET /api/users/:id/friends
// @access  Protected
router.get('/:id/friends', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate(
      'friends',
      'name username avatar bio location verified'
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, friends: user.friends });
  } catch (error) {
    next(error);
  }
});

// @desc    Update User Preferences (theme and/or language)
// @route   PUT /api/users/:id/preferences
// @access  Protected
router.put('/:id/preferences', protect, async (req, res, next) => {
  try {
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update these preferences' });
    }

    const { theme, language } = req.body;
    const updates = {};

    if (theme) {
      if (!['light', 'dark'].includes(theme)) {
        return res.status(400).json({ success: false, message: 'Invalid theme value' });
      }
      updates['preferences.theme'] = theme;
    }

    if (language) {
      const VALID_LANGS = ['en', 'fr', 'es', 'ar', 'ha', 'yo', 'pt'];
      if (!VALID_LANGS.includes(language)) {
        return res.status(400).json({ success: false, message: 'Invalid language code' });
      }
      updates['preferences.language'] = language;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid preference fields provided' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    );

    res.status(200).json({ success: true, preferences: updatedUser.preferences });
  } catch (error) {
    next(error);
  }
});

// @desc    Block / Unblock a User
// @route   POST /api/users/:id/block
// @access  Protected
router.post('/:id/block', protect, async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    }

    const user = await User.findById(req.user._id);
    const isBlocked = user.blockedUsers.includes(targetUserId);

    if (isBlocked) {
      user.blockedUsers.pull(targetUserId);
    } else {
      user.blockedUsers.push(targetUserId);
      // Remove from friends if they are friends
      user.friends.pull(targetUserId);
      await User.findByIdAndUpdate(targetUserId, { $pull: { friends: user._id } });
    }

    await user.save();
      console.log('🔒 Blocked users for', user._id.toString(), user.blockedUsers);
    res.status(200).json({ success: true, isBlocked: !isBlocked, blockedUsers: user.blockedUsers });
  } catch (error) {
    next(error);
  }
});

// @desc    Get Professional Insights/Dashboard data
// @route   GET /api/users/:id/insights
// @access  Protected (Owner only)
router.get('/:id/insights', protect, async (req, res, next) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these insights' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDaysAgo = new Date(now.getTime() - 7 * oneDay);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * oneDay);

    // Profile Visits Calculations
    const profileVisitsTotal = user.profileViews?.length || 0;
    const profileVisits7d = user.profileViews?.filter(v => v.createdAt >= sevenDaysAgo).length || 0;
    const profileVisits30d = user.profileViews?.filter(v => v.createdAt >= thirtyDaysAgo).length || 0;

    // Post Views Calculations
    const postViewsTotal = user.postViews?.length || 0;
    const postViews7d = user.postViews?.filter(v => v.createdAt >= sevenDaysAgo).length || 0;
    const postViews30d = user.postViews?.filter(v => v.createdAt >= thirtyDaysAgo).length || 0;

    // Daily breakdown for last 7 days (charts)
    const dailyVisits = Array(7).fill(0);
    const dailyPostViews = Array(7).fill(0);
    const daysLabel = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * oneDay);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      
      daysLabel.push(dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }));
      
      dailyVisits[6 - i] = user.profileViews?.filter(v => v.createdAt >= dayStart && v.createdAt <= dayEnd).length || 0;
      dailyPostViews[6 - i] = user.postViews?.filter(v => v.createdAt >= dayStart && v.createdAt <= dayEnd).length || 0;
    }

    res.status(200).json({
      success: true,
      insights: {
        profileVisits: {
          total: profileVisitsTotal,
          last7d: profileVisits7d,
          last30d: profileVisits30d,
          daily: dailyVisits,
        },
        postViews: {
          total: postViewsTotal,
          last7d: postViews7d,
          last30d: postViews30d,
          daily: dailyPostViews,
        },
        followers: {
          total: user.followersCount || 0,
          growth7d: Math.round((user.followersCount || 0) * 0.1),
          growth30d: Math.round((user.followersCount || 0) * 0.25),
        },
        labels: daysLabel
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Acknowledge verification celebration
// @route   POST /api/users/acknowledge-verification
// @access  Protected
router.post('/acknowledge-verification', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.verificationCelebrationShown = true;
    await user.save();
    
    res.status(200).json({ success: true, message: 'Verification celebration acknowledged' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
