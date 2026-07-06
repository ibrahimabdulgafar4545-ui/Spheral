const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');

const router = express.Router();

// @desc    Get current user's friends list
// @route   GET /api/friends
// @access  Protected
router.get('/', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate(
      'friends',
      'name username avatar bio location verified isOnline'
    );
    res.status(200).json({ success: true, friends: user.friends });
  } catch (error) {
    next(error);
  }
});

// @desc    Get pending friend requests to current user
// @route   GET /api/friends/requests
// @access  Protected
router.get('/requests', protect, async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id);
    const myFriendIds = (me.friends || []).map(id => id.toString());

    const requests = await FriendRequest.find({
      to: req.user.id,
      status: 'pending',
    }).populate('from', 'name username avatar bio location verified friends');

    const formattedRequests = requests.map(reqObj => {
      if (!reqObj.from) return reqObj;
      const fromUserObj = reqObj.from.toJSON();
      const targetFriendIds = (fromUserObj.friends || []).map(id => id.toString());
      const mutualFriendsCount = targetFriendIds.filter(id => myFriendIds.includes(id)).length;
      
      delete fromUserObj.friends; // keep response small
      
      return {
        ...reqObj.toJSON(),
        from: {
          ...fromUserObj,
          mutualFriends: mutualFriendsCount,
        }
      };
    });

    res.status(200).json({ success: true, requests: formattedRequests });
  } catch (error) {
    next(error);
  }
});

// @desc    Get friend suggestions (users who aren't friends and have no pending requests)
// @route   GET /api/friends/suggestions
// @access  Protected
router.get('/suggestions', protect, async (req, res, next) => {
  try {
    const myId = req.user.id;

    // Get current user friends list and pending requests to exclude
    const me = await User.findById(myId);
    const existingFriendIds = me.friends || [];

    // Get pending incoming requests (should be excluded from suggestions)
    const incomingRequests = await FriendRequest.find({
      to: myId,
      status: 'pending'
    });
    const incomingUserIds = incomingRequests.map(r => r.from.toString());

    // Get pending sent requests (should be INCLUDED but flagged)
    const sentRequests = await FriendRequest.find({
      from: myId,
      status: 'pending'
    });
    const sentUserIds = sentRequests.map(r => r.to.toString());

    const excludeIds = [myId, ...existingFriendIds, ...incomingUserIds];

    // Select name username avatar bio location verified AND friends
    const suggestions = await User.find({
      _id: { $nin: excludeIds }
    })
      .select('name username avatar bio location verified friends')
      .limit(30); // fetch more to sort then slice

    const existingFriendStrings = existingFriendIds.map(id => id.toString());

    // Calculate mutual friends
    const suggestionsWithMutual = suggestions.map(user => {
      const userObj = user.toJSON();
      const targetFriendStrings = (userObj.friends || []).map(id => id.toString());
      const mutualFriendsCount = targetFriendStrings.filter(id => existingFriendStrings.includes(id)).length;
      const isSent = sentUserIds.includes(userObj._id.toString());

      delete userObj.friends; // keep payload small
      
      return {
        ...userObj,
        mutualFriends: mutualFriendsCount,
        requestStatus: isSent ? 'pending_sent' : 'none',
      };
    });

    // Sort by mutual friends count descending
    suggestionsWithMutual.sort((a, b) => b.mutualFriends - a.mutualFriends);

    res.status(200).json({ success: true, suggestions: suggestionsWithMutual.slice(0, 10) });
  } catch (error) {
    next(error);
  }
});

// @desc    Send a friend request
// @route   POST /api/friends/request/:userId
// @access  Protected
router.post('/request/:userId', protect, async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const myId = req.user.id;

    if (targetUserId === myId) {
      return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already friends
    const me = await User.findById(myId);
    if (me.friends.some(id => id.toString() === targetUserId) || targetUser.friends.some(id => id.toString() === myId)) {
      return res.status(400).json({ success: false, message: 'You are already friends' });
    }

    // Check if existing pending request
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: myId, to: targetUserId },
        { from: targetUserId, to: myId }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        if (existingRequest.from.toString() === targetUserId) {
          // Auto-resolve: target user already sent a request to me. Accept immediately!
          existingRequest.status = 'accepted';
          await existingRequest.save();

          await User.findByIdAndUpdate(myId, { $addToSet: { friends: targetUserId }, $inc: { friendsCount: 1 } });
          await User.findByIdAndUpdate(targetUserId, { $addToSet: { friends: myId }, $inc: { friendsCount: 1 } });

          // Create notification
          await Notification.create({
            recipient: targetUserId,
            actor: myId,
            type: 'friend_request',
            content: 'accepted your friend request',
          });

          // Socket notify
          const io = req.app.get('io');
          if (io) {
            const { onlineUsers } = require('../config/socket');
            const targetSocketId = onlineUsers.get(targetUserId);
            if (targetSocketId) {
              io.to(targetSocketId).emit('friendRequestAcceptedNotify');
            }
          }

          return res.status(200).json({ success: true, message: 'Mutual requests auto-resolved. You are now friends!', status: 'friends' });
        }
        return res.status(400).json({ success: false, message: 'Friend request is already pending' });
      }
      
      // If request existed but was rejected, we reset it to pending
      existingRequest.status = 'pending';
      existingRequest.from = myId;
      existingRequest.to = targetUserId;
      await existingRequest.save();

      // Update social counts
      await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1, friendsCount: 1 } });
      await User.findByIdAndUpdate(myId, { $inc: { followingCount: 1 } });

      // Create notification
      await Notification.create({
        recipient: targetUserId,
        actor: myId,
        type: 'friend_request',
        content: 'sent you a friend request',
      });

      // Socket notify target user
      const io = req.app.get('io');
      if (io) {
        const { onlineUsers } = require('../config/socket');
        const targetSocketId = onlineUsers.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('newFriendRequestNotify', { from: { id: myId, name: req.user.name, avatar: req.user.avatar } });
        }
      }

      return res.status(200).json({ success: true, message: 'Friend request sent', request: existingRequest });
    }

    const request = await FriendRequest.create({
      from: myId,
      to: targetUserId,
      status: 'pending',
    });

    // Update social counts
    await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: 1, friendsCount: 1 } });
    await User.findByIdAndUpdate(myId, { $inc: { followingCount: 1 } });

    // Create notification and socket emit if preferences allow
    if (targetUser.preferences?.friendRequests !== false) {
      await Notification.create({
        recipient: targetUserId,
        actor: myId,
        type: 'friend_request',
        content: 'sent you a friend request',
      });

      // Socket notify target user
      const io = req.app.get('io');
      if (io) {
        const { onlineUsers } = require('../config/socket');
        const targetSocketId = onlineUsers.get(targetUserId);
        if (targetSocketId) {
          io.to(targetSocketId).emit('newFriendRequestNotify', { from: { id: myId, name: req.user.name, avatar: req.user.avatar } });
        }
      }
    }

    res.status(201).json({ success: true, message: 'Friend request sent', request });
  } catch (error) {
    next(error);
  }
});

// @desc    Cancel a sent friend request
// @route   POST /api/friends/request/:userId/cancel
// @access  Protected
router.post('/request/:userId/cancel', protect, async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const myId = req.user.id;

    const request = await FriendRequest.findOneAndDelete({
      from: myId,
      to: targetUserId,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Pending request not found' });
    }

    // Decrement social counts
    await User.findByIdAndUpdate(targetUserId, { $inc: { followersCount: -1, friendsCount: -1 } });
    await User.findByIdAndUpdate(myId, { $inc: { followingCount: -1 } });

    // Delete matching notification
    await Notification.findOneAndDelete({
      recipient: targetUserId,
      actor: myId,
      type: 'friend_request',
      content: 'sent you a friend request',
    });

    res.status(200).json({ success: true, message: 'Friend request cancelled' });
  } catch (error) {
    next(error);
  }
});

// @desc    Check friend status with a user
// @route   GET /api/friends/status/:userId
// @access  Protected
router.get('/status/:userId', protect, async (req, res, next) => {
  try {
    const targetUserId = req.params.userId;
    const myId = req.user.id;

    const me = await User.findById(myId);
    if (me.friends.some(id => id.toString() === targetUserId)) {
      return res.status(200).json({ success: true, status: 'friends' });
    }

    const request = await FriendRequest.findOne({
      $or: [
        { from: myId, to: targetUserId },
        { from: targetUserId, to: myId }
      ],
      status: 'pending'
    });

    if (request) {
      if (request.from.toString() === myId) {
        return res.status(200).json({ success: true, status: 'pending_sent', requestId: request._id });
      } else {
        return res.status(200).json({ success: true, status: 'pending_received', requestId: request._id });
      }
    }

    res.status(200).json({ success: true, status: 'none' });
  } catch (error) {
    next(error);
  }
});

// @desc    Accept a friend request
// @route   PUT /api/friends/request/:requestId/accept
// @access  Protected
router.put('/request/:requestId/accept', protect, async (req, res, next) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }

    if (request.to.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to accept this request' });
    }

    request.status = 'accepted';
    await request.save();

    // Add friends to both users
    await User.findByIdAndUpdate(request.from, {
      $addToSet: { friends: request.to },
      $inc: { friendsCount: 1, followersCount: 1 }
    });

    await User.findByIdAndUpdate(request.to, {
      $addToSet: { friends: request.from },
      $inc: { followingCount: 1 }
    });

    // Create notification
    await Notification.create({
      recipient: request.from,
      actor: req.user.id,
      type: 'friend_request',
      content: 'accepted your friend request',
    });

    const io = req.app.get('io');
    if (io) {
      const { onlineUsers } = require('../config/socket');
      const senderSocketId = onlineUsers.get(request.from.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit('friendRequestAcceptedNotify');
      }
    }

    res.status(200).json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    next(error);
  }
});

// @desc    Reject a friend request
// @route   PUT /api/friends/request/:requestId/reject
// @access  Protected
router.put('/request/:requestId/reject', protect, async (req, res, next) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Friend request not found' });
    }

    if (request.to.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to reject this request' });
    }

    request.status = 'rejected';
    await request.save();

    // Decrement counts
    await User.findByIdAndUpdate(request.to, { $inc: { followersCount: -1, friendsCount: -1 } });
    await User.findByIdAndUpdate(request.from, { $inc: { followingCount: -1 } });

    res.status(200).json({ success: true, message: 'Friend request rejected' });
  } catch (error) {
    next(error);
  }
});

// @desc    Remove a friend
// @route   DELETE /api/friends/:userId
// @access  Protected
router.delete('/:userId', protect, async (req, res, next) => {
  try {
    const friendId = req.params.userId;
    const myId = req.user.id;

    // Check if friends
    const me = await User.findById(myId);
    if (!me.friends.includes(friendId)) {
      return res.status(400).json({ success: false, message: 'User is not in your friends list' });
    }

    // Remove from both arrays
    await User.findByIdAndUpdate(myId, {
      $pull: { friends: friendId },
      $inc: { friendsCount: -1, followersCount: -1, followingCount: -1 }
    });

    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: myId },
      $inc: { friendsCount: -1, followersCount: -1, followingCount: -1 }
    });

    // Remove any FriendRequest object
    await FriendRequest.findOneAndDelete({
      $or: [
        { from: myId, to: friendId },
        { from: friendId, to: myId }
      ]
    });

    res.status(200).json({ success: true, message: 'Friend removed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
