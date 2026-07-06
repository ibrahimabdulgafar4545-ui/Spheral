const mongoose = require('mongoose');

const ReelSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    videoUrl: {
      type: String,
      required: [true, 'Please add a video url'],
    },
    caption: {
      type: String,
      maxlength: [500, 'Caption cannot exceed 500 characters'],
      default: '',
    },
    reactions: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      type: { type: String, enum: ['like','love','care','haha','wow','sad','angry'] },
    }],
    // Optional aggregated count
    reactionsCount: { type: Number, default: 0 },
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sharesCount: { type: Number, default: 0 },
    notInterested: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, default: '' },
        type: { type: String, enum: ['text', 'sticker'], default: 'text' },
        fileUrl: { type: String, default: null },
        reactions: [{
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          type: { type: String, enum: ['like','love','care','haha','wow','sad','angry'] },
        }],
        isEdited: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    audioName: {
      type: String,
      default: 'Original Audio',
    },
    audioUrl: {
      type: String,
      default: null,
    },
    overlays: {
      type: Array, // Array of { type: 'sticker'|'text', content: string, x: number, y: number, scale: number }
      default: [],
    },
  },
  { timestamps: true }
);

// ── Backward‑compatibility virtuals ────────────────────────────────────────
ReelSchema.virtual('likes').get(function() {
  return this.reactions ? this.reactions.map(r => r.user) : [];
});
ReelSchema.virtual('likesCount').get(function() {
  return this.reactions ? this.reactions.length : 0;
});

module.exports = mongoose.model('Reel', ReelSchema);
