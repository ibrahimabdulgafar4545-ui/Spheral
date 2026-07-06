const User = require('../models/User');
const Notification = require('../models/Notification');
const { onlineUsers } = require('../config/socket');

/**
 * Parses @mentions in a text block, verifies if they are friends with the actor,
 * and sends each mentioned user a notification.
 */
async function parseMentionsAndNotify(text, actorId, type, sourceId, req) {
  if (!text) return;

  // Regex to extract all @username patterns
  const regex = /@([a-zA-Z0-9_]+)/g;
  const matches = [...text.matchAll(regex)].map(m => m[1]);
  if (matches.length === 0) return;

  const uniqueUsernames = [...new Set(matches)];

  // Retrieve actor to check friends list (for privacy enforcement)
  const actor = await User.findById(actorId);
  if (!actor) return;
  const friends = (actor.friends || []).map(f => f.toString());

  const io = req.app.get('io');

  for (const username of uniqueUsernames) {
    const user = await User.findOne({ username });
    if (!user) continue;

    // Respect privacy: Only allow mentioning users who are in the author's friends list
    if (!friends.includes(user._id.toString())) continue;

    // Avoid self-notification
    if (user._id.toString() !== actorId.toString()) {
      await Notification.create({
        recipient: user._id,
        actor: actorId,
        type: 'comment', // Reuses the comment/tag notification template
        post: type === 'post' ? sourceId : (type === 'comment' ? sourceId : null),
        content: `mentioned you in a ${type}`,
      });

      // Socket real-time toast alert
      if (io) {
        const targetSocketId = onlineUsers.get(user._id.toString());
        if (targetSocketId) {
          io.to(targetSocketId).emit('newNotificationNotify', {
            message: `${actor.name} mentioned you in a ${type}`
          });
        }
      }
    }
  }
}

module.exports = { parseMentionsAndNotify };
