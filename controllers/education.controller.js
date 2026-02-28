// controllers/education.controller.js
const Education = require('../models/education.model');
const { educationSchema } = require('../validations/education.validations');
const logger = require('../utils/logger');

// Create Education
exports.createEducation = async (req, res) => {
  const { error, value } = educationSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  const education = await Education.create({ ...value, userId: req.user._id });
  logger.info(`Education created by ${req.user.email}`);
  res.status(201).json(education);
};

// Get All Educations
exports.getAllEducations = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const filter = {
    isDeleted: false,
    ...(req.user.role !== 'admin' && { userId: req.user._id }),
    $or: [
      { institution: new RegExp(search, 'i') },
      { degree: new RegExp(search, 'i') },
      { fieldOfStudy: new RegExp(search, 'i') }
    ]
  };

  const educations = await Education.find(filter)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Education.countDocuments(filter);
  res.json({ total, page: parseInt(page), educations });
};

// Get Single Education
exports.getEducationById = async (req, res) => {
  const edu = await Education.findById(req.params.id);
  if (!edu || edu.isDeleted) return res.status(404).json({ error: 'Education not found' });
  if (req.user.role !== 'admin' && edu.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(edu);
};

// Update Education
exports.updateEducation = async (req, res) => {
  const edu = await Education.findById(req.params.id);
  if (!edu || edu.isDeleted) return res.status(404).json({ error: 'Education not found' });
  if (req.user.role !== 'admin' && edu.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { error, value } = educationSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  Object.assign(edu, value);
  await edu.save();
  logger.info(`Education updated: ${edu._id} by ${req.user.email}`);
  res.json(edu);
};

// Delete Education (soft or force)
exports.deleteEducation = async (req, res) => {
  const { force } = req.query;
  const edu = await Education.findById(req.params.id);
  if (!edu) return res.status(404).json({ error: 'Education not found' });
  if (req.user.role !== 'admin' && edu.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (force === 'true') {
    await edu.deleteOne();
    logger.warn(`Education permanently deleted: ${edu._id} by ${req.user.email}`);
  } else {
    edu.isDeleted = true;
    edu.deletedAt = new Date();
    await edu.save();
    logger.info(`Education soft-deleted: ${edu._id} by ${req.user.email}`);
  }
  res.json({ message: 'Education deleted' });
};

// Bulk Delete Educations
exports.deleteMultipleEducations = async (req, res) => {
  const { ids = [], force = false } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No education IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids } }
    : { _id: { $in: ids }, userId: req.user._id };

  if (force) {
    const result = await Education.deleteMany(condition);
    logger.warn(`Force deleted ${result.deletedCount} educations by ${req.user.email}`);
    return res.json({ message: 'Educations permanently deleted', deletedCount: result.deletedCount });
  } else {
    const result = await Education.updateMany(condition, { $set: { isDeleted: true, deletedAt: new Date() } });
    logger.info(`Soft deleted ${result.modifiedCount} educations by ${req.user.email}`);
    return res.json({ message: 'Educations soft deleted', modifiedCount: result.modifiedCount });
  }
};

// Restore Single Education
exports.restoreEducation = async (req, res) => {
  const edu = await Education.findById(req.params.id);
  if (!edu || !edu.isDeleted) return res.status(404).json({ error: 'Education not found or not deleted' });
  if (req.user.role !== 'admin' && edu.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  edu.isDeleted = false;
  edu.deletedAt = null;
  await edu.save();
  logger.info(`Education restored: ${edu._id} by ${req.user.email}`);
  res.json({ message: 'Education restored' });
};

// Restore Multiple Educations
exports.restoreMultipleEducations = async (req, res) => {
  const { ids = [] } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No education IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids }, isDeleted: true }
    : { _id: { $in: ids }, userId: req.user._id, isDeleted: true };

  const result = await Education.updateMany(condition, {
    $set: { isDeleted: false, deletedAt: null }
  });

  logger.info(`Restored ${result.modifiedCount} educations by ${req.user.email}`);
  res.json({ message: 'Educations restored', modifiedCount: result.modifiedCount });
};