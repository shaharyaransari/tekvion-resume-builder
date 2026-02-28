const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true, minlength: 3, maxlength: 50 },
  last_name: { type: String, required: true, minlength: 3, maxlength: 50 },
  email: { type: String, required: true, unique: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  intro: String,
  dateOfBirth: { type: Date, required: true },
  password: { type: String, required: true, minlength: 8 },
  country: String,
  state: String,
  city: String,
  streetAddress: String,
  postalCode: String,
  profilePhoto: String,
  phones: [{ number: { type: String, required: true }, isPrimary: { type: Boolean, default: false } }],
  socialMedia: [{ platform: { type: String, enum: ['LinkedIn', 'Twitter', 'GitHub', 'Facebook', 'Instagram', 'Portfolio', 'Other'] }, url: String }],
  hobbies: [{ type: String }],
  credits: {
    type: Number,
    default: 10,
    select: false // Hide from normal queries
  },

  skills: [{
    name: { type: String, required: true },
    expertise: {
      type: String,
      required: true,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    }
  }],

  languages: [{
    name: { type: String, required: true },
    level: {
      type: String,
      required: true,
      enum: ['Basic', 'Conversational', 'Fluent', 'Native']
    }
  }],

  // Permanent cover-letter instructions (per user)
  coverLetterInstructions: {
    jobPost: { type: String, default: '' },
    upwork: { type: String, default: '' },
    fiverr: { type: String, default: '' }
  },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;