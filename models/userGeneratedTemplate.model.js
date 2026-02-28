const mongoose = require('mongoose');

const userGeneratedTemplateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
  initialTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'InitialTemplate' }, // Which admin template was used

  htmlFilePath: { type: String, required: true },
  pdfFilePath: { type: String },
  previewImagePath: { type: String },

  hostedUrl: { type: String }, // based on resume slug

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('UserGeneratedTemplate', userGeneratedTemplateSchema);
