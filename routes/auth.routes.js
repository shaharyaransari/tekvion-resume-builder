/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and password management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Invalid email or password"
 *
 *     ValidationErrorResponse:
 *       type: object
 *       properties:
 *         errors:
 *           type: array
 *           items:
 *             type: string
 *           example:
 *             - "first_name is required"
 *             - "email must be a valid email"
 *
 *     UserRegister:
 *       type: object
 *       required:
 *         - first_name
 *         - last_name
 *         - email
 *         - password
 *         - dateOfBirth
 *       properties:
 *         first_name:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           example: "John"
 *         last_name:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           example: "Doe"
 *         intro:
 *           type: string
 *           example: "I am a software developer"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: "StrongPass123!"
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: "1990-05-10"
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           default: user
 *         country:
 *           type: string
 *         state:
 *           type: string
 *         city:
 *           type: string
 *         streetAddress:
 *           type: string
 *         postalCode:
 *           type: string
 *         profilePhoto:
 *           type: string
 *           format: uri
 *         phones:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               number:
 *                 type: string
 *                 example: "+1234567890"
 *               isPrimary:
 *                 type: boolean
 *                 default: false
 *         socialMedia:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [LinkedIn, Twitter, GitHub, Facebook, Instagram, Portfolio, Other]
 *               url:
 *                 type: string
 *                 format: uri
 *         hobbies:
 *           type: array
 *           items:
 *             type: string
 *         skills:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               expertise:
 *                 type: string
 *                 enum: [Beginner, Intermediate, Advanced, Expert]
 *         languages:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [Basic, Conversational, Fluent, Native]
 *
 *     UserLogin:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "StrongPass123!"
 *
 *     PasswordResetRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *
 *     PasswordReset:
 *       type: object
 *       required:
 *         - token
 *         - newPassword
 *       properties:
 *         token:
 *           type: string
 *           example: "6fc3933567e2dea4fc2010ba79d9dad548a46b72b7264edc908cec5923708c57"
 *         newPassword:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: "NewSecurePass123!"
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               example: "507f1f77bcf86cd799439011"
 *             email:
 *               type: string
 *               example: "john.doe@example.com"
 *             first_name:
 *               type: string
 *               example: "John"
 *             last_name:
 *               type: string
 *               example: "Doe"
 *             role:
 *               type: string
 *               example: "user"
 *             credits:
 *               type: number
 *               example: 100
 *         token:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR..."
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new account. Admin registration requires whitelisted email addresses.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             oneOf:
 *               - $ref: '#/components/schemas/ValidationErrorResponse'
 *               - $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Unauthorized admin registration
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/request-reset-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *     responses:
 *       200:
 *         description: Reset instructions sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset instructions sent"
 *                 resetUrl:
 *                   type: string
 *                   example: "http://localhost:3000/reset-password/{token}"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a valid token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordReset'
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset successful"
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify user email
 *     description: Confirms a user's email address using a verification token.
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           example: "6fc3933567e2dea4fc2010ba79d9dad548a46b72b7264edc908cec5923708c57"
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully"
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     description: Sends a new verification email if the account is not verified.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Verification email resent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification email resent. Please check your inbox."
 *       400:
 *         description: Email missing, account already verified, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    requestPasswordReset, 
    resetPassword,
    verifyEmail,
    resendVerificationEmail
} = require('../controllers/auth.controller');
const tryCatch = require('../utils/tryCatch');
const { resendVerificationLimiter, loginFailLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/register', tryCatch(registerUser));
router.post('/login', loginFailLimiter,  tryCatch(loginUser));
router.post('/request-reset-password', tryCatch(requestPasswordReset));
router.post('/reset-password', tryCatch(resetPassword));
router.get('/verify-email/:token', tryCatch(verifyEmail));
router.post('/resend-verification',resendVerificationLimiter, tryCatch(resendVerificationEmail));

module.exports = router;