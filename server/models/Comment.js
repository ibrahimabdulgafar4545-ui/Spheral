const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Please add comment content'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    reactions: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: { type: String, enum: ['like','love','care','haha','wow','sad','angry'] },
    }],
    // Optional aggregated count
    reactionsCount: { type: Number, default: 0 },
    // likesCount virtual will be derived; keep field for compatibility (optional)
    // keeping a numeric field is not needed; we will expose a virtual count
    // (no actual field stored)

    replies: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: 1000,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        likes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        likesCount: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ── Backward‑compatibility virtuals ────────────────────────────────────────
CommentSchema.virtual('likes').get(function() {
  return this.reactions ? this.reactions.map(r => r.user) : [];
});
CommentSchema.virtual('likesCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

module.exports = mongoose.model('Comment', CommentSchema);
