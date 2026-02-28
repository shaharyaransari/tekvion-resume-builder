const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { userRegisterSchema } = require('../validations/user.validations');
const logger = require('../utils/logger');
const adminWhitelist = process.env.ADMIN_EMAIL_WHITELIST
  ? process.env.ADMIN_EMAIL_WHITELIST.split(',').map(email => email.trim().toLowerCase())
  : [];
const { sendEmail } = require('../services/email.service');
const { getInitialCredits, logCreditEvent } = require('../services/credit.service');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.registerUser = async (req, res) => {
  try {
    // Validate body
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn('Registration failed: Empty request body');
      return res.status(400).json({ error: 'Request body is missing.' });
    }

    const { error, value } = userRegisterSchema.validate(req.body, { abortEarly: false });
    if (error) {
      logger.warn(`Registration failed: Validation errors for email ${req.body?.email || '[unknown]'}`);
      const errors = error.details.map(err => err.message);
      return res.status(400).json({ errors });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: value.email });
    if (existingUser) {
      logger.warn(`Registration attempt with already registered email: ${value.email}`);
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Handle role logic
    let role = 'user';
    if (value.role === 'admin') {
      if (!adminWhitelist.includes(value.email.toLowerCase())) {
        logger.warn(`Unauthorized admin registration attempt: ${value.email}`);
        return res.status(403).json({ error: 'This email is not authorized to register as admin.' });
      }
      role = 'admin';
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    logger.info('Creating user with payload:', JSON.stringify({ ...value, role, isVerified: false, verificationToken, verificationTokenExpires }, null, 2));

    // Get dynamic initial credits from settings
    const initialCredits = await getInitialCredits();

    // Create user
    const user = await User.create({
      ...value,
      role,
      credits: initialCredits,
      isVerified: false,
      verificationToken,
      verificationTokenExpires
    });
    logger.info(`New user registered: ${user.email} (${role})`);

    // Log initial credits
    if (initialCredits > 0) {
      await logCreditEvent({
        userId: user._id,
        type: 'initial',
        credits: initialCredits,
        balanceAfter: initialCredits,
        description: `Welcome bonus — ${initialCredits} free credits`
      });
    }

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

    logger.info(`Verification URL (Development Only): ${user.email} (${role})`);

    // Send verification email
    try {
      await sendEmail(
        user.email,
        'Verify Your Email',
        `<h1>Email Verification</h1>
         <p>Hi ${user.first_name},</p>
         <p>Please click the link below to verify your email:</p>
         <a href="${verifyUrl}">${verifyUrl}</a>
         <p>This link will expire in 24 hours.</p>`
      );
    } catch (err) {
      logger.error(`Failed to send verification email: ${err.message}`);
    }

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.'
    });

  } catch (err) {
    logger.error(`Registration error: ${err.message}`);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// Verify Email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    logger.error(`Email verification error: ${err.message}`);
    res.status(500).json({ error: 'Server error during email verification' });
  }
};


// Resend Verification Email
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'Account is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

    try {
      await sendEmail(
        user.email,
        'Resend Email Verification',
        `<h1>Email Verification</h1>
         <p>Hi ${user.first_name},</p>
         <p>Please click the link below to verify your email:</p>
         <a href="${verifyUrl}">${verifyUrl}</a>
         <p>This link will expire in 24 hours.</p>`
      );
    } catch (emailErr) {
      logger.error(`Failed to send verification email to ${email}: ${emailErr.message}`);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ message: 'Verification email resent. Please check your inbox.' });

  } catch (err) {
    logger.error(`Resend verification error: ${err.message}`);
    res.status(500).json({ error: 'Server error during resend verification' });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Email not verified. Please check your inbox or request a new verification email.',
        resendVerification: true // front-end can show "Resend" button
      });
    }

    logger.info(`User logged in: ${email} (${user.role})`);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        credits: user.credits
      },
      token: generateToken(user)
    });
  } catch (error) {
    logger.error(`Login error for email ${req.body?.email || '[unknown]'}: ${error.message}`);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Password Reset Request Handler
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;

    // Log the reset URL
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
    }

    res.json({
      message: 'Password reset instructions sent',
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
    });
  } catch (error) {
    logger.error(`Password reset request failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to process reset request' });
  }
};

// Reset Password Handler
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'Token and new password are required'
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info(`Password reset successful for user: ${user.email}`);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    logger.error(`Password reset failed: ${error.message}`);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};