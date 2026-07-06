const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    slides: [
      {
        image: {
          type: String,
          required: true,
        },
        caption: {
          type: String,
          default: '',
        },
        duration: {
          type: Number,
          default: 5000,
        },
        audioUrl: {
          type: String,
          default: null,
        },
        overlays: {
          type: Array, // Array of { type: 'sticker'|'text', content: string, x: number, y: number, scale: number }
          default: [],
        },
        embed: {
          contentType: { type: String, enum: ['post', 'reel'], default: null },
          contentId: { type: mongoose.Schema.Types.ObjectId, default: null },
          authorId: { type: mongoose.Schema.Types.ObjectId, default: null },
          authorName: { type: String, default: '' },
          authorAvatar: { type: String, default: '' },
          content: { type: String, default: '' },
          mediaUrl: { type: String, default: '' },
        },
        likes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          }
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
    },
    visibility: {
      type: String,
      enum: ['everyone', 'friends', 'only_me'],
      default: 'everyone',
    },
    excludedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove stories older than 24 hours
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', StorySchema);
