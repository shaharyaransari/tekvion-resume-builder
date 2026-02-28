// controllers/certification.controller.js
const Certification = require('../models/certification.model');
const { certificationSchema } = require('../validations/certification.validations');
const logger = require('../utils/logger');

// Create Certification
exports.createCertification = async (req, res) => {
  const { error, value } = certificationSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  const cert = await Certification.create({ ...value, userId: req.user._id });
  logger.info(`Certification created by ${req.user.email}`);
  res.status(201).json(cert);
};

// Get All Certifications (with pagination & search)
exports.getAllCertifications = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const filter = {
    isDeleted: false,
    ...(req.user.role !== 'admin' && { userId: req.user._id }),
    $or: [
      { name: new RegExp(search, 'i') },
      { issuingOrganization: new RegExp(search, 'i') }
    ]
  };

  const certs = await Certification.find(filter)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Certification.countDocuments(filter);
  res.json({ total, page: parseInt(page), certifications: certs });
};

// Get Single Certification
exports.getCertificationById = async (req, res) => {
  const cert = await Certification.findById(req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certification not found' });
  if (req.user.role !== 'admin' && cert.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(cert);
};

// Update Certification
exports.updateCertification = async (req, res) => {
  const cert = await Certification.findById(req.params.id);
  if (!cert || cert.isDeleted) return res.status(404).json({ error: 'Certification not found' });
  if (req.user.role !== 'admin' && cert.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { error, value } = certificationSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  Object.assign(cert, value);
  await cert.save();
  logger.info(`Certification updated: ${cert._id} by ${req.user.email}`);
  res.json(cert);
};

// Delete Certification (soft or force)
exports.deleteCertification = async (req, res) => {
  const { force } = req.query;
  const cert = await Certification.findById(req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certification not found' });
  if (req.user.role !== 'admin' && cert.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (force === 'true') {
    await cert.deleteOne();
    logger.warn(`Certification permanently deleted: ${cert._id} by ${req.user.email}`);
  } else {
    cert.isDeleted = true;
    cert.deletedAt = new Date();
    await cert.save();
    logger.info(`Certification soft-deleted: ${cert._id} by ${req.user.email}`);
  }

  res.json({ message: 'Certification deleted' });
};

// Bulk Delete Certifications
exports.deleteMultipleCertifications = async (req, res) => {
  const { ids = [], force = false } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No certification IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids } }
    : { _id: { $in: ids }, userId: req.user._id };

  if (force) {
    const result = await Certification.deleteMany(condition);
    logger.warn(`Force deleted ${result.deletedCount} certifications by ${req.user.email}`);
    return res.json({ message: 'Certifications permanently deleted', deletedCount: result.deletedCount });
  } else {
    const result = await Certification.updateMany(condition, { $set: { isDeleted: true, deletedAt: new Date() } });
    logger.info(`Soft deleted ${result.modifiedCount} certifications by ${req.user.email}`);
    return res.json({ message: 'Certifications soft deleted', modifiedCount: result.modifiedCount });
  }
};

// Restore Single Certification
exports.restoreCertification = async (req, res) => {
  const cert = await Certification.findById(req.params.id);
  if (!cert || !cert.isDeleted) return res.status(404).json({ error: 'Certification not found or not deleted' });
  if (req.user.role !== 'admin' && cert.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  cert.isDeleted = false;
  cert.deletedAt = null;
  await cert.save();
  logger.info(`Certification restored: ${cert._id} by ${req.user.email}`);
  res.json({ message: 'Certification restored' });
};

// Restore Multiple Certifications
exports.restoreMultipleCertifications = async (req, res) => {
  const { ids = [] } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No certification IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids }, isDeleted: true }
    : { _id: { $in: ids }, userId: req.user._id, isDeleted: true };

  const result = await Certification.updateMany(condition, {
    $set: { isDeleted: false, deletedAt: null }
  });

  logger.info(`Restored ${result.modifiedCount} certifications by ${req.user.email}`);
  res.json({ message: 'Certifications restored', modifiedCount: result.modifiedCount });
};