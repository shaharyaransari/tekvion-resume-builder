// controllers/project.controller.js
const Project = require('../models/project.model');
const { projectSchema } = require('../validations/project.validations');
const logger = require('../utils/logger');

// Create Project
exports.createProject = async (req, res) => {
  const { error, value } = projectSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  const project = await Project.create({ ...value, userId: req.user._id });
  logger.info(`Project created by ${req.user.email}`);
  res.status(201).json(project);
};

// Get All Projects (with filters, search, pagination)
exports.getAllProjects = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const filter = {
    isDeleted: false,
    ...(req.user.role !== 'admin' && { userId: req.user._id }),
    $or: [
      { title: new RegExp(search, 'i') },
      { role: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') }
    ]
  };

  const projects = await Project.find(filter)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Project.countDocuments(filter);
  res.json({ total, page: parseInt(page), projects });
};

// Get Single Project
exports.getProjectById = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (req.user.role !== 'admin' && project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(project);
};

// Update Project
exports.updateProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (req.user.role !== 'admin' && project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { error, value } = projectSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  Object.assign(project, value);
  await project.save();
  logger.info(`Project updated: ${project._id} by ${req.user.email}`);
  res.json(project);
};

// Delete Project (soft delete or force delete)
exports.deleteProject = async (req, res) => {
  const { force } = req.query; // ?force=true
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (req.user.role !== 'admin' && project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (force === 'true') {
    await project.deleteOne();
    logger.warn(`Project permanently deleted: ${project._id} by ${req.user.email}`);
  } else {
    project.isDeleted = true;
    project.deletedAt = new Date();
    await project.save();
    logger.info(`Project soft-deleted: ${project._id} by ${req.user.email}`);
  }

  res.json({ message: 'Project deleted' });
};

// Bulk Delete Projects
exports.deleteMultipleProjects = async (req, res) => {
  const { ids = [], force = false } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No project IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids } }
    : { _id: { $in: ids }, userId: req.user._id };

  if (force) {
    const result = await Project.deleteMany(condition);
    logger.warn(`Force deleted ${result.deletedCount} projects by ${req.user.email}`);
    return res.json({ message: 'Projects permanently deleted', deletedCount: result.deletedCount });
  } else {
    const result = await Project.updateMany(condition, {
      $set: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });
    logger.info(`Soft deleted ${result.modifiedCount} projects by ${req.user.email}`);
    return res.json({ message: 'Projects soft deleted', modifiedCount: result.modifiedCount });
  }
};

// Restore Single Project
exports.restoreProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project || !project.isDeleted) return res.status(404).json({ error: 'Project not found or not deleted' });
  if (req.user.role !== 'admin' && project.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  project.isDeleted = false;
  project.deletedAt = null;
  await project.save();
  logger.info(`Project restored: ${project._id} by ${req.user.email}`);
  res.json({ message: 'Project restored' });
};

// Restore Multiple Projects
exports.restoreMultipleProjects = async (req, res) => {
  const { ids = [] } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No project IDs provided' });
  }

  const condition = req.user.role === 'admin'
    ? { _id: { $in: ids }, isDeleted: true }
    : { _id: { $in: ids }, userId: req.user._id, isDeleted: true };

  const result = await Project.updateMany(condition, {
    $set: { isDeleted: false, deletedAt: null }
  });

  logger.info(`Restored ${result.modifiedCount} projects by ${req.user.email}`);
  res.json({ message: 'Projects restored', modifiedCount: result.modifiedCount });
};