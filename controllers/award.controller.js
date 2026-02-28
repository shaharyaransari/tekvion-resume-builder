// controllers/award.controller.js
const Award = require('../models/award.model');
const { awardSchema } = require('../validations/award.validations');
const logger = require('../utils/logger');

exports.createAward = async (req, res) => {
  const { error, value } = awardSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  const award = await Award.create({ ...value, userId: req.user._id });
  logger.info(`Award created by ${req.user.email}`);
  res.status(201).json(award);
};

exports.getAllAwards = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const filter = {
    isDeleted: false,
    userId: req.user.role === 'admin' ? undefined : req.user._id,
    title: new RegExp(search, 'i')
  };
  if (!filter.userId) delete filter.userId;

  const awards = await Award.find(filter)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Award.countDocuments(filter);
  res.json({ total, page: parseInt(page), awards });
};

exports.getAwardById = async (req, res) => {
  const award = await Award.findById(req.params.id);
  if (!award || award.isDeleted) return res.status(404).json({ error: 'Award not found' });
  if (req.user.role !== 'admin' && award.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(award);
};

exports.updateAward = async (req, res) => {
  const award = await Award.findById(req.params.id);
  if (!award || award.isDeleted) return res.status(404).json({ error: 'Award not found' });
  if (req.user.role !== 'admin' && award.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { error, value } = awardSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  Object.assign(award, value);
  await award.save();
  logger.info(`Award updated: ${award._id} by ${req.user.email}`);
  res.json(award);
};

exports.deleteAward = async (req, res) => {
  const { force } = req.query;
  const award = await Award.findById(req.params.id);
  if (!award) return res.status(404).json({ error: 'Award not found' });
  if (req.user.role !== 'admin' && award.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (force === 'true') {
    await award.deleteOne();
    logger.warn(`Award permanently deleted: ${award._id} by ${req.user.email}`);
  } else {
    award.isDeleted = true;
    award.deletedAt = new Date();
    await award.save();
    logger.info(`Award soft-deleted: ${award._id} by ${req.user.email}`);
  }
  res.json({ message: 'Award deleted' });
};

exports.deleteMultipleAwards = async (req, res) => {
  const { ids = [], force = false } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No award IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids } }
    : { _id: { $in: ids }, userId: req.user._id };

  if (force) {
    const result = await Award.deleteMany(condition);
    logger.warn(`Force deleted ${result.deletedCount} awards by ${req.user.email}`);
    return res.json({ message: 'Awards permanently deleted', deletedCount: result.deletedCount });
  } else {
    const result = await Award.updateMany(condition, { $set: { isDeleted: true, deletedAt: new Date() } });
    logger.info(`Soft deleted ${result.modifiedCount} awards by ${req.user.email}`);
    return res.json({ message: 'Awards soft deleted', modifiedCount: result.modifiedCount });
  }
};

exports.restoreAward = async (req, res) => {
  const award = await Award.findById(req.params.id);
  if (!award || !award.isDeleted) return res.status(404).json({ error: 'Award not found or not deleted' });
  if (req.user.role !== 'admin' && award.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  award.isDeleted = false;
  award.deletedAt = null;
  await award.save();
  logger.info(`Award restored: ${award._id} by ${req.user.email}`);
  res.json({ message: 'Award restored' });
};

exports.restoreMultipleAwards = async (req, res) => {
  const { ids = [] } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No award IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids }, isDeleted: true }
    : { _id: { $in: ids }, userId: req.user._id, isDeleted: true };

  const result = await Award.updateMany(condition, {
    $set: { isDeleted: false, deletedAt: null }
  });

  logger.info(`Restored ${result.modifiedCount} awards by ${req.user.email}`);
  res.json({ message: 'Awards restored', modifiedCount: result.modifiedCount });
};