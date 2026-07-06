const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Please add post content'],
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    image: {
      type: String,
      default: null,
    },
    privacy: {
      type: String,
      enum: ['public', 'friends', 'private'],
      default: 'public',
    },
    tags: [
      {
        type: String,
      },
    ],
    feeling: {
      type: String,
      default: null,
    },
    location: {
      type: String,
      default: null,
    },
    reactions: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: { type: String, enum: ['like','love','care','haha','wow','sad','angry'] },
    }],
    // Keep total reaction count for quick access (optional)
    reactionsCount: { type: Number, default: 0 },
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ── Backward‑compatibility virtuals ────────────────────────────────────────
PostSchema.virtual('likes').get(function() {
  return this.reactions ? this.reactions.map(r => r.user) : [];
});
PostSchema.virtual('likesCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

module.exports = mongoose.model('Post', PostSchema);
