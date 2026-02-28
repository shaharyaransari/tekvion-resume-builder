const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  role: { type: String },  // New
  description: { type: String },
  technologies: [{ type: String }],
  highlights: [{ type: String }],  // New
  teamSize: { type: Number },  // New
  startDate: { type: Date },
  endDate: { type: Date },
  isOngoing: { type: Boolean, default: false },  // New
  projectUrl: { type: String },
  githubRepo: { type: String },  // New
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
},{
  timestamps: true
});

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;