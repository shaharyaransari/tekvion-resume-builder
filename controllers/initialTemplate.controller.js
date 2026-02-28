const InitialTemplate = require('../models/initialTemplate.model');
const { initialTemplateSchema } = require('../validations/initialTemplate.validation');
const logger = require('../utils/logger');
const fs = require('fs/promises');
const generateImage = require('../utils/html-to-image');
const path = require('path');
const { renderTemplate, extractPlaceholders, SAMPLE_TEMPLATE_DATA } = require('../utils/template-engine');

// Create Initial Template
exports.createInitialTemplate = async (req, res) => {
  const { error, value } = initialTemplateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  const htmlFile = req.files?.htmlFile?.[0]?.path;
  if (!htmlFile) {
    return res.status(400).json({ error: 'HTML file is required.' });
  }

  const htmlPath = htmlFile.replace(/\\/g, '/');
  const previewPath = htmlPath.replace(/\.html$/, '.png');
  const renderedPreviewPath = htmlPath.replace(/\.html$/, '-rendered.html');

  // Read the template HTML
  const templateHtml = await fs.readFile(htmlPath, 'utf-8');

  // Extract placeholders from Handlebars template
  const placeholders = extractPlaceholders(templateHtml);

  // Render template with sample data for preview image
  const renderedHtml = renderTemplate(templateHtml, SAMPLE_TEMPLATE_DATA);
  await fs.writeFile(renderedPreviewPath, renderedHtml, 'utf-8');

  // Generate Preview Image from rendered HTML
  await generateImage(`file://${path.resolve(renderedPreviewPath)}`, previewPath);

  // Clean up rendered preview HTML
  await fs.unlink(renderedPreviewPath).catch(() => { });

  const template = await InitialTemplate.create({
    ...value,
    previewImageUrl: previewPath,
    htmlFilePath: htmlPath,
    placeholders
  });

  logger.info(`Initial Template created: ${template.name}`);
  res.status(201).json(template);
};

// Get All Templates with pagination and optional search
exports.getAllInitialTemplates = async (req, res) => {
  const { page = 1, limit = 10, search = '', category } = req.query;

  const filter = {
    isActive: true,
    $or: [
      { name: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
    ]
  };

  // Allow admins to see inactive templates
  if (req.user?.role === 'admin' && req.query.showInactive === 'true') {
    delete filter.isActive;
  }

  if (category) {
    filter.category = category;
  }

  const total = await InitialTemplate.countDocuments(filter);
  const templates = await InitialTemplate.find(filter)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  res.json({
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    templates
  });
};

// Get Single Template by ID
exports.getInitialTemplateById = async (req, res) => {
  const template = await InitialTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
};

// Preview Template rendered with sample data (returns HTML)
exports.previewInitialTemplate = async (req, res) => {
  const template = await InitialTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  try {
    const templateHtml = await fs.readFile(template.htmlFilePath, 'utf-8');
    const renderedHtml = renderTemplate(templateHtml, SAMPLE_TEMPLATE_DATA);
    res.type('html').send(renderedHtml);
  } catch (err) {
    logger.error(`Failed to render template preview: ${err.message}`);
    res.status(500).json({ error: 'Failed to render template preview' });
  }
};

// Update Template
exports.updateInitialTemplate = async (req, res) => {
  const template = await InitialTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const { error, value } = initialTemplateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  const newHTML = req.files?.htmlFile?.[0]?.path;

  if (newHTML) {
    // Clean up old files
    await fs.unlink(template.htmlFilePath).catch(() => { });
    await fs.unlink(template.previewImageUrl).catch(() => { });

    const htmlPath = newHTML.replace(/\\/g, '/');
    const previewPath = htmlPath.replace(/\.html$/, '.png');
    const renderedPreviewPath = htmlPath.replace(/\.html$/, '-rendered.html');

    // Read and extract placeholders from new template
    const templateHtml = await fs.readFile(htmlPath, 'utf-8');
    const placeholders = extractPlaceholders(templateHtml);

    // Render with sample data for preview
    const renderedHtml = renderTemplate(templateHtml, SAMPLE_TEMPLATE_DATA);
    await fs.writeFile(renderedPreviewPath, renderedHtml, 'utf-8');

    // Generate new preview image
    await generateImage(`file://${path.resolve(renderedPreviewPath)}`, previewPath);

    // Clean up rendered preview HTML
    await fs.unlink(renderedPreviewPath).catch(() => { });

    template.htmlFilePath = htmlPath;
    template.previewImageUrl = previewPath;
    template.placeholders = placeholders;
    template.templateVersion = (template.templateVersion || 1) + 1;
  }

  Object.assign(template, value);
  await template.save();

  logger.info(`Initial Template updated: ${template._id}`);
  res.json(template);
};

// Delete Template
exports.deleteInitialTemplate = async (req, res) => {
  const template = await InitialTemplate.findById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  await fs.unlink(template.previewImageUrl).catch(() => { });
  await fs.unlink(template.htmlFilePath).catch(() => { });
  await template.deleteOne();
  logger.warn(`Initial Template deleted: ${template._id}`);
  res.json({ message: 'Template deleted' });
};