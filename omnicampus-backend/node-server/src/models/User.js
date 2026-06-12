/**
 * User model.
 *
 * Supports students & teachers, email verification, password reset,
 * and refresh-token rotation (array of hashed tokens).
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned by default in queries
    },

    role: {
      type: String,
      enum: {
        values: ['student', 'teacher', 'admin', 'tpo'],
        message: 'Role must be student, teacher, admin, or tpo',
      },
      required: [true, 'Role is required'],
    },

    profilePicture: {
      type: String,
      default: null,
    },

    // ── Email verification ───────────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
      default: null,
    },

    // ── Password reset ───────────────────────────────────────────────
    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    // ── Student-specific ─────────────────────────────────────────────
    enrolledSubjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],

    cgpa: {
      type: Number,
      default: 8.0,
    },

    department: {
      type: String,
      default: 'CSE',
    },

<<<<<<< HEAD
=======
    backlogs: {
      type: Number,
      default: 0,
    },

>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
    attendance: {
      type: Number,
      default: 85,
    },

    placementReadiness: {
      type: Number,
      default: 75,
    },

    nextClass: {
      type: String,
      default: 'Data Structures',
    },

    assignmentDue: {
      type: String,
      default: 'Tomorrow',
    },

    // ── Refresh-token rotation (hashed tokens) ───────────────────────
    refreshTokens: {
      type: [String],
      default: [],
      select: false, // keep out of normal queries
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });

// ── Pre-save hook — hash password when modified ─────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ── Instance method — compare candidate password against hash ───────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
