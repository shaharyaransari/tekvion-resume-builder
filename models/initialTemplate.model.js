const mongoose = require('mongoose');

const initialTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  previewImageUrl: { type: String, required: true }, // Image URL for display
  htmlFilePath: { type: String, required: true }, // Server path to HTML template
  description: { type: String },
  tags: [{ type: String }],
  category: {
    type: String,
    enum: ['professional', 'creative', 'minimal', 'academic', 'modern', 'other'],
    default: 'professional'
  },
  placeholders: [{ type: String }], // Auto-extracted Handlebars variables used in this template
  isActive: { type: Boolean, default: true },
  templateVersion: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('InitialTemplate', initialTemplateSchema);