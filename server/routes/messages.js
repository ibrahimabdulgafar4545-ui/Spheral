const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadMessageFile } = require('../middleware/upload');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { onlineUsers } = require('../config/socket');
const mongoose = require('mongoose');

const router = express.Router();

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
// @access  Protected
router.get('/conversations', protect, async (req, res, next) => {
  try {
    const myId = req.user.id;

    // Find conversations where user is participant
    const conversations = await Conversation.find({
      participants: myId,
    })
      .populate('participants', 'name username avatar isOnline lastSeen verified')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name username' },
      })
      .sort({ updatedAt: -1 });

    // Format response to identify friend details easily
    const formatted = conversations.map((conv) => {
      const friend = conv.participants.find((p) => p.id !== myId && p._id.toString() !== myId);
      return {
        id: conv._id,
        friend,
        lastMessage: conv.lastMessage,
        updatedAt: conv.updatedAt,
      };
    });

    res.status(200).json({ success: true, conversations: formatted });
  } catch (error) {
    next(error);
  }
});

// @desc    Get total unread message count for current user
// @route   GET /api/messages/unread-count
// @access  Protected
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const myId = req.user.id;
    const count = await Message.countDocuments({
      receiver: myId,
      status: { $ne: 'seen' },
      deletedFor: { $ne: myId }
    });
    res.status(200).json({ success: true, count });
  } catch (error) {
    next(error);
  }
});


// @desc    Get messages conversation history with a friend (creates conversation if not exists)
// @route   GET /api/messages/:friendId
// @access  Protected
router.get('/:friendId', protect, async (req, res, next) => {
  try {
    const friendId = req.params.friendId;
    const myId = req.user.id;

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [myId, friendId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [myId, friendId],
      });
    }

    // Mark messages in this conversation from friend to me as seen
    await Message.updateMany(
      { conversation: conversation._id, sender: friendId, status: { $ne: 'seen' } },
      { $set: { status: 'seen' } }
    );

    const messages = await Message.find({
      conversation: conversation._id,
      deletedFor: { $ne: myId },
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'name username avatar')
      .populate('receiver', 'name username avatar')
      .populate({
        path: 'parentMessage',
        populate: { path: 'sender', select: 'name username' }
      });

    res.status(200).json({ success: true, conversationId: conversation._id, messages });
  } catch (error) {
    next(error);
  }
});

// @desc    Send a message (supports media uploads)
// @route   POST /api/messages
// @access  Protected
router.post('/', protect, uploadMessageFile, async (req, res, next) => {
  try {
    const { receiverId, content, parentMessageId, type, fileUrl: bodyFileUrl } = req.body;
    const myId = req.user.id;
    const file = req.file;

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required' });
    }

    if (!content && !file && !bodyFileUrl) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [myId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [myId, receiverId],
      });
    }

    let fileUrl = bodyFileUrl || null;
    let messageType = type || 'text';

    if (file) {
      fileUrl = file.path;
      if (file.mimetype.startsWith('image/')) {
        messageType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        messageType = 'video';
      } else if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
        messageType = 'audio';
      }

      // Build a fake message for immediate UI feedback (no DB save yet)
      const fakeMsg = {
        _id: new mongoose.Types.ObjectId(),
        conversation: null,
        sender: myId,
        receiver: receiverId,
        content: '',
        type: messageType,
        fileUrl,
        status: 'sent',
        parentMessage: parentMessageId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Emit back to sender's socket only (so their local UI adds it as a pending/sent message)
      const io = req.app.get('io');
      if (io) {
        const senderSocketId = onlineUsers.get(myId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messageSent', fakeMsg);
        }
      }

      return res.status(201).json({ success: true, message: fakeMsg });
    }



    const message = await Message.create({
      conversation: conversation._id,
      sender: myId,
      receiver: receiverId,
      content: content ? content.trim() : '',
      type: messageType,
      fileUrl,
      status: 'sent',
      parentMessage: parentMessageId || null,
    });

    // Update conversation lastMessage reference
    conversation.lastMessage = message._id;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username avatar')
      .populate('receiver', 'name username avatar')
      .populate({
        path: 'parentMessage',
        populate: { path: 'sender', select: 'name username' }
      });

    // Socket.io Real-time dispatching
    const io = req.app.get('io');
    if (io) {
      const recipientSocketId = onlineUsers.get(receiverId);
      if (recipientSocketId) {
        // Change status to delivered because they are online
        message.status = 'delivered';
        await message.save();
        populatedMessage.status = 'delivered';

        io.to(recipientSocketId).emit('receiveMessage', populatedMessage);
      }
      
      // Also emit back to sender's other tabs if any
      const senderSocketId = onlineUsers.get(myId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messageSent', populatedMessage);
      }
    }

    // ── Create notification for recipient (if they have messages alerts on) ──
    try {
      const recipientUser = await User.findById(receiverId).select('preferences name');
      const senderUser = await User.findById(myId).select('name');
      const wantsMessages = recipientUser?.preferences?.messages !== false;

      if (wantsMessages) {
        // Avoid duplicate: don't create another notification if one exists in last 10 mins for same pair
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const existing = await Notification.findOne({
          recipient: receiverId,
          actor: myId,
          type: 'message',
          createdAt: { $gte: tenMinsAgo },
        });

        if (!existing) {
          await Notification.create({
            recipient: receiverId,
            actor: myId,
            type: 'message',
            content: 'sent you a message',
          });
        }

        // Always fire real-time bell update so badge increments
        const io2 = req.app.get('io');
        if (io2) {
          const recipientSocketId2 = onlineUsers.get(receiverId);
          if (recipientSocketId2) {
            io2.to(recipientSocketId2).emit('newNotificationNotify', {
              message: `${senderUser?.name || 'Someone'} sent you a message`,
            });
          }
        }
      }
    } catch (notifErr) {
      console.error('Failed to create message notification:', notifErr);
    }

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    next(error);
  }
});



// @desc    Edit a message
// @route   PUT /api/messages/:messageId
// @access  Protected
router.put('/:messageId', protect, async (req, res, next) => {
  try {
    const { content } = req.body;
    const myId = req.user.id;
    const messageId = req.params.messageId;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content cannot be empty' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.sender.toString() !== myId) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this message' });
    }

    message.content = content.trim();
    message.isEdited = true;
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username avatar')
      .populate('receiver', 'name username avatar')
      .populate({
        path: 'parentMessage',
        populate: { path: 'sender', select: 'name username' }
      });

    // Real-time socket updates for edit
    const io = req.app.get('io');
    if (io) {
      const recipientSocketId = onlineUsers.get(message.receiver.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('messageEdited', populatedMessage);
      }
      const senderSocketId = onlineUsers.get(myId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messageEdited', populatedMessage);
      }
    }

    res.status(200).json({ success: true, message: populatedMessage });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete/Clear whole conversation for self
// @route   DELETE /api/messages/conversations/:friendId
// @access  Protected
router.delete('/conversations/:friendId', protect, async (req, res, next) => {
  try {
    const myId = req.user.id;
    const friendId = req.params.friendId;

    // Find the conversation
    const conversation = await Conversation.findOne({
      participants: { $all: [myId, friendId] }
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Add myId to deletedFor array on all messages in this conversation
    await Message.updateMany(
      { conversation: conversation._id, deletedFor: { $ne: myId } },
      { $push: { deletedFor: myId } }
    );

    res.status(200).json({ success: true, message: 'Conversation cleared successfully' });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Protected
router.delete('/:messageId', protect, async (req, res, next) => {
  try {
    const myId = req.user.id;
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const conversationId = message.conversation;
    const receiverId = message.receiver.toString();
    const deleteType = req.query.type || 'me'; // default to hide for self

    if (deleteType === 'me') {
      // Just hide it for this user
      if (!message.deletedFor.includes(myId)) {
        message.deletedFor.push(myId);
        await message.save();
      }
      
      // Update socket ONLY for this user so it disappears from their screen
      const io = req.app.get('io');
      if (io) {
        const mySocketId = onlineUsers.get(myId);
        if (mySocketId) {
          io.to(mySocketId).emit('messageDeleted', { messageId, conversationId });
        }
      }
      
      return res.status(200).json({ success: true, messageId, conversationId, deletedForMe: true });
    }

    // Delete for Everyone (only sender can do this)
    if (message.sender.toString() !== myId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message for everyone' });
    }

    await Message.findByIdAndDelete(messageId);

    // Update conversation lastMessage reference if it was this message
    const conversation = await Conversation.findById(conversationId);
    if (conversation && conversation.lastMessage && conversation.lastMessage.toString() === messageId) {
      const prevLastMessage = await Message.findOne({ conversation: conversationId }).sort({ createdAt: -1 });
      conversation.lastMessage = prevLastMessage ? prevLastMessage._id : null;
      await conversation.save();
    }

    // Real-time socket updates for delete for everyone
    const io = req.app.get('io');
    if (io) {
      const recipientSocketId = onlineUsers.get(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('messageDeleted', { messageId, conversationId });
      }
      const senderSocketId = onlineUsers.get(message.sender.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit('messageDeleted', { messageId, conversationId });
      }
    }

    res.status(200).json({ success: true, messageId, conversationId });
  } catch (error) {
    next(error);
  }
});

const { callGroq } = require('../utils/groq');

// @desc    Call AI Assistant for inline message suggestions/rewriting
// @route   POST /api/messages/assistant
// @access  Protected
router.post('/assistant', protect, async (req, res, next) => {
  try {
    const { prompt, textContext } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const messages = [
      {
        role: 'system',
        content: `You are an AI assistant built into Spheral, a MERN-stack social media application (React, Node.js, Express, MongoDB, Tailwind CSS, Socket.io).
Spheral features:
- Real-time direct messaging with voice notes, file attachments, GIPHY GIFs, and stickers.
- Group chats, call signaling, and a silent blocking system (blocked senders see fake success and their messages aren't saved).
- WhatsApp-style delivery tick receipts: single gray tick for sent, double gray tick for delivered, double blue tick for seen.
- Facebook-style reaction system (Like, Love, Care, Haha, Wow, Sad, Angry) with 3D glossy SVGs and custom animated loops.
- TikTok-style vertical scrolling Reels with autoplay/mute toggle, comments, double-tap to like, and customizable text/sticker overlays.
- Temporary Stories with customizable filters, stickers, text overlays, and visibility settings ('everyone', 'friends', 'only_me').
- Professional Mode for creator accounts, featuring activity logs, FAQ Help Center ticket submissions, and settings configuration.

The user is currently in a direct message chat and is asking for assistance.
Provide concise, helpful, and naturally phrased answers.
If they ask to rewrite something (e.g. "help me word this better"), output the rewritten text directly.
If they ask about Spheral or this website/application, use the metadata provided above to explain its features and structure.
Context of what they have written in the chat input box so far (if any): "${textContext || ''}"`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const reply = await callGroq(messages);
    res.status(200).json({ success: true, text: reply });
  } catch (error) {
    if (error.message.includes('Rate limit')) {
      return res.status(429).json({ success: false, message: error.message });
    }
    next(error);
  }
});

// @desc    React to a message
// @route   PUT /api/messages/:messageId/react
// @access  Protected
router.put('/:messageId/react', protect, async (req, res, next) => {
  try {
    const { reaction } = req.body; // e.g., 'like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'
    const myId = req.user.id;

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const existingIndex = message.reactions.findIndex(r => r.user.toString() === myId);
    if (existingIndex > -1) {
      if (message.reactions[existingIndex].type === reaction) {
        // Toggle off
        message.reactions.splice(existingIndex, 1);
      } else {
        // Update reaction type
        message.reactions[existingIndex].type = reaction;
      }
    } else {
      // Add new reaction
      message.reactions.push({ user: myId, type: reaction });
    }

    await message.save();

    // Socket.io Real-time dispatching of updated reactions
    const io = req.app.get('io');
    if (io) {
      const recipientId = message.sender.toString() === myId ? message.receiver.toString() : message.sender.toString();
      const recipientSocketId = onlineUsers.get(recipientId);
      const senderSocketId = onlineUsers.get(myId);

      const emitData = {
        messageId: message._id,
        conversationId: message.conversation,
        reactions: message.reactions
      };

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('messageReactionUpdated', emitData);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit('messageReactionUpdated', emitData);
      }
    }

    res.status(200).json({ success: true, reactions: message.reactions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
