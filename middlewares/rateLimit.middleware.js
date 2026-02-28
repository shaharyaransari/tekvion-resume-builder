const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Helper to log blocked IP with route info
const logBlock = (req, type) => {
  const ip = req.ip;
  const route = req.originalUrl;
  const userAgent = req.headers['user-agent'] || 'Unknown Agent';
  logger.warn(`[RateLimit:${type}] Blocked IP: ${ip} | Route: ${route} | Agent: ${userAgent}`);
};

// General: Too many requests from same IP
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Max 200 requests/minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logBlock(req, 'General');
    res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
});

// Burst/abuse protection
const strictBlocker = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logBlock(req, 'Strict');
    res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
});

// Login brute-force protection
const loginFailLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 failed attempts
  skipSuccessfulRequests: true, // only count failures
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logBlock(req, 'LoginFail');
    res.status(429).json({ error: 'Too many failed login attempts. Try again in 10 minutes.' });
  }
});

const resendVerificationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1, // only 1 request per minute
  keyGenerator: (req, res) => {
    // Rate limit based on email if provided, otherwise fall back to IP
    return req.body.email?.toLowerCase().trim() || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logBlock(req, 'ResendVerification');
    res.status(429).json({
      error: 'You can only request a new verification email for this address once per minute.',
    });
  }
});

module.exports = {
  generalLimiter,
  strictBlocker,
  loginFailLimiter,
  resendVerificationLimiter
};