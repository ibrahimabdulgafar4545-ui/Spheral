const socketio = require('socket.io');
const User = require('../models/User');
const Message = require('../models/Message');

// userId (string) -> socketId
const onlineUsers = new Map();
// channelName -> { hostId, hostName, hostAvatar, channelName, viewersCount, mode, approvedViewers: Set<string> }
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

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── User presence ────────────────────────────────────────────────────────
    socket.on('join', async (userId) => {
      if (!userId) return;
      socket.userId = String(userId);
      onlineUsers.set(socket.userId, socket.id);
      console.log(`👤 User ${socket.userId} joined on socket ${socket.id}`);

      try {
        const user = await User.findByIdAndUpdate(userId, { isOnline: true }, { new: true });
        if (!user) return;

        const usersWhoBlockedMe = await User.find({ blockedUsers: userId }).select('_id');
        const excludedIds = new Set([
          ...(user.blockedUsers || []).map(id => String(id)),
          ...usersWhoBlockedMe.map(u => String(u._id))
        ]);

        for (const [otherUserId, otherSocketId] of onlineUsers.entries()) {
          if (!excludedIds.has(otherUserId) && otherUserId !== socket.userId) {
            io.to(otherSocketId).emit('userStatusChanged', { userId: socket.userId, isOnline: true });
          }
        }
      } catch (err) {
        console.error('Error setting user online:', err);
      }
    });

    // ─── Typing ───────────────────────────────────────────────────────────────
    socket.on('typing', ({ senderId, receiverId }) => {
      const sid = onlineUsers.get(String(receiverId));
      if (sid) io.to(sid).emit('userTyping', { senderId });
    });

    socket.on('stopTyping', ({ senderId, receiverId }) => {
      const sid = onlineUsers.get(String(receiverId));
      if (sid) io.to(sid).emit('userStopTyping', { senderId });
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
        const senderSid = onlineUsers.get(String(senderId));
        if (senderSid) io.to(senderSid).emit('messagesSeen', { conversationId });
      } catch (err) {
        console.error('Error marking seen:', err);
      }
    });

    // ─── Call signaling ───────────────────────────────────────────────────────
    socket.on('makeCall', ({ targetId, channelName, video, callerName, callerAvatar }) => {
      const sid = onlineUsers.get(String(targetId));
      if (sid) {
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
      const sid = onlineUsers.get(String(callerId));
      if (sid) io.to(sid).emit('peerRinging');
    });

    socket.on('acceptCall', ({ callerId }) => {
      const sid = onlineUsers.get(String(callerId));
      if (sid) io.to(sid).emit('callAccepted');
    });

    socket.on('declineCall', ({ callerId }) => {
      const sid = onlineUsers.get(String(callerId));
      if (sid) io.to(sid).emit('callDeclined');
    });

    socket.on('endCall', ({ targetId }) => {
      const sid = onlineUsers.get(String(targetId));
      if (sid) io.to(sid).emit('callEnded');
    });

    // WebRTC call relay
    socket.on('callOffer', ({ targetId, offer }) => {
      const sid = onlineUsers.get(String(targetId));
      if (sid) io.to(sid).emit('receiveCallOffer', { offer, senderId: socket.userId });
    });

    socket.on('callAnswer', ({ targetId, answer }) => {
      const sid = onlineUsers.get(String(targetId));
      if (sid) io.to(sid).emit('receiveCallAnswer', { answer, senderId: socket.userId });
    });

    socket.on('callIceCandidate', ({ targetId, candidate }) => {
      const sid = onlineUsers.get(String(targetId));
      if (sid) io.to(sid).emit('receiveCallIceCandidate', { candidate, senderId: socket.userId });
    });

    // ─── Live Streaming ───────────────────────────────────────────────────────

    socket.on('goLive', async ({ hostId, hostName, hostAvatar, channelName, friends, mode }) => {
      const streamMode = mode || 'public';

      activeLiveStreams.set(channelName, {
        hostId: String(hostId),
        hostName,
        hostAvatar,
        channelName,
        viewersCount: 1,
        mode: streamMode,
        approvedViewers: new Set([String(hostId)])
      });

      socket.join(`live_${channelName}`);
      socket.liveChannel = channelName;

      // Resolve friends list
      let notifyList = friends && Array.isArray(friends) ? friends.map(String) : [];
      if (notifyList.length === 0) {
        try {
          const hostUser = await User.findById(hostId).select('friends');
          if (hostUser?.friends) {
            notifyList = hostUser.friends.map(id => String(id));
          }
        } catch (err) {
          console.error('Failed to get host friends:', err);
        }
      }

      // Notify friends in real-time
      for (const friendId of notifyList) {
        const sid = onlineUsers.get(friendId);
        if (sid) {
          io.to(sid).emit('friendWentLive', { hostId: String(hostId), hostName, hostAvatar, channelName, mode: streamMode });
        }
      }

      // Save notifications in DB
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

      console.log(`📡 ${hostName} went live: ${channelName} (${streamMode})`);
    });

    // Viewer checks if they can join
    // Public → immediately approved. Private → check approvedViewers.
    socket.on('checkLiveAccess', ({ channelName, userId }) => {
      const stream = activeLiveStreams.get(channelName);
      if (!stream) {
        socket.emit('liveAccessStatus', { approved: false, reason: 'stream_not_found' });
        return;
      }
      if (stream.mode === 'public') {
        socket.emit('liveAccessStatus', { approved: true, mode: 'public' });
        return;
      }
      // Private stream
      const isApproved = stream.approvedViewers.has(String(userId));
      socket.emit('liveAccessStatus', { approved: isApproved, mode: 'private' });
    });

    // Viewer requests access to private stream
    socket.on('requestLiveAccess', ({ channelName, userId, userName, userAvatar }) => {
      const stream = activeLiveStreams.get(channelName);
      if (!stream) return;
      const hostSid = onlineUsers.get(String(stream.hostId));
      if (hostSid) {
        io.to(hostSid).emit('liveAccessRequestReceived', {
          userId: String(userId),
          userName,
          userAvatar,
          channelName
        });
      }
    });

    // Host approves viewer — critical: include channelName in response
    socket.on('approveLiveAccess', ({ channelName, viewerId }) => {
      const stream = activeLiveStreams.get(channelName);
      if (stream) {
        stream.approvedViewers.add(String(viewerId));
      }
      const viewerSid = onlineUsers.get(String(viewerId));
      if (viewerSid) {
        io.to(viewerSid).emit('liveAccessApproved', { channelName, viewerId: String(viewerId) });
      }
    });

    // Host declines viewer
    socket.on('declineLiveAccess', ({ channelName, viewerId }) => {
      const viewerSid = onlineUsers.get(String(viewerId));
      if (viewerSid) {
        io.to(viewerSid).emit('liveAccessDeclined', { channelName, viewerId: String(viewerId) });
      }
    });

    // Viewer joins live room (after access confirmed)
    socket.on('joinLive', ({ channelName, userId, userName, userAvatar }) => {
      const stream = activeLiveStreams.get(channelName);

      if (stream && stream.mode === 'private') {
        if (!stream.approvedViewers.has(String(userId))) {
          socket.emit('liveAccessRequired', { channelName });
          return;
        }
      }

      socket.join(`live_${channelName}`);
      socket.liveChannel = channelName;

      if (stream) {
        stream.viewersCount = (stream.viewersCount || 0) + 1;
      }

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
      const hostSid = onlineUsers.get(hostId);
      if (hostSid) {
        io.to(hostSid).emit('coHostRequestReceived', { userId: String(userId), userName, userAvatar, channelName });
      }
    });

    socket.on('approveCoHost', ({ channelName, viewerId }) => {
      const viewerSid = onlineUsers.get(String(viewerId));
      if (viewerSid) io.to(viewerSid).emit('coHostRequestApproved', { channelName });
    });

    socket.on('declineCoHost', ({ channelName, viewerId }) => {
      const viewerSid = onlineUsers.get(String(viewerId));
      if (viewerSid) io.to(viewerSid).emit('coHostRequestDeclined', { channelName });
    });

    // ─── Host moderation ──────────────────────────────────────────────────────
    // Fixed: mute only the target user not all viewers
    socket.on('muteUser', ({ channelName, userId }) => {
      const viewerSid = onlineUsers.get(String(userId));
      if (viewerSid) io.to(viewerSid).emit('userMuted', { userId: String(userId) });
    });

    socket.on('kickUser', ({ channelName, userId }) => {
      const viewerSid = onlineUsers.get(String(userId));
      if (viewerSid) io.to(viewerSid).emit('kickedByHost', { channelName });
    });

    // ─── Live WebRTC signaling ────────────────────────────────────────────────
    socket.on('viewerJoinedLive', ({ channelName, viewerId }) => {
      io.to(`live_${channelName}`).emit('hostInitiateWebrtc', { viewerId: String(viewerId) });
    });

    socket.on('liveWebrtcOffer', ({ targetId, offer, hostId }) => {
      const sid = onlineUsers.get(String(targetId));
      if (sid) io.to(sid).emit('receiveWebrtcOffer', { hostId, offer });
    });

    socket.on('liveWebrtcAnswer', ({ targetId, answer, viewerId }) => {
      const sid = onlineUsers.get(String(targetId));
      if (sid) io.to(sid).emit('receiveWebrtcAnswer', { viewerId, answer });
    });

    socket.on('liveWebrtcIceCandidate', ({ targetId, candidate, senderId }) => {
      const sid = onlineUsers.get(String(targetId));
      if (sid) io.to(sid).emit('receiveWebrtcIceCandidate', { senderId, candidate });
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

      if (socket.userId) {
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
            for (const [otherUserId, otherSocketId] of onlineUsers.entries()) {
              if (!excludedIds.has(otherUserId) && otherUserId !== socket.userId) {
                io.to(otherSocketId).emit('userStatusChanged', {
                  userId: socket.userId,
                  isOnline: false,
                  lastSeen: user.lastSeen
                });
              }
            }
          }
        } catch (err) {
          console.error('Error setting user offline:', err);
        }
      }
    });
  });

  return { io, onlineUsers };
};

module.exports = { initSocket, onlineUsers, activeLiveStreams };
