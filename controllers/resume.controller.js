// controllers/resume.controller.js
const Resume = require('../models/resume.model');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Award = require('../models/award.model');
const Experience = require('../models/experience.model');
const Certification = require('../models/certification.model');
const Education = require('../models/education.model');
const MasterData = require('../models/masterData.model');
const logger = require('../utils/logger');
const { resumeSchema } = require('../validations/resume.validation');
const mongoose = require('mongoose');
const { deductCredits } = require('../services/credit.service');
const { generateResumeFromProfile, generateResumeTitle, generateResumeSummary } = require('../services/ai.service');
const Subscription = require('../models/subscription.model');

// Create Resume (deducts credits)
exports.createResume = async (req, res) => {
  const { error, value } = resumeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ errors: error.details.map(err => err.message) });
  }

  // Deduct credits
  const creditResult = await deductCredits(req.user._id, 'resume_creation');
  if (!creditResult.success) {
    return res.status(402).json({
      error: creditResult.error,
      creditsRequired: creditResult.required,
      creditsAvailable: creditResult.remaining
    });
  }

  const resume = await Resume.create({ ...value, userId: req.user._id });
  logger.info(`Resume created by ${req.user.email}: ${resume._id} (credits deducted: ${creditResult.creditsDeducted}, remaining: ${creditResult.remaining})`);
  res.status(201).json({
    ...resume.toObject(),
    creditsDeducted: creditResult.creditsDeducted,
    creditsRemaining: creditResult.remaining
  });
};

exports.generateResumeData = async (req, res) => {
  try {
    const { description, title, useAI = true } = req.body;

    // Validate input
    if (!description) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // Fetch user profile
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ error: 'Unauthenticated Request' });
    }

    // Fetch related entities in parallel (exclude soft-deleted)
    const [projects, awards, experiences, certifications, educations, masterSkills, masterLanguages] = await Promise.all([
      Project.find({ userId: req.user._id, isDeleted: false }).lean(),
      Award.find({ userId: req.user._id, isDeleted: false }).lean(),
      Experience.find({ userId: req.user._id, isDeleted: false }).lean(),
      Certification.find({ userId: req.user._id, isDeleted: false }).lean(),
      Education.find({ userId: req.user._id, isDeleted: false }).lean(),
      MasterData.find({ type: 'skill', isActive: true }).select('name category').lean(),
      MasterData.find({ type: 'language', isActive: true }).select('name').lean(),
    ]);

    // Build AI input payload
    const aiInputPayload = {
      jobDescription: description,
      userProfile: {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        intro: user.intro,
        dateOfBirth: user.dateOfBirth,
        location: {
          country: user.country,
          state: user.state,
          city: user.city,
          streetAddress: user.streetAddress,
          postalCode: user.postalCode
        },
        profilePhoto: user.profilePhoto,
        phones: user.phones,
        socialMedia: user.socialMedia,
        hobbies: user.hobbies,
        skills: user.skills,
        languages: user.languages
      },
      projects: projects.map(p => ({ _id: p._id, title: p.title, role: p.role, description: p.description, technologies: p.technologies, highlights: p.highlights, startDate: p.startDate, endDate: p.endDate, isOngoing: p.isOngoing })),
      awards: awards.map(a => ({ _id: a._id, title: a.title, issuer: a.issuer, date: a.date, description: a.description })),
      experiences: experiences.map(e => ({ _id: e._id, jobTitle: e.jobTitle, company: e.company, location: e.location, employmentType: e.employmentType, industry: e.industry, startDate: e.startDate, endDate: e.endDate, isCurrent: e.isCurrent, description: e.description, achievements: e.achievements, technologiesUsed: e.technologiesUsed })),
      certifications: certifications.map(c => ({ _id: c._id, name: c.name, issuingOrganization: c.issuingOrganization, issueDate: c.issueDate, expirationDate: c.expirationDate })),
      educations: educations.map(e => ({ _id: e._id, institution: e.institution, degree: e.degree, fieldOfStudy: e.fieldOfStudy, startDate: e.startDate, endDate: e.endDate, isOngoing: e.isOngoing, grade: e.grade })),
      availableSkills: masterSkills.map(s => ({ name: s.name, category: s.category })),
      availableLanguages: masterLanguages.map(l => l.name)
    };

    let aiResponse;

    if (useAI) {
      // Call AI service
      try {
        aiResponse = await generateResumeFromProfile(aiInputPayload);
        // Ensure title override
        if (title) aiResponse.title = title;
      } catch (aiError) {
        logger.error(`AI generation failed: ${aiError.message}`);
        return res.status(503).json({
          error: 'AI service is temporarily unavailable. Try again or set useAI=false for manual selection.',
          details: process.env.NODE_ENV === 'development' ? aiError.message : undefined
        });
      }
    } else {
      // Fallback: return all data for manual selection by frontend
      aiResponse = {
        title: title || 'My Resume',
        summary: user.intro || '',
        educations: educations.map(e => e._id),
        experiences: experiences.map(e => e._id),
        projects: projects.map(p => p._id),
        certifications: certifications.map(c => c._id),
        awards: awards.map(a => a._id),
        selectedSkills: (user.skills || []).map(s => s.name),
        selectedLanguages: (user.languages || []).map(l => l.name),
        selectedSocialMedia: (user.socialMedia || []).map(sm => sm.platform),
        customFields: [],
        visibility: 'private'
      };
    }

    res.status(200).json({
      message: useAI ? 'AI-generated resume data' : 'Manual selection data (all profile data included)',
      aiInputPayload,
      aiResponse,
      jobDescription: description
    });

  } catch (error) {
    logger.error(`Generate resume data error: ${error.message}`);
    res.status(500).json({ error: 'Something went wrong while generating resume data' });
  }
};

// Get All Resumes (with search, filters, pagination)
exports.getAllResumes = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const filter = req.user.role === 'admin' ? {} : { userId: req.user._id };

  const searchFilter = {
    ...filter,
    isDeleted: false,
    $or: [
      { title: new RegExp(search, 'i') },
      { summary: new RegExp(search, 'i') }
    ]
  };

  const resumes = await Resume.find(searchFilter)
    .populate('educations experiences projects certifications awards')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await Resume.countDocuments(searchFilter);
  res.json({ total, page: parseInt(page), resumes });
};

// Get Single Resume
exports.getResumeById = async (req, res) => {
  const resume = await Resume.findById(req.params.id).populate('educations experiences projects certifications awards');
  if (!resume || resume.isDeleted) return res.status(404).json({ error: 'Resume not found' });
  if (req.user.role !== 'admin' && resume.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(resume);
};

// Update Resume
exports.updateResume = async (req, res) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume || resume.isDeleted) return res.status(404).json({ error: 'Resume not found' });
  if (req.user.role !== 'admin' && resume.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { error, value } = resumeSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ errors: error.details.map(err => err.message) });
  }

  // Block setting visibility to public without an active subscription (admin bypasses)
  if (value.visibility === 'public' && resume.visibility !== 'public' && req.user.role !== 'admin') {
    const isSubscribed = await Subscription.isUserSubscribed(req.user._id);
    if (!isSubscribed) {
      return res.status(403).json({
        error: 'Subscription required',
        message: 'Public resume hosting is available exclusively for subscribers. Upgrade your plan to make your resume public.',
        upgradeUrl: '/subscription/plans'
      });
    }
  }

  Object.assign(resume, value);
  await resume.save();
  logger.info(`Resume updated: ${resume._id} by ${req.user.email}`);
  res.json(resume);
};

// Delete Resume (soft or force)
exports.deleteResume = async (req, res) => {
  const { force } = req.query;
  const resume = await Resume.findById(req.params.id);
  if (!resume) return res.status(404).json({ error: 'Resume not found' });
  if (req.user.role !== 'admin' && resume.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (force === 'true') {
    await resume.deleteOne();
    logger.warn(`Resume permanently deleted: ${resume._id} by ${req.user.email}`);
  } else {
    resume.isDeleted = true;
    resume.deletedAt = new Date();
    await resume.save();
    logger.info(`Resume soft-deleted: ${resume._id} by ${req.user.email}`);
  }
  res.json({ message: 'Resume deleted' });
};

// Bulk Delete Resumes
exports.deleteMultipleResumes = async (req, res) => {
  const { ids = [], force = false } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No resume IDs provided' });
  }
  const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
  const condition = req.user.role === 'admin'
    ? { _id: { $in: validIds } }
    : { _id: { $in: validIds }, userId: req.user._id };

  if (force) {
    const result = await Resume.deleteMany(condition);
    logger.warn(`Force deleted ${result.deletedCount} resumes by ${req.user.email}`);
    return res.json({ message: 'Resumes permanently deleted', deletedCount: result.deletedCount });
  } else {
    const result = await Resume.updateMany(condition, { $set: { isDeleted: true, deletedAt: new Date() } });
    logger.info(`Soft deleted ${result.modifiedCount} resumes by ${req.user.email}`);
    return res.json({ message: 'Resumes soft deleted', modifiedCount: result.modifiedCount });
  }
};

// Restore Single Resume
exports.restoreResume = async (req, res) => {
  const resume = await Resume.findById(req.params.id);
  if (!resume || !resume.isDeleted) return res.status(404).json({ error: 'Resume not found or not deleted' });
  if (req.user.role !== 'admin' && resume.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Access denied' });
  }
  resume.isDeleted = false;
  resume.deletedAt = null;
  await resume.save();
  logger.info(`Resume restored: ${resume._id} by ${req.user.email}`);
  res.json({ message: 'Resume restored' });
};

// Restore Multiple Resumes
exports.restoreMultipleResumes = async (req, res) => {
  const { ids = [] } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No resume IDs provided' });
  }
  const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
  const condition = req.user.role === 'admin'
    ? { _id: { $in: validIds }, isDeleted: true }
    : { _id: { $in: validIds }, userId: req.user._id, isDeleted: true };

  const result = await Resume.updateMany(condition, { $set: { isDeleted: false, deletedAt: null } });
  logger.info(`Restored ${result.modifiedCount} resumes by ${req.user.email}`);
  res.json({ message: 'Resumes restored', modifiedCount: result.modifiedCount });
};

// Regenerate Resume Title with AI
exports.regenerateTitle = async (req, res) => {
  try {
    const { jobDescription, customInstructions, currentTitle } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [experiences, educations] = await Promise.all([
      Experience.find({ userId: req.user._id, isDeleted: false }).select('jobTitle company').lean(),
      Education.find({ userId: req.user._id, isDeleted: false }).select('degree institution').lean(),
    ]);

    const payload = {
      jobDescription,
      customInstructions: customInstructions || '',
      currentTitle: currentTitle || '',
      userName: `${user.first_name} ${user.last_name}`,
      experiences: experiences.map(e => ({ jobTitle: e.jobTitle, company: e.company })),
      educations: educations.map(e => ({ degree: e.degree, institution: e.institution })),
      skills: (user.skills || []).map(s => s.name),
    };

    const result = await generateResumeTitle(payload);
    res.json({ title: result.title || 'Professional Resume' });
  } catch (error) {
    logger.error(`Regenerate title error: ${error.message}`);
    res.status(500).json({ error: 'Failed to regenerate title' });
  }
};

// Regenerate Resume Summary with AI
exports.regenerateSummary = async (req, res) => {
  try {
    const { jobDescription, customInstructions, currentSummary } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [experiences, educations, projects, certifications] = await Promise.all([
      Experience.find({ userId: req.user._id, isDeleted: false }).select('jobTitle company description achievements').lean(),
      Education.find({ userId: req.user._id, isDeleted: false }).select('degree institution fieldOfStudy').lean(),
      Project.find({ userId: req.user._id, isDeleted: false }).select('title role technologies').lean(),
      Certification.find({ userId: req.user._id, isDeleted: false }).select('name issuingOrganization').lean(),
    ]);

    const payload = {
      jobDescription,
      customInstructions: customInstructions || '',
      currentSummary: currentSummary || '',
      userName: `${user.first_name} ${user.last_name}`,
      experiences: experiences.map(e => ({ jobTitle: e.jobTitle, company: e.company, achievements: e.achievements })),
      educations: educations.map(e => ({ degree: e.degree, institution: e.institution, fieldOfStudy: e.fieldOfStudy })),
      projects: projects.map(p => ({ title: p.title, role: p.role, technologies: p.technologies })),
      certifications: certifications.map(c => ({ name: c.name, issuingOrganization: c.issuingOrganization })),
      skills: (user.skills || []).map(s => s.name),
    };

    const result = await generateResumeSummary(payload);
    res.json({ summary: result.summary || '' });
  } catch (error) {
    logger.error(`Regenerate summary error: ${error.message}`);
    res.status(500).json({ error: 'Failed to regenerate summary' });
  }
};

// Enforce visibility — privatize public resumes if user has no active subscription
exports.enforceVisibility = async (req, res) => {
  // Admins are exempt
  if (req.user.role === 'admin') {
    return res.json({ privatized: 0 });
  }

  const isSubscribed = await Subscription.isUserSubscribed(req.user._id);
  if (isSubscribed) {
    return res.json({ privatized: 0 });
  }

  const result = await Resume.updateMany(
    { userId: req.user._id, visibility: 'public', isDeleted: false },
    { $set: { visibility: 'private' } }
  );

  if (result.modifiedCount > 0) {
    logger.info(`Enforced visibility: privatized ${result.modifiedCount} resume(s) for non-subscriber user ${req.user._id}`);
  }

  res.json({ privatized: result.modifiedCount });
};