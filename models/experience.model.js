const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String },
  companyLogo: { type: String },

  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Temporary', 'Self-employed']
  },

  industry: { type: String },

  startDate: { type: Date },
  endDate: { type: Date },
  isCurrent: { type: Boolean, default: false },

  description: { type: String },

  achievements: [{ type: String }],
  technologiesUsed: [{ type: String }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

const Experience = mongoose.model('Experience', experienceSchema);
module.exports = Experience;