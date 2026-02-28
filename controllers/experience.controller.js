// controllers/experience.controller.js
const Experience = require('../models/experience.model');
const { experienceSchema } = require('../validations/experience.validations');
const logger = require('../utils/logger');

exports.createExperience = async (req, res) => {
  const { error, value } = experienceSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  const experience = await Experience.create({ ...value, userId: req.user._id });
  logger.info(`Experience created by ${req.user.email}`);
  res.status(201).json(experience);
};

exports.getAllExperiences = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const filter = {
    isDeleted: false,
    ...(req.user.role !== 'admin' && { userId: req.user._id }),
    $or: [
      { jobTitle: new RegExp(search, 'i') },
      { company: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') }
    ]
  };

  const experiences = await Experience.find(filter)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Experience.countDocuments(filter);
  res.json({ total, page: parseInt(page), experiences });
};

exports.getExperienceById = async (req, res) => {
  const exp = await Experience.findById(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experience not found' });
  if (req.user.role !== 'admin' && exp.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(exp);
};

exports.updateExperience = async (req, res) => {
  const exp = await Experience.findById(req.params.id);
  if (!exp || exp.isDeleted) return res.status(404).json({ error: 'Experience not found' });
  if (req.user.role !== 'admin' && exp.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { error, value } = experienceSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  Object.assign(exp, value);
  await exp.save();
  logger.info(`Experience updated: ${exp._id} by ${req.user.email}`);
  res.json(exp);
};

exports.deleteExperience = async (req, res) => {
  const { force } = req.query;
  const exp = await Experience.findById(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experience not found' });
  if (req.user.role !== 'admin' && exp.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (force === 'true') {
    await exp.deleteOne();
    logger.warn(`Experience permanently deleted: ${exp._id} by ${req.user.email}`);
  } else {
    exp.isDeleted = true;
    exp.deletedAt = new Date();
    await exp.save();
    logger.info(`Experience soft-deleted: ${exp._id} by ${req.user.email}`);
  }
  res.json({ message: 'Experience deleted' });
};

exports.deleteMultipleExperiences = async (req, res) => {
  const { ids = [], force = false } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No experience IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids } }
    : { _id: { $in: ids }, userId: req.user._id };

  if (force) {
    const result = await Experience.deleteMany(condition);
    logger.warn(`Force deleted ${result.deletedCount} experiences by ${req.user.email}`);
    return res.json({ message: 'Experiences permanently deleted', deletedCount: result.deletedCount });
  } else {
    const result = await Experience.updateMany(condition, { $set: { isDeleted: true, deletedAt: new Date() } });
    logger.info(`Soft deleted ${result.modifiedCount} experiences by ${req.user.email}`);
    return res.json({ message: 'Experiences soft deleted', modifiedCount: result.modifiedCount });
  }
};

exports.restoreExperience = async (req, res) => {
  const exp = await Experience.findById(req.params.id);
  if (!exp || !exp.isDeleted) return res.status(404).json({ error: 'Experience not found or not deleted' });
  if (req.user.role !== 'admin' && exp.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  exp.isDeleted = false;
  exp.deletedAt = null;
  await exp.save();
  logger.info(`Experience restored: ${exp._id} by ${req.user.email}`);
  res.json({ message: 'Experience restored' });
};

exports.restoreMultipleExperiences = async (req, res) => {
  const { ids = [] } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No experience IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids }, isDeleted: true }
    : { _id: { $in: ids }, userId: req.user._id, isDeleted: true };

  const result = await Experience.updateMany(condition, {
    $set: { isDeleted: false, deletedAt: null }
  });

  logger.info(`Restored ${result.modifiedCount} experiences by ${req.user.email}`);
  res.json({ message: 'Experiences restored', modifiedCount: result.modifiedCount });
};