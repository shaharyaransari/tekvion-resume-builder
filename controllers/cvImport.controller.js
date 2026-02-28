const fs = require('fs');
const pdfParse = require('pdf-parse');
const User = require('../models/user.model');
const Education = require('../models/education.model');
const Experience = require('../models/experience.model');
const Project = require('../models/project.model');
const Certification = require('../models/certification.model');
const Award = require('../models/award.model');
const AppSettings = require('../models/appSettings.model');
const { extractProfileFromCV, extractProfileFromCVMock } = require('../services/ai.service');
const logger = require('../utils/logger');

/**
 * POST /api/users/import-cv
 * Accepts a PDF file, extracts text, sends to AI for structured extraction,
 * then saves entities into the user's profile.
 */
exports.importCV = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const userId = req.user._id;

    try {
        // 1. Read and parse PDF text
        const pdfBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(pdfBuffer);
        const cvText = pdfData.text;

        if (!cvText || cvText.trim().length < 50) {
            return res.status(400).json({ error: 'Could not extract enough text from the PDF. Please ensure it is not a scanned image.' });
        }

        // 2. Extract structured data via AI (or mock)
        const providerKey = await AppSettings.get('ai_provider', process.env.AI_PROVIDER || 'openai');
        let extracted;

        if (providerKey === 'mock') {
            logger.info('CV import: using mock extraction');
            extracted = extractProfileFromCVMock(cvText);
        } else {
            logger.info('CV import: using AI extraction');
            extracted = await extractProfileFromCV(cvText);
        }

        // 3. Save entities into the user's profile
        const summary = {
            intro: false,
            skills: 0,
            languages: 0,
            educations: 0,
            experiences: 0,
            projects: 0,
            certifications: 0,
            awards: 0
        };

        // Update user intro, skills, languages
        const userUpdate = {};

        if (extracted.intro) {
            userUpdate.intro = extracted.intro;
            summary.intro = true;
        }

        if (extracted.skills && extracted.skills.length > 0) {
            // Merge with existing skills (don't duplicate)
            const user = await User.findById(userId);
            const existingNames = (user.skills || []).map(s => s.name.toLowerCase());
            const newSkills = extracted.skills.filter(s => !existingNames.includes(s.name.toLowerCase()));
            if (newSkills.length > 0) {
                userUpdate.skills = [...(user.skills || []), ...newSkills];
                summary.skills = newSkills.length;
            }
        }

        if (extracted.languages && extracted.languages.length > 0) {
            const user = await User.findById(userId);
            const existingNames = (user.languages || []).map(l => l.name.toLowerCase());
            const newLangs = extracted.languages.filter(l => !existingNames.includes(l.name.toLowerCase()));
            if (newLangs.length > 0) {
                userUpdate.languages = [...(user.languages || []), ...newLangs];
                summary.languages = newLangs.length;
            }
        }

        if (Object.keys(userUpdate).length > 0) {
            await User.findByIdAndUpdate(userId, userUpdate);
        }

        // Create education records
        if (extracted.educations && extracted.educations.length > 0) {
            for (const edu of extracted.educations) {
                try {
                    await Education.create({ ...edu, userId });
                    summary.educations++;
                } catch (err) {
                    logger.warn(`CV import: failed to create education: ${err.message}`);
                }
            }
        }

        // Create experience records
        if (extracted.experiences && extracted.experiences.length > 0) {
            for (const exp of extracted.experiences) {
                try {
                    await Experience.create({ ...exp, userId });
                    summary.experiences++;
                } catch (err) {
                    logger.warn(`CV import: failed to create experience: ${err.message}`);
                }
            }
        }

        // Create project records
        if (extracted.projects && extracted.projects.length > 0) {
            for (const proj of extracted.projects) {
                try {
                    await Project.create({ ...proj, userId });
                    summary.projects++;
                } catch (err) {
                    logger.warn(`CV import: failed to create project: ${err.message}`);
                }
            }
        }

        // Create certification records
        if (extracted.certifications && extracted.certifications.length > 0) {
            for (const cert of extracted.certifications) {
                try {
                    await Certification.create({ ...cert, userId });
                    summary.certifications++;
                } catch (err) {
                    logger.warn(`CV import: failed to create certification: ${err.message}`);
                }
            }
        }

        // Create award records
        if (extracted.awards && extracted.awards.length > 0) {
            for (const award of extracted.awards) {
                try {
                    await Award.create({ ...award, userId });
                    summary.awards++;
                } catch (err) {
                    logger.warn(`CV import: failed to create award: ${err.message}`);
                }
            }
        }

        // Clean up uploaded file
        try {
            fs.unlinkSync(req.file.path);
        } catch {
            // ignore cleanup errors
        }

        // Get updated user
        const updatedUser = await User.findById(userId).select('-password');

        res.status(200).json({
            message: 'CV imported successfully',
            summary,
            user: updatedUser
        });

    } catch (error) {
        // Clean up uploaded file on error
        try {
            if (req.file?.path) fs.unlinkSync(req.file.path);
        } catch { /* ignore */ }

        logger.error(`CV import failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to process CV. Please try again.' });
    }
};

/**
 * GET /api/users/profile-completion
 * Returns profile completion data for the authenticated user.
 */
exports.getProfileCompletion = async (req, res) => {
    const userId = req.user._id;

    const [user, eduCount, expCount, projCount, certCount, awardCount] = await Promise.all([
        User.findById(userId).select('intro skills languages phones socialMedia'),
        Education.countDocuments({ userId, isDeleted: { $ne: true } }),
        Experience.countDocuments({ userId, isDeleted: { $ne: true } }),
        Project.countDocuments({ userId, isDeleted: { $ne: true } }),
        Certification.countDocuments({ userId, isDeleted: { $ne: true } }),
        Award.countDocuments({ userId, isDeleted: { $ne: true } })
    ]);

    const sections = [
        { key: 'personalInfo', label: 'Personal Info', complete: !!(user?.intro), count: null },
        { key: 'skills', label: 'Skills', complete: (user?.skills?.length || 0) > 0, count: user?.skills?.length || 0 },
        { key: 'languages', label: 'Languages', complete: (user?.languages?.length || 0) > 0, count: user?.languages?.length || 0 },
        { key: 'education', label: 'Education', complete: eduCount > 0, count: eduCount },
        { key: 'experience', label: 'Experience', complete: expCount > 0, count: expCount },
        { key: 'projects', label: 'Projects', complete: projCount > 0, count: projCount },
        { key: 'certifications', label: 'Certifications', complete: certCount > 0, count: certCount },
        { key: 'awards', label: 'Awards', complete: awardCount > 0, count: awardCount },
    ];

    const completedCount = sections.filter(s => s.complete).length;
    const totalSections = sections.length;
    const percentage = Math.round((completedCount / totalSections) * 100);

    res.status(200).json({
        sections,
        completedCount,
        totalSections,
        percentage
    });
};
