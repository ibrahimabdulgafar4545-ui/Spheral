const socketio = require('socket.io');
const User = require('../models/User');
const Message = require('../models/Message');

// userId (string) -> Set of socketId (strings)
const onlineUsers = new Map();
// channelName -> { hostId, hostName, hostAvatar, channelName, viewersCount, mode, freeJoinLimit, approvedViewers: Set<string> }
const activeLiveStreams = new Map();

const initSocket = (server) => {
  const io = socketio(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Helper: Get all active socket IDs for a user ID
  const getUserSocketIds = (userId) => {
    return onlineUsers.get(String(userId)) || new Set();
  };

  // Helper: Emit event to all sockets of a specific user
  const emitToUser = (userId, eventName, data) => {
    const sids = getUserSocketIds(userId);
    for (const sid of sids) {
      io.to(sid).emit(eventName, data);
    }
  };

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── User presence ────────────────────────────────────────────────────────
    socket.on('join', async (userId) => {
      if (!userId) return;
      socket.userId = String(userId);
      
      if (!onlineUsers.has(socket.userId)) {
        onlineUsers.set(socket.userId, new Set());
      }
      onlineUsers.get(socket.userId).add(socket.id);
      console.log(`👤 User ${socket.userId} joined on socket ${socket.id} (total sockets: ${onlineUsers.get(socket.userId).size})`);

      try {
        const user = await User.findById(userId).select('blockedUsers');
        if (!user) return;

        // Set online status in DB
        await User.findByIdAndUpdate(userId, { isOnline: true });

        const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id');
        const excludedIds = new Set([
          ...(user.blockedUsers || []).map(id => String(id)),
          ...usersWhoBlockedMe.map(u => String(u._id))
        ]);

        for (const [otherUserId, otherSocketIds] of onlineUsers.entries()) {
          if (!excludedIds.has(otherUserId) && otherUserId !== socket.userId) {
            for (const otherSid of otherSocketIds) {
              io.to(otherSid).emit('userStatusChanged', { userId: socket.userId, isOnline: true });
            }
          }
        }
      } catch (err) {
        console.error('Error setting user online:', err);
      }
    });

    // ─── Typing ───────────────────────────────────────────────────────────────
    socket.on('typing', ({ senderId, receiverId }) => {
      const sids = getUserSocketIds(receiverId);
      for (const sid of sids) {
        io.to(sid).emit('userTyping', { senderId });
      }
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
      const sids = getUserSocketIds(receiverId);
      for (const sid of sids) {
        io.to(sid).emit('userStopTyping', { senderId });
      }
    });

    // ─── Read receipts ────────────────────────────────────────────────────────
    socket.on('markSeen', async ({ conversationId, senderId, receiverId }) => {
      try {
        const receiver = await User.findById(receiverId).select('blockedUsers');
        if (receiver?.blockedUsers?.includes(String(senderId))) return;

        await Message.updateMany(
          { conversation: conversationId, sender: senderId, status: { $ne: 'seen' } },
          { $set: { status: 'seen' } }
        );
        
        const senderSids = getUserSocketIds(senderId);
        for (const sid of senderSids) {
          io.to(sid).emit('messagesSeen', { conversationId });
        }
      } catch (err) {
        console.error('Error marking seen:', err);
      }
    });

    // ─── Call signaling ───────────────────────────────────────────────────────
    socket.on('makeCall', ({ targetId, channelName, video, callerName, callerAvatar }) => {
      const sids = getUserSocketIds(targetId);
      for (const sid of sids) {
        io.to(sid).emit('incomingCall', {
          callerId: socket.userId,
          channelName,
          video,
          callerName,
          callerAvatar
        });
      }
    });

    socket.on('recipientRinging', ({ callerId }) => {
      const sids = getUserSocketIds(callerId);
      for (const sid of sids) {
        io.to(sid).emit('peerRinging');
      }
    });

    socket.on('acceptCall', ({ callerId }) => {
      const sids = getUserSocketIds(callerId);
      for (const sid of sids) {
        io.to(sid).emit('callAccepted');
      }
    });

    socket.on('declineCall', ({ callerId }) => {
      const sids = getUserSocketIds(callerId);
      for (const sid of sids) {
        io.to(sid).emit('callDeclined');
      }
    });

    socket.on('endCall', ({ targetId }) => {
      const sids = getUserSocketIds(targetId);
      for (const sid of sids) {
        io.to(sid).emit('callEnded');
      }
    });

    // WebRTC call relay
    socket.on('callOffer', ({ targetId, offer }) => {
      const sids = getUserSocketIds(targetId);
      for (const sid of sids) {
        io.to(sid).emit('receiveCallOffer', { offer, senderId: socket.userId });
      }
    });

    socket.on('callAnswer', ({ targetId, answer }) => {
      const sids = getUserSocketIds(targetId);
      for (const sid of sids) {
        io.to(sid).emit('receiveCallAnswer', { answer, senderId: socket.userId });
      }
    });

    socket.on('callIceCandidate', ({ targetId, candidate }) => {
      const sids = getUserSocketIds(targetId);
      for (const sid of sids) {
        io.to(sid).emit('receiveCallIceCandidate', { candidate, senderId: socket.userId });
      }
    });

    // ─── Live Streaming ───────────────────────────────────────────────────────

    socket.on('goLive', async ({ hostId, hostName, hostAvatar, channelName, mode, freeJoinLimit }) => {
      const streamMode = mode || 'public';
      const limit = (freeJoinLimit && freeJoinLimit !== 'unlimited') ? parseInt(freeJoinLimit, 10) : null;

      activeLiveStreams.set(channelName, {
        hostId: String(hostId),
        hostName,
        hostAvatar,
        channelName,
        viewersCount: 1,
        mode: streamMode,
        freeJoinLimit: limit,
        approvedViewers: new Set([String(hostId)])
      });

      socket.join(`live_${channelName}`);
      socket.liveChannel = channelName;

      // Always fetch actual friends list from database to ensure everyone is notified correctly
      let notifyList = [];
      try {
        const hostUser = await User.findById(hostId).select('friends');
        if (hostUser?.friends) {
          notifyList = hostUser.friends.map(id => String(id));
        }
      } catch (err) {
        console.error('Failed to query friends list for live status update:', err);
      }

      // Notify all friends across all their active socket connections
      for (const friendId of notifyList) {
        const sids = getUserSocketIds(friendId);
        for (const sid of sids) {
          io.to(sid).emit('friendWentLive', {
            hostId: String(hostId),
            hostName,
            hostAvatar,
            channelName,
            mode: streamMode,
            freeJoinLimit: limit
          });
        }
      }

      // Save live notifications in Database
      try {
        const Notification = require('../models/Notification');
        await Promise.allSettled(
          notifyList.map(friendId =>
            Notification.create({
              recipient: friendId,
              actor: hostId,
              type: 'live',
              content: 'is live now! Tap to join the broadcast.',
            })
          )
        );
      } catch (err) {
        console.error('Error saving live notifications:', err);
      }

      console.log(`📡 ${hostName} went live: ${channelName} (${streamMode}, freeLimit: ${limit})`);
    });

    // Viewer checks if they can join
    socket.on('checkLiveAccess', ({ channelName, userId }) => {
      const stream = activeLiveStreams.get(channelName);
      if (!stream) {
        socket.emit('liveAccessStatus', { approved: false, reason: 'stream_not_found' });
        return;
      }

      if (stream.mode === 'public') {
        const activeViewerCount = io.sockets.adapter.rooms.get(`live_${channelName}`)?.size || 0;
        const limit = stream.freeJoinLimit;

        // If public and under free join limit → join freely
        if (!limit || activeViewerCount < limit) {
          socket.emit('liveAccessStatus', { approved: true, mode: 'public' });
          return;
        }

        // Limit reached → falls back to private approval join logic
        const isApproved = stream.approvedViewers.has(String(userId));
        socket.emit('liveAccessStatus', { 
          approved: isApproved, 
          mode: 'public', 
          limitReached: true,
          reason: 'limit_reached'
        });
        return;
      }

      // Private stream
      const isApproved = stream.approvedViewers.has(String(userId));
      socket.emit('liveAccessStatus', { approved: isApproved, mode: 'private' });
    });

    // Viewer requests access to private stream or public stream when limit reached
    socket.on('requestLiveAccess', ({ channelName, userId, userName, userAvatar }) => {
      const stream = activeLiveStreams.get(channelName);
      if (!stream) return;

      const hostSids = getUserSocketIds(stream.hostId);
      for (const sid of hostSids) {
        io.to(sid).emit('liveAccessRequestReceived', {
          userId: String(userId),
          userName,
          userAvatar,
          channelName
        });
      }
    });

    // Host approves viewer — emits to all viewer tabs
    socket.on('approveLiveAccess', ({ channelName, viewerId }) => {
      const stream = activeLiveStreams.get(channelName);
      if (stream) {
        stream.approvedViewers.add(String(viewerId));
      }
      
      const viewerSids = getUserSocketIds(viewerId);
      for (const sid of viewerSids) {
        io.to(sid).emit('liveAccessApproved', { channelName, viewerId: String(viewerId) });
      }
    });

    // Host declines viewer
    socket.on('declineLiveAccess', ({ channelName, viewerId }) => {
      const viewerSids = getUserSocketIds(viewerId);
      for (const sid of viewerSids) {
        io.to(sid).emit('liveAccessDeclined', { channelName, viewerId: String(viewerId) });
      }
    });

    // Viewer joins live room (after access confirmed)
    socket.on('joinLive', ({ channelName, userId, userName, userAvatar }) => {
      const stream = activeLiveStreams.get(channelName);

      if (stream) {
        // Double-check private / limit access settings
        if (stream.mode === 'private') {
          if (!stream.approvedViewers.has(String(userId))) {
            socket.emit('liveAccessRequired', { channelName });
            return;
          }
        } else if (stream.mode === 'public' && stream.freeJoinLimit) {
          const activeViewerCount = io.sockets.adapter.rooms.get(`live_${channelName}`)?.size || 0;
          if (activeViewerCount >= stream.freeJoinLimit && !stream.approvedViewers.has(String(userId))) {
            socket.emit('liveAccessRequired', { channelName });
            return;
          }
        }

        stream.viewersCount = (stream.viewersCount || 0) + 1;
      }

      socket.join(`live_${channelName}`);
      socket.liveChannel = channelName;

      io.to(`live_${channelName}`).emit('liveMessage', {
        id: Date.now().toString(),
        user: { name: userName, avatar: userAvatar },
        text: 'joined the live stream',
        system: true,
        createdAt: new Date()
      });

      const clientCount = io.sockets.adapter.rooms.get(`live_${channelName}`)?.size || 0;
      io.to(`live_${channelName}`).emit('liveViewerCount', clientCount);
      console.log(`📡 ${userName} joined live: ${channelName}`);
    });

    socket.on('leaveLive', ({ channelName, userId, userName }) => {
      socket.leave(`live_${channelName}`);
      if (socket.liveChannel === channelName) socket.liveChannel = null;

      const stream = activeLiveStreams.get(channelName);
      if (stream) {
        stream.viewersCount = Math.max(1, (stream.viewersCount || 1) - 1);
      }

      io.to(`live_${channelName}`).emit('liveMessage', {
        id: Date.now().toString(),
        user: { name: userName },
        text: 'left the live stream',
        system: true,
        createdAt: new Date()
      });

      const clientCount = io.sockets.adapter.rooms.get(`live_${channelName}`)?.size || 0;
      io.to(`live_${channelName}`).emit('liveViewerCount', clientCount);
    });

    socket.on('sendLiveComment', ({ channelName, comment }) => {
      io.to(`live_${channelName}`).emit('liveMessage', {
        id: Date.now().toString(),
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
      console.log(`📡 Live stream ended: ${channelName}`);
    });

    // ─── Co-Host signaling ────────────────────────────────────────────────────
    socket.on('requestCoHost', ({ channelName, userId, userName, userAvatar }) => {
      const hostId = channelName.replace('live_user_', '');
      const hostSids = getUserSocketIds(hostId);
      for (const sid of hostSids) {
        io.to(sid).emit('coHostRequestReceived', { userId: String(userId), userName, userAvatar, channelName });
      }
    });

    socket.on('approveCoHost', ({ channelName, viewerId }) => {
      const viewerSids = getUserSocketIds(viewerId);
      for (const sid of viewerSids) {
        io.to(sid).emit('coHostRequestApproved', { channelName });
      }
    });

    socket.on('declineCoHost', ({ channelName, viewerId }) => {
      const viewerSids = getUserSocketIds(viewerId);
      for (const sid of viewerSids) {
        io.to(sid).emit('coHostRequestDeclined', { channelName });
      }
    });

    socket.on('leaveCoHost', ({ channelName, viewerId }) => {
      const hostId = channelName.replace('live_user_', '');
      const hostSids = getUserSocketIds(hostId);
      for (const sid of hostSids) {
        io.to(sid).emit('coHostLeftNotify', { viewerId: String(viewerId), channelName });
      }
    });

    // ─── Host moderation ──────────────────────────────────────────────────────
    socket.on('muteUser', ({ channelName, userId }) => {
      const viewerSids = getUserSocketIds(userId);
      for (const sid of viewerSids) {
        io.to(sid).emit('userMuted', { userId: String(userId) });
      }
    });

    socket.on('kickUser', ({ channelName, userId }) => {
      const viewerSids = getUserSocketIds(userId);
      for (const sid of viewerSids) {
        io.to(sid).emit('kickedByHost', { channelName });
      }
    });

    // ─── Live WebRTC signaling ────────────────────────────────────────────────
    socket.on('viewerJoinedLive', ({ channelName, viewerId }) => {
      io.to(`live_${channelName}`).emit('hostInitiateWebrtc', { viewerId: String(viewerId) });
    });

    socket.on('liveWebrtcOffer', ({ targetId, offer, hostId }) => {
      const sids = getUserSocketIds(targetId);
      for (const sid of sids) {
        io.to(sid).emit('receiveWebrtcOffer', { hostId, offer });
      }
    });

    socket.on('liveWebrtcAnswer', ({ targetId, answer, viewerId }) => {
      const sids = getUserSocketIds(targetId);
      for (const sid of sids) {
        io.to(sid).emit('receiveWebrtcAnswer', { viewerId, answer });
      }
    });

    socket.on('liveWebrtcIceCandidate', ({ targetId, candidate, senderId }) => {
      const sids = getUserSocketIds(targetId);
      for (const sid of sids) {
        io.to(sid).emit('receiveWebrtcIceCandidate', { senderId, candidate });
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      if (socket.liveChannel) {
        const channelName = socket.liveChannel;
        const stream = activeLiveStreams.get(channelName);
        if (stream) {
          if (stream.hostId === socket.userId) {
            activeLiveStreams.delete(channelName);
            io.to(`live_${channelName}`).emit('liveStreamEnded');
            io.emit('friendEndedLive', { channelName });
          } else {
            stream.viewersCount = Math.max(1, (stream.viewersCount || 1) - 1);
          }
        }
        const clientCount = io.sockets.adapter.rooms.get(`live_${channelName}`)?.size || 0;
        io.to(`live_${channelName}`).emit('liveViewerCount', clientCount);
      }

      if (socket.userId && onlineUsers.has(socket.userId)) {
        const sids = onlineUsers.get(socket.userId);
        sids.delete(socket.id);
        
        if (sids.size === 0) {
          onlineUsers.delete(socket.userId);
          try {
            const user = await User.findByIdAndUpdate(
              socket.userId,
              { isOnline: false, lastSeen: new Date() },
              { new: true }
            );
            if (user) {
              const usersWhoBlockedMe = await User.find({ blockedUsers: socket.userId }).select('_id');
              const excludedIds = new Set([
                ...(user.blockedUsers || []).map(id => String(id)),
                ...usersWhoBlockedMe.map(u => String(u._id))
              ]);
              for (const [otherUserId, otherSocketIds] of onlineUsers.entries()) {
                if (!excludedIds.has(otherUserId) && otherUserId !== socket.userId) {
                  for (const otherSid of otherSocketIds) {
                    io.to(otherSid).emit('userStatusChanged', {
                      userId: socket.userId,
                      isOnline: false,
                      lastSeen: user.lastSeen
                    });
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error setting user offline:', err);
          }
        }
      }
    });
  });

  return { io, onlineUsers };
};

module.exports = { initSocket, onlineUsers, activeLiveStreams };
