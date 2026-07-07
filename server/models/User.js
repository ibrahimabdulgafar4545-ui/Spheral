const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    username: {
      type: String,
      required: [true, 'Please add a username'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    coverPhoto: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    website: {
      type: String,
      default: '',
    },
    workplace: {
      type: String,
      default: '',
    },
    education: {
      type: String,
      default: '',
    },
    age: {
      type: Number,
      default: null,
    },
    relationshipStatus: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: '',
    },
    school: {
      type: String,
      default: '',
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    statusReason: {
      type: String,
      default: '',
    },
    warningsCount: {
      type: Number,
      default: 0,
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    friendsCount: {
      type: Number,
      default: 0,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    isProfessional: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      default: '',
    },
    publicContact: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    profileViews: [
      {
        viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    postViews: [
      {
        viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationCelebrationShown: {
      type: Boolean,
      default: false,
    },
    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'dark',
      },
      language: {
        type: String,
        enum: ['en', 'fr', 'es', 'ar', 'ha', 'yo', 'pt'],
        default: 'en',
      },
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      emailMarketingSubscribed: { type: Boolean, default: true },
    },
    lastNameChangeAt: {
      type: Date,
      default: null,
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public',
      },
      taggingApproval: {
        type: Boolean,
        default: true,
      },
      searchVisibility: {
        type: Boolean,
        default: true,
      },
      showInteractions: {
        type: Boolean,
        default: true,
      },
      friendsVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public',
      },
      followingVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
