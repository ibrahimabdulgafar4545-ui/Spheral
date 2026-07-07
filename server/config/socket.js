const socketio = require('socket.io');
const User = require('../models/User');
const Message = require('../models/Message');

const onlineUsers = new Map(); // userId -> socketId
const activeLiveStreams = new Map(); // channelName -> streamData

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
        const user = await User.findByIdAndUpdate(userId, { isOnline: true }, { new: true });
        
        // Broadcast user status changed ONLY to non-blocked relationships
        const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id');
        const excludedIds = [
          ...(user.blockedUsers || []).map(id => id.toString()),
          ...usersWhoBlockedMe.map(u => u._id.toString())
        ];

        for (let [otherUserId, otherSocketId] of onlineUsers.entries()) {
          if (!excludedIds.includes(otherUserId) && otherUserId !== userId) {
            io.to(otherSocketId).emit('userStatusChanged', { userId, isOnline: true });
          }
        }
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
        const receiver = await User.findById(receiverId).select('blockedUsers');
        if (receiver && receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
          // WhatsApp behavior: if receiver blocks sender, read receipts are permanently suppressed
          return;
        }

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

    // Direct WebRTC 1-to-1 Calling signaling relays
    socket.on('callOffer', ({ targetId, offer }) => {
      const recipientSocketId = onlineUsers.get(targetId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receiveCallOffer', { offer, senderId: socket.userId });
      }
    });

    socket.on('callAnswer', ({ targetId, answer }) => {
      const recipientSocketId = onlineUsers.get(targetId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receiveCallAnswer', { answer, senderId: socket.userId });
      }
    });

    socket.on('callIceCandidate', ({ targetId, candidate }) => {
      const recipientSocketId = onlineUsers.get(targetId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receiveCallIceCandidate', { candidate, senderId: socket.userId });
      }
    });

    // ─── Live Streaming Socket Events ──────────────────────────────────────────
    socket.on('goLive', async ({ hostId, hostName, hostAvatar, channelName, friends, mode }) => {
      activeLiveStreams.set(channelName, {
        hostId,
        hostName,
        hostAvatar,
        channelName,
        viewersCount: 1,
        coHosts: [],
        mode: mode || 'public',
        approvedViewers: [String(hostId)] // host is always approved
      });

      let notifyList = friends;
      if (!notifyList || !Array.isArray(notifyList) || notifyList.length === 0) {
        try {
          const hostUser = await User.findById(hostId).select('friends');
          if (hostUser && hostUser.friends) {
            notifyList = hostUser.friends.map(id => id.toString());
          }
        } catch (dbErr) {
          console.error('Failed to get host friends for live notify:', dbErr);
        }
      }

      // 1. Notify friends who are online
      if (notifyList && Array.isArray(notifyList)) {
        notifyList.forEach(friendId => {
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
        if (notifyList && Array.isArray(notifyList)) {
          const notifPromises = notifyList.map(friendId => 
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

    socket.on('checkLiveAccess', ({ channelName, userId }) => {
      const stream = activeLiveStreams.get(channelName);
      if (!stream || stream.mode === 'public') {
        socket.emit('liveAccessStatus', { approved: true });
      } else {
        const isApproved = (stream.approvedViewers || []).includes(String(userId));
        socket.emit('liveAccessStatus', { approved: isApproved });
      }
    });

    socket.on('requestLiveAccess', ({ channelName, userId, userName, userAvatar }) => {
      const stream = activeLiveStreams.get(channelName);
      if (stream) {
        const hostSocketId = onlineUsers.get(stream.hostId);
        if (hostSocketId) {
          io.to(hostSocketId).emit('liveAccessRequestReceived', { userId, userName, userAvatar });
        }
      }
    });

    socket.on('approveLiveAccess', ({ channelName, viewerId }) => {
      const stream = activeLiveStreams.get(channelName);
      if (stream) {
        if (!stream.approvedViewers) stream.approvedViewers = [];
        if (!stream.approvedViewers.includes(String(viewerId))) {
          stream.approvedViewers.push(String(viewerId));
          activeLiveStreams.set(channelName, stream);
        }
      }
      const viewerSocketId = onlineUsers.get(viewerId);
      if (viewerSocketId) {
        io.to(viewerSocketId).emit('liveAccessApproved', { channelName });
      }
    });

    socket.on('declineLiveAccess', ({ channelName, viewerId }) => {
      const viewerSocketId = onlineUsers.get(viewerId);
      if (viewerSocketId) {
        io.to(viewerSocketId).emit('liveAccessDeclined', { channelName });
      }
    });

    socket.on('joinLive', ({ channelName, userId, userName, userAvatar }) => {
      const stream = activeLiveStreams.get(channelName);
      if (stream && stream.mode === 'private') {
        const isApproved = (stream.approvedViewers || []).includes(String(userId));
        if (!isApproved) {
          socket.emit('liveAccessRequired', { channelName });
          
          const hostSocketId = onlineUsers.get(stream.hostId);
          if (hostSocketId) {
            io.to(hostSocketId).emit('liveAccessRequestReceived', { userId, userName, userAvatar });
          }
          return;
        }
      }

      socket.join(`live_${channelName}`);
      socket.liveChannel = channelName;
      console.log(`📡 User joined live room: live_${channelName}`);
      
      if (stream) {
        stream.viewersCount = (stream.viewersCount || 0) + 1;
        activeLiveStreams.set(channelName, stream);
      }

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
      
      const stream = activeLiveStreams.get(channelName);
      if (stream) {
        stream.viewersCount = Math.max(1, (stream.viewersCount || 1) - 1);
        activeLiveStreams.set(channelName, stream);
      }

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
      activeLiveStreams.delete(channelName);
      io.to(`live_${channelName}`).emit('liveStreamEnded');
      io.emit('friendEndedLive', { channelName });
    });

    // ─── Co-Host Request Signaling ───────────────────────────────────────────
    socket.on('requestCoHost', ({ channelName, userId, userName, userAvatar }) => {
      const hostId = channelName.replace('live_user_', '');
      const hostSocketId = onlineUsers.get(hostId);
      if (hostSocketId) {
        io.to(hostSocketId).emit('coHostRequestReceived', { userId, userName, userAvatar });
      }
    });

    socket.on('approveCoHost', ({ channelName, viewerId }) => {
      const viewerSocketId = onlineUsers.get(viewerId);
      if (viewerSocketId) {
        io.to(viewerSocketId).emit('coHostRequestApproved', { channelName });
      }
    });

    socket.on('declineCoHost', ({ channelName, viewerId }) => {
      const viewerSocketId = onlineUsers.get(viewerId);
      if (viewerSocketId) {
        io.to(viewerSocketId).emit('coHostRequestDeclined', { channelName });
      }
    });
    socket.on('muteUser', ({ channelName, userId }) => {
      io.to(`live_${channelName}`).emit('userMuted', { userId });
    });

    socket.on('kickUser', ({ channelName, userId }) => {
      const viewerSocketId = onlineUsers.get(userId);
      if (viewerSocketId) {
        io.to(viewerSocketId).emit('kickedByHost', { channelName });
      }
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
        const stream = activeLiveStreams.get(socket.liveChannel);
        if (stream) {
          // If the disconnect was the host, remove the stream
          if (stream.hostId.toString() === (socket.userId || '').toString()) {
            activeLiveStreams.delete(socket.liveChannel);
            io.to(`live_${socket.liveChannel}`).emit('liveStreamEnded');
            io.emit('friendEndedLive', { channelName: socket.liveChannel });
          } else {
            stream.viewersCount = Math.max(1, (stream.viewersCount || 1) - 1);
            activeLiveStreams.set(socket.liveChannel, stream);
          }
        }
        const clients = io.sockets.adapter.rooms.get(`live_${socket.liveChannel}`);
        const count = clients ? clients.size : 0;
        io.to(`live_${socket.liveChannel}`).emit('liveViewerCount', count);
      }
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        try {
          const user = await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() }, { new: true });
          if (user) {
            const usersWhoBlockedMe = await User.find({ blockedUsers: socket.userId }).select('_id');
            const excludedIds = [
              ...(user.blockedUsers || []).map(id => id.toString()),
              ...usersWhoBlockedMe.map(u => u._id.toString())
            ];
            
            for (let [otherUserId, otherSocketId] of onlineUsers.entries()) {
              if (!excludedIds.includes(otherUserId) && otherUserId !== socket.userId) {
                io.to(otherSocketId).emit('userStatusChanged', { userId: socket.userId, isOnline: false, lastSeen: user.lastSeen });
              }
            }
          }
        } catch (err) {
          console.error('Error setting user online/offline status:', err);
        }
      }
    });
  });

  return { io, onlineUsers };
};

module.exports = { initSocket, onlineUsers, activeLiveStreams };
