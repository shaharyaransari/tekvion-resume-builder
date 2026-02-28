/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */

const express = require('express');
const { authenticateUser, requireAdminRole } = require('../middlewares/auth.middleware');
const { getUserProfile, updateUserProfile, changeUserPassword, updateUserCredits, getAllUsers, deleteUser,
  deleteMultipleUsers, updateProfile, deleteAccount, uploadProfilePhoto, removeProfilePhoto } = require('../controllers/user.controller');
const { importCV, getProfileCompletion } = require('../controllers/cvImport.controller');
const tryCatch = require('../utils/tryCatch');
const createUploader = require('../utils/multer');

// Multer uploader for CV PDF files
const cvUploader = createUploader({
  destination: 'uploads/cv-imports',
  allowedMimeTypes: ['application/pdf'],
  maxFileSize: 10 * 1024 * 1024 // 10MB
});

const userRouter = express.Router();

// ── Static routes MUST come before /:id to avoid being caught by the wildcard ──

/**
 * @swagger
 * /users/profile-completion:
 *   get:
 *     summary: Get profile completion status
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile completion data
 */
userRouter.get('/profile-completion', authenticateUser, tryCatch(getProfileCompletion));

/**
 * @swagger
 * /users/import-cv:
 *   post:
 *     summary: Import CV PDF and fill profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               cv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: CV imported and profile updated
 *       400:
 *         description: Invalid file or insufficient text
 */
userRouter.post('/import-cv', authenticateUser, cvUploader.single('cv'), tryCatch(importCV));

// Multer uploader for profile photos
const profilePhotoUploader = createUploader({
  destination: 'uploads/profile-photos',
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  maxFileSize: 5 * 1024 * 1024 // 5MB
});

/**
 * @swagger
 * /users/profile-photo:
 *   post:
 *     summary: Upload profile photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile photo uploaded
 *       400:
 *         description: No file provided
 */
userRouter.post('/profile-photo', authenticateUser, profilePhotoUploader.single('photo'), tryCatch(uploadProfilePhoto));

/**
 * @swagger
 * /users/profile-photo:
 *   delete:
 *     summary: Remove profile photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile photo removed
 */
userRouter.delete('/profile-photo', authenticateUser, tryCatch(removeProfilePhoto));

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
userRouter.get('/:id', authenticateUser, tryCatch(getUserProfile));

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update own profile (personal info, phones, social media, hobbies, etc.)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               intro:
 *                 type: string
 *               country:
 *                 type: string
 *               state:
 *                 type: string
 *               city:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.put('/profile', authenticateUser, tryCatch(updateProfile));

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user profile by ID (admin or self)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               first_name: John
 *               last_name: Doe
 *     responses:
 *       200:
 *         description: Profile updated
 */
userRouter.put('/:id', authenticateUser, tryCatch(updateUserProfile));

/**
 * @swagger
 * /users/{id}/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: User ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 */
userRouter.put('/:id/change-password', authenticateUser, tryCatch(changeUserPassword));

/**
 * @swagger
 * /users/{id}/credits:
 *   patch:
 *     summary: Admin update user credits
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credits
 *             properties:
 *               credits:
 *                 type: number
 *     responses:
 *       200:
 *         description: Credits updated
 */
userRouter.patch('/:id/credits', authenticateUser, requireAdminRole, tryCatch(updateUserCredits));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
userRouter.get('/', authenticateUser, requireAdminRole, tryCatch(getAllUsers));

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: User deleted
 */
userRouter.delete('/:id', authenticateUser, requireAdminRole, tryCatch(deleteUser));

/**
 * @swagger
 * /users:
 *   delete:
 *     summary: Delete multiple users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     parameters:
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Users deleted
 */
userRouter.delete('/', authenticateUser, requireAdminRole, tryCatch(deleteMultipleUsers));

// PUT /profile already registered above (before /:id) to avoid route conflict

/**
 * @swagger
 * /users/account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 */
userRouter.delete('/account', authenticateUser, tryCatch(deleteAccount));

module.exports = userRouter;