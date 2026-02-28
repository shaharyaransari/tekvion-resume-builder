// models/resume.model.js
const mongoose = require('mongoose');
const slugify = require('slugify');
const { nanoid } = require('nanoid');

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  title: { type: String, default: 'My Resume' },
  summary: { type: String },
  jobDescription: { type: String },
  educations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Education' }],
  experiences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Experience' }],
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  certifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Certification' }],
  awards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Award' }],

  selectedSkills: [{ type: String }],
  selectedLanguages: [{ type: String }],
  selectedSocialMedia: [{ type: String }],

  salaryEstimate: {
    low: { type: Number },
    high: { type: Number },
    currency: { type: String },
    period: { type: String },
    country: { type: String }
  },

  hiringChance: {
    percentage: { type: Number },
    level: { type: String },
    factors: { type: mongoose.Schema.Types.Mixed }
  },

  suggestions: [{ type: String }],

  customFields: [{
    label: { type: String, required: true },
    value: { type: String },
    icon: { type: String },
    category: { type: String }
  }],

  slug: { type: String, unique: true },
  visibility: {
    type: String,
    enum: ['private', 'public'],
    default: 'private'
  },

  // Which user-generated template is linked for public hosting
  linkedTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserGeneratedTemplate' },

  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to auto-generate slug
resumeSchema.pre('save', async function (next) {
  if (!this.slug) {
    const baseSlug = slugify(this.title || 'resume', { lower: true, strict: true });
    this.slug = `${baseSlug}-${nanoid(6)}`;
  }
  this.updatedAt = new Date();
  next();
});

const Resume = mongoose.model('Resume', resumeSchema);
module.exports = Resume;