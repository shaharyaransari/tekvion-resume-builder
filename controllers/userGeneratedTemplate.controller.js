const UserGeneratedTemplate = require('../models/userGeneratedTemplate.model');
const InitialTemplate = require('../models/initialTemplate.model');
const Resume = require('../models/resume.model');
const User = require('../models/user.model');
const fs = require('fs/promises');
const path = require('path');
const generatePDF = require('../utils/pdf-generator');
const generateImage = require('../utils/html-to-image');
const logger = require('../utils/logger');
const generatePaths = require('../utils/generate-template-paths');
const { userGeneratedTemplateSchema } = require('../validations/userGeneratedTemplate.validation');
const { renderTemplate, buildTemplateContext } = require('../utils/template-engine');

/**
 * Populate a resume with all its referenced documents.
 */
async function getPopulatedResume(resumeId) {
  return Resume.findById(resumeId)
    .populate('educations')
    .populate('experiences')
    .populate('projects')
    .populate('certifications')
    .populate('awards');
}

/**
 * Read an initial template's HTML content from disk.
 */
async function readTemplateHtml(initialTemplate) {
  return fs.readFile(initialTemplate.htmlFilePath, 'utf-8');
}

/**
 * Render a resume using an initial template and return the rendered HTML.
 */
async function renderResumeFromTemplate(initialTemplateId, resumeId, requestingUser) {
  const initialTemplate = await InitialTemplate.findById(initialTemplateId);
  if (!initialTemplate) throw { status: 404, message: 'Initial template not found' };
  if (!initialTemplate.isActive) throw { status: 400, message: 'This template is no longer active' };

  const resume = await getPopulatedResume(resumeId);
  if (!resume) throw { status: 404, message: 'Resume not found' };

  const isOwner = resume.userId.equals(requestingUser._id);
  const isAdmin = requestingUser.role === 'admin';
  if (!isOwner && !isAdmin) throw { status: 403, message: 'You do not own this resume' };

  // Always use the resume owner's data for rendering (not admin's)
  const resumeOwnerId = resume.userId;
  const user = await User.findById(resumeOwnerId);
  if (!user) throw { status: 404, message: 'User not found' };

  const templateHtml = await readTemplateHtml(initialTemplate);
  const context = buildTemplateContext(resume, user);
  const renderedHtml = renderTemplate(templateHtml, context);

  return { renderedHtml, resume, initialTemplate };
}

// List user-generated templates (with pagination + optional search)
exports.getUserTemplates = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const query = {
    userId: req.user._id,
    isDeleted: false
  };

  // Search based on resume title or slug
  const resumes = await Resume.find({
    userId: req.user._id,
    $or: [
      { title: new RegExp(search, 'i') },
      { slug: new RegExp(search, 'i') }
    ]
  }).select('_id');

  if (search) {
    query.resumeId = { $in: resumes.map(r => r._id) };
  }

  const total = await UserGeneratedTemplate.countDocuments(query);

  const templates = await UserGeneratedTemplate.find(query)
    .populate('resumeId', 'title slug visibility') // populate resume details
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    templates
  });
};

// Get a single user-generated template by ID (metadata only, no file content)
exports.getTemplateById = async (req, res) => {
  const template = await UserGeneratedTemplate.findById(req.params.id)
    .populate('resumeId', 'title slug visibility');
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (!template.userId.equals(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  res.json(template);
};

// Serve template files securely (owner or admin only)
// GET /user-generated-templates/:id/files/:type  (type = html | preview | pdf)
exports.serveFile = async (req, res) => {
  const { id, type } = req.params;
  const template = await UserGeneratedTemplate.findById(id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (!template.userId.equals(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  let filePath;
  switch (type) {
    case 'html':
      filePath = template.htmlFilePath;
      break;
    case 'preview':
      filePath = template.previewImagePath;
      break;
    case 'pdf':
      filePath = template.pdfFilePath;
      break;
    default:
      return res.status(400).json({ error: 'Invalid file type. Use: html, preview, or pdf' });
  }

  if (!filePath) return res.status(404).json({ error: `${type} file not found` });

  const absolutePath = path.resolve(filePath);
  try {
    await fs.access(absolutePath);
  } catch {
    return res.status(404).json({ error: `${type} file not found on disk` });
  }

  if (type === 'pdf') {
    res.setHeader('Content-Disposition', `attachment; filename="resume.pdf"`);
  }
  return res.sendFile(absolutePath);
};

// Save or Update (now renders via template engine)
exports.createOrUpdateUserGeneratedTemplate = async (req, res) => {
  const { error, value } = userGeneratedTemplateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  const { resumeId, initialTemplateId, html } = value;

  let renderedHtml;
  let resume;

  if (initialTemplateId) {
    // New flow: render using the template engine
    const result = await renderResumeFromTemplate(initialTemplateId, resumeId, req.user);
    renderedHtml = result.renderedHtml;
    resume = result.resume;
  } else if (html) {
    // Legacy flow: accept raw HTML from frontend  
    resume = await Resume.findById(resumeId);
    if (!resume) return res.status(404).json({ error: 'Resume not found' });
    if (!resume.userId.equals(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ error: 'You do not own this resume' });
    renderedHtml = html;
  } else {
    return res.status(400).json({ error: 'Either initialTemplateId or html is required' });
  }

  // The template belongs to the resume owner, not necessarily the requesting user (admin case)
  const ownerId = resume.userId;

  // Find existing template by resumeId + initialTemplateId combo (allows multiple templates per resume)
  const findQuery = { resumeId, userId: ownerId };
  if (initialTemplateId) {
    findQuery.initialTemplateId = initialTemplateId;
  } else {
    // Legacy flow: only one raw-HTML template per resume
    findQuery.initialTemplateId = { $exists: false };
  }
  const existing = await UserGeneratedTemplate.findOne(findQuery);

  const oldPaths = {
    html: existing?.htmlFilePath,
    preview: existing?.previewImagePath,
    pdf: existing?.pdfFilePath
  };

  const paths = generatePaths(ownerId, resume._id, initialTemplateId);
  await fs.mkdir(path.dirname(paths.htmlFilePath), { recursive: true });

  await fs.writeFile(paths.htmlFilePath, renderedHtml);
  await generateImage(`file://${path.resolve(paths.htmlFilePath)}`, paths.previewImagePath);
  await generatePDF(`file://${path.resolve(paths.htmlFilePath)}`, path.resolve(paths.pdfFilePath));

  const data = {
    userId: ownerId,
    resumeId,
    initialTemplateId: initialTemplateId || existing?.initialTemplateId || null,
    htmlFilePath: paths.htmlFilePath,
    previewImagePath: paths.previewImagePath,
    pdfFilePath: paths.pdfFilePath,
    hostedUrl: `/public/resume/${resume.slug}`,
    isDeleted: false,
    deletedAt: null
  };

  const template = existing ? Object.assign(existing, data) : new UserGeneratedTemplate(data);
  await template.save();

  // Clean up old files only if paths have changed
  if (oldPaths.html && oldPaths.html !== paths.htmlFilePath) {
    await fs.unlink(oldPaths.html).catch(() => { });
  }
  if (oldPaths.preview && oldPaths.preview !== paths.previewImagePath) {
    await fs.unlink(oldPaths.preview).catch(() => { });
  }
  if (oldPaths.pdf && oldPaths.pdf !== paths.pdfFilePath) {
    await fs.unlink(oldPaths.pdf).catch(() => { });
  }

  res.status(200).json(template);
};

// Generate PDF
exports.generatePDFforTemplate = async (req, res) => {
  const template = await UserGeneratedTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (!template.userId.equals(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const resume = await Resume.findById(template.resumeId);
  if (!resume) return res.status(404).json({ error: 'Associated resume not found' });

  const slug = resume.slug;
  const htmlPath = path.resolve(template.htmlFilePath);

  // Construct new paths (keep relative for DB storage, absolute for file ops)
  const relativePdfPath = template.htmlFilePath.replace(/\.html$/, `.pdf`);
  const relativePreviewPath = template.htmlFilePath.replace(/\.html$/, `.png`);
  const absolutePdfPath = path.resolve(relativePdfPath);
  const absolutePreviewPath = path.resolve(relativePreviewPath);

  // Delete existing PDF and preview if they exist
  if (template.pdfFilePath) {
    await fs.unlink(path.resolve(template.pdfFilePath)).catch(() => { });
  }
  if (template.previewImagePath) {
    await fs.unlink(path.resolve(template.previewImagePath)).catch(() => { });
  }

  // Generate PDF
  await generatePDF(`file://${htmlPath}`, absolutePdfPath);

  // Generate Preview Image
  await generateImage(`file://${htmlPath}`, absolutePreviewPath);

  // Save relative paths to DB
  template.pdfFilePath = relativePdfPath;
  template.previewImagePath = relativePreviewPath;
  await template.save();

  // Send the PDF file as a download
  const filename = `${slug || 'resume'}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.sendFile(absolutePdfPath);
};

// Soft delete
exports.deleteTemplate = async (req, res) => {
  const template = await UserGeneratedTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  if (
    template.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { force } = req.query;

  if (force === 'true') {
    await fs.unlink(template.htmlFilePath).catch(() => { });
    await fs.unlink(template.previewImagePath).catch(() => { });
    if (template.pdfFilePath) await fs.unlink(template.pdfFilePath).catch(() => { });
    await template.deleteOne();
    return res.json({ message: 'Template permanently deleted' });
  } else {
    template.isDeleted = true;
    template.deletedAt = new Date();
    await template.save();
    return res.json({ message: 'Template soft deleted' });
  }
};

// Restore
exports.restoreTemplate = async (req, res) => {
  const template = await UserGeneratedTemplate.findById(req.params.id);
  if (!template || !template.isDeleted) {
    return res.status(404).json({ error: 'Template not found or not deleted' });
  }

  if (
    template.userId.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  template.isDeleted = false;
  template.deletedAt = null;
  await template.save();
  res.json({ message: 'Template restored' });
};

// Get all templates for a specific resume
exports.getByResumeId = async (req, res) => {
  const query = {
    resumeId: req.params.resumeId,
    isDeleted: false
  };
  // Non-admins can only see their own templates
  if (req.user.role !== 'admin') {
    query.userId = req.user._id;
  }
  const templates = await UserGeneratedTemplate.find(query)
    .populate('initialTemplateId', 'name description category previewImagePath')
    .sort({ createdAt: -1 });

  res.json({ templates });
};

// Regenerate — re-render with latest resume data using the same initial template
exports.regenerateTemplate = async (req, res) => {
  const template = await UserGeneratedTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (!template.userId.equals(req.user._id) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  if (!template.initialTemplateId) {
    return res.status(400).json({ error: 'This template was created with raw HTML and cannot be regenerated from a template. Please create a new one using an initial template.' });
  }

  const { renderedHtml, resume } = await renderResumeFromTemplate(
    template.initialTemplateId,
    template.resumeId,
    req.user
  );

  // Always use the resume owner's ID for paths (not the requesting admin's ID)
  const paths = generatePaths(resume.userId, resume._id, template.initialTemplateId);
  await fs.mkdir(path.dirname(paths.htmlFilePath), { recursive: true });

  // Write rendered HTML
  await fs.writeFile(paths.htmlFilePath, renderedHtml);

  // Regenerate preview image
  await generateImage(`file://${path.resolve(paths.htmlFilePath)}`, paths.previewImagePath);

  // Delete old PDF if it exists (it's now stale)
  if (template.pdfFilePath) {
    await fs.unlink(template.pdfFilePath).catch(() => { });
    template.pdfFilePath = null;
  }

  template.htmlFilePath = paths.htmlFilePath;
  template.previewImagePath = paths.previewImagePath;
  await template.save();

  logger.info(`Template regenerated: ${template._id}`);
  res.status(200).json(template);
};

// Preview — render a template with a resume's data and return HTML (without saving)
exports.renderPreview = async (req, res) => {
  const { initialTemplateId, resumeId } = req.query;

  if (!initialTemplateId || !resumeId) {
    return res.status(400).json({ error: 'initialTemplateId and resumeId are required' });
  }

  const { renderedHtml } = await renderResumeFromTemplate(
    initialTemplateId,
    resumeId,
    req.user
  );

  res.setHeader('Content-Type', 'text/html');
  res.send(renderedHtml);
};