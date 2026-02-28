const User = require('../models/user.model');
const crypto = require('crypto');
const path = require('path');
const { sendEmail } = require('../services/email.service');
const logger = require('../utils/logger');


// For Admin only 
exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 10, search = '', role } = req.query;

  const query = {};

  // Search by first_name, last_name, or email
  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [
      { first_name: regex },
      { last_name: regex },
      { email: regex }
    ];
  }

  // Filter by role
  if (role && ['admin', 'user'].includes(role)) {
    query.role = role;
  }

  // Pagination logic
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Count and fetch users
  const [users, total] = await Promise.all([
    User.find(query).select('-password').skip(skip).limit(parseInt(limit)),
    User.countDocuments(query)
  ]);

  res.status(200).json({
    users,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
  });
};

// Single user deletion
exports.deleteUser = async (req, res) => {
  const userId = req.params.id;
  const { force = false } = req.query;

  // Prevent deleting yourself
  if (req.user._id.toString() === userId) {
    return res.status(403).json({ error: "You can't delete your own account" });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (force === 'true') {
    await User.deleteOne({ _id: userId });
    logger.warn(`User [${user.email}] force deleted by admin [${req.user.email}]`);
    return res.json({ message: 'User permanently deleted', userId });
  }

  user.isDeleted = true;
  user.deletedAt = new Date();
  await user.save();

  logger.warn(`User [${user.email}] soft deleted by admin [${req.user.email}]`);
  res.json({ message: 'User soft deleted', userId });
};

// Bulk user deletion
exports.deleteMultipleUsers = async (req, res) => {
  const { ids } = req.body;
  const { force = false } = req.query;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Provide an array of user IDs' });
  }

  // Prevent self-deletion
  if (ids.includes(req.user._id.toString())) {
    return res.status(403).json({ error: "You can't delete your own account" });
  }

  const users = await User.find({ _id: { $in: ids } });

  if (users.length === 0) return res.status(404).json({ error: 'No users found to delete' });

  const emails = users.map(u => u.email).join(', ');

  if (force === 'true') {
    const result = await User.deleteMany({ _id: { $in: ids } });
    logger.warn(`Users force deleted by admin [${req.user.email}]: ${emails}`);
    return res.json({ message: 'Users permanently deleted', deletedCount: result.deletedCount });
  }

  const result = await User.updateMany(
    { _id: { $in: ids } },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );

  logger.warn(`Users soft deleted by admin [${req.user.email}]: ${emails}`);
  res.json({ message: 'Users soft deleted', modifiedCount: result.modifiedCount });
};

// @desc    Get a user's profile
exports.getUserProfile = async (req, res) => {
  const requestedId = req.params.id;
  const requestingUser = req.user;

  // Only allow if requesting their own profile or is admin
  if (requestingUser._id.toString() !== requestedId && requestingUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const user = await User.findById(requestedId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Update a user's profile
exports.updateUserProfile = async (req, res) => {
  const requestedId = req.params.id;
  const requestingUser = req.user;

  if (requestingUser._id.toString() !== requestedId && requestingUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const updates = { ...req.body };
    delete updates.password; // prevent password change here
    delete updates.credits; // prevent password change here

    const updatedUser = await User.findByIdAndUpdate(
      requestedId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.changeUserPassword = async (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If requester is not the same user, check if admin
    const isSelf = req.user._id.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: You can only change your own password' });
    }

    // If user (not admin), validate currentPassword
    if (!isAdmin) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};


// @desc    Admin updates user credits
exports.updateUserCredits = async (req, res) => {
  const { id } = req.params;
  const { credits } = req.body;

  // Validation
  if (typeof credits !== 'number' || credits < 0) {
    return res.status(400).json({ error: 'Invalid credit value' });
  }

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.credits = credits;
    await user.save();

    res.json({ message: 'Credits updated', credits: user.credits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Request Password Reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // Log the reset URL instead of sending email
    logger.info('----------------------------------------');
    logger.info('Password Reset Link (Development Only):');
    logger.info(resetUrl);
    logger.info('----------------------------------------');

    try {
      await sendEmail(
        email,
        'Password Reset Request',
        `Click here to reset your password: ${resetUrl}`
      );
      logger.info(`Password reset email sent to ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send password reset email: ${emailError.message}`);
      // Continue execution - we've logged the URL
    }

    res.json({
      message: 'Password reset instructions sent. Check logs for reset link.',
      // Include reset URL in development environment only
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
    });
  } catch (error) {
    logger.error(`Password reset request failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    console.log('Reset Password Request:', req.body);
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error(`Password reset failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

// Upload Profile Photo
exports.uploadProfilePhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  const relativePath = `uploads/profile-photos/${req.file.filename}`;

  // Delete old photo if it exists
  const existingUser = await User.findById(req.user._id).select('profilePhoto');
  if (existingUser?.profilePhoto) {
    const oldPath = path.join(__dirname, '..', existingUser.profilePhoto);
    const fs = require('fs');
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { profilePhoto: relativePath } },
    { new: true }
  ).select('-password');

  res.json({ profilePhoto: relativePath, user: updatedUser });
};

// Remove Profile Photo
exports.removeProfilePhoto = async (req, res) => {
  const existingUser = await User.findById(req.user._id).select('profilePhoto');
  if (existingUser?.profilePhoto) {
    const oldPath = path.join(__dirname, '..', existingUser.profilePhoto);
    const fs = require('fs');
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { profilePhoto: '' } },
    { new: true }
  ).select('-password');

  res.json({ user: updatedUser });
};

// Update Profile (own profile — used by PersonalInfoTab)
exports.updateProfile = async (req, res) => {
  const updates = { ...req.body };

  // Fields that must never be set through this endpoint
  delete updates.password;
  delete updates.credits;
  delete updates.role;
  delete updates.isDeleted;
  delete updates.deletedAt;
  delete updates.stripeCustomerId;
  delete updates.subscription;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(updatedUser);
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error(`Account deletion failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
