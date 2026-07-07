const socketio = require('socket.io');
const User = require('../models/User');
const Message = require('../models/Message');

const onlineUsers = new Map(); // userId -> socketId

const initSocket = (server) => {
  const io = socketio(server, {
    cors: {
      origin: "*", // Temporarily allow all origins to bypass Render CORS blocking
      methods: ["GET", "POST"]
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join room for this user
    socket.on('join', async (userId) => {
      if (!userId) return;
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      console.log(`👤 User ${userId} joined on socket ${socket.id}`);

      // Set online status in DB
      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
        // Broadcast user status changed
        io.emit('userStatusChanged', { userId, isOnline: true });
      } catch (err) {
        console.error('Error setting user online:', err);
      }
    });

    // Typing status
    socket.on('typing', ({ senderId, receiverId }) => {
      const recipientSocketId = onlineUsers.get(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('userTyping', { senderId });
      }
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
      const recipientSocketId = onlineUsers.get(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('userStopTyping', { senderId });
      }
    });

    // Mark messages as read/seen
    socket.on('markSeen', async ({ conversationId, senderId, receiverId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, sender: senderId, status: { $ne: 'seen' } },
          { $set: { status: 'seen' } }
        );
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messagesSeen', { conversationId });
        }
      } catch (err) {
        console.error('Error marking seen:', err);
      }
    });

    // Calling signaling events
    socket.on('makeCall', ({ targetId, channelName, video, callerName, callerAvatar }) => {
      const recipientSocketId = onlineUsers.get(targetId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('incomingCall', {
          callerId: socket.userId,
          channelName,
          video,
          callerName,
          callerAvatar
        });
      } else {
        // Target is offline - do NOT fail instantly. Let it remain in "Calling..." state on the caller side.
      }
    });

    socket.on('recipientRinging', ({ callerId }) => {
      const callerSocketId = onlineUsers.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('peerRinging');
      }
    });

    socket.on('acceptCall', ({ callerId }) => {
      const callerSocketId = onlineUsers.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('callAccepted');
      }
    });

    socket.on('declineCall', ({ callerId }) => {
      const callerSocketId = onlineUsers.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('callDeclined');
      }
    });

    socket.on('endCall', ({ targetId }) => {
      const recipientSocketId = onlineUsers.get(targetId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('callEnded');
      }
    });

    // ─── Live Streaming Socket Events ──────────────────────────────────────────
    socket.on('goLive', async ({ hostId, hostName, hostAvatar, channelName, friends }) => {
      // 1. Notify friends who are online
      if (friends && Array.isArray(friends)) {
        friends.forEach(friendId => {
          const friendSocketId = onlineUsers.get(friendId);
          if (friendSocketId) {
            io.to(friendSocketId).emit('friendWentLive', {
              hostId,
              hostName,
              hostAvatar,
              channelName
            });
          }
        });
      }

      // 2. Save Notification in DB
      try {
        const Notification = require('../models/Notification');
        if (friends && Array.isArray(friends)) {
          const notifPromises = friends.map(friendId => 
            Notification.create({
              recipient: friendId,
              actor: hostId,
              type: 'live',
              content: 'is live now! Tap to join the broadcast.',
            })
          );
          await Promise.all(notifPromises);
        }
      } catch (err) {
        console.error('Error saving live notifications:', err);
      }
    });

    socket.on('joinLive', ({ channelName, userId, userName, userAvatar }) => {
      socket.join(`live_${channelName}`);
      socket.liveChannel = channelName;
      console.log(`📡 User joined live room: live_${channelName}`);
      
      io.to(`live_${channelName}`).emit('liveMessage', {
        id: Math.random().toString(),
        user: { name: userName, avatar: userAvatar },
        text: 'joined the live stream',
        system: true,
        createdAt: new Date()
      });

      const clients = io.sockets.adapter.rooms.get(`live_${channelName}`);
      const count = clients ? clients.size : 0;
      io.to(`live_${channelName}`).emit('liveViewerCount', count);
    });

    socket.on('leaveLive', ({ channelName, userId, userName }) => {
      socket.leave(`live_${channelName}`);
      console.log(`📡 User left live room: live_${channelName}`);
      
      io.to(`live_${channelName}`).emit('liveMessage', {
        id: Math.random().toString(),
        user: { name: userName },
        text: 'left the live stream',
        system: true,
        createdAt: new Date()
      });

      const clients = io.sockets.adapter.rooms.get(`live_${channelName}`);
      const count = clients ? clients.size : 0;
      io.to(`live_${channelName}`).emit('liveViewerCount', count);
    });

    socket.on('sendLiveComment', ({ channelName, comment }) => {
      io.to(`live_${channelName}`).emit('liveMessage', {
        id: Math.random().toString(),
        user: comment.user,
        text: comment.text,
        type: comment.type || 'text',
        createdAt: new Date()
      });
    });

    socket.on('endLiveStream', ({ channelName }) => {
      io.to(`live_${channelName}`).emit('liveStreamEnded');
      io.emit('friendEndedLive', { channelName });
    });

    // ─── Native WebRTC Signaling Relays ──────────────────────────────────────
    socket.on('viewerJoinedLive', ({ channelName, viewerId }) => {
      // Notify the host that a viewer joined, so host can create an offer
      io.to(`live_${channelName}`).emit('hostInitiateWebrtc', { viewerId });
    });

    socket.on('liveWebrtcOffer', ({ targetId, offer, hostId }) => {
      const viewerSocketId = onlineUsers.get(targetId);
      if (viewerSocketId) {
        io.to(viewerSocketId).emit('receiveWebrtcOffer', { hostId, offer });
      }
    });

    socket.on('liveWebrtcAnswer', ({ targetId, answer, viewerId }) => {
      const hostSocketId = onlineUsers.get(targetId);
      if (hostSocketId) {
        io.to(hostSocketId).emit('receiveWebrtcAnswer', { viewerId, answer });
      }
    });

    socket.on('liveWebrtcIceCandidate', ({ targetId, candidate, senderId }) => {
      const targetSocketId = onlineUsers.get(targetId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('receiveWebrtcIceCandidate', { senderId, candidate });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      if (socket.liveChannel) {
        socket.leave(`live_${socket.liveChannel}`);
        const clients = io.sockets.adapter.rooms.get(`live_${socket.liveChannel}`);
        const count = clients ? clients.size : 0;
        io.to(`live_${socket.liveChannel}`).emit('liveViewerCount', count);
      }
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        try {
          await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });
          io.emit('userStatusChanged', { userId: socket.userId, isOnline: false, lastSeen: new Date() });
        } catch (err) {
          console.error('Error setting user online/offline status:', err);
        }
      }
    });
  });

  return { io, onlineUsers };
};

module.exports = { initSocket, onlineUsers };
