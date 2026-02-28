const User = require('../models/user.model');
const Experience = require('../models/experience.model');
const Education = require('../models/education.model');
const Project = require('../models/project.model');
const Certification = require('../models/certification.model');
const coverLetterService = require('../services/coverLetter.service');
const { deductCredits, checkCredits } = require('../services/credit.service');
const AppSettings = require('../models/appSettings.model');
const {
    jobPostSchema,
    upworkEstimateSchema,
    upworkProposalSchema,
    fiverrEstimateSchema,
    fiverrProposalSchema,
    updateInstructionsSchema
} = require('../validations/coverLetter.validations');
const logger = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Gather user profile + entities for AI payload.
 */
async function gatherProfile(userId) {
    const [user, experiences, educations, projects, certifications] = await Promise.all([
        User.findById(userId),
        Experience.find({ userId, isDeleted: false }),
        Education.find({ userId, isDeleted: false }),
        Project.find({ userId, isDeleted: false }),
        Certification.find({ userId, isDeleted: false })
    ]);

    if (!user) throw new Error('User not found');

    return {
        userProfile: {
            name: `${user.first_name} ${user.last_name}`,
            intro: user.intro,
            skills: user.skills,
            languages: user.languages,
            country: user.country
        },
        experiences: experiences.map(e => ({
            jobTitle: e.jobTitle,
            company: e.company,
            description: e.description,
            achievements: e.achievements,
            technologiesUsed: e.technologiesUsed,
            startDate: e.startDate,
            endDate: e.endDate
        })),
        educations: educations.map(e => ({
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy,
            institution: e.institution
        })),
        projects: projects.map(p => ({
            title: p.title,
            description: p.description,
            technologies: p.technologies,
            highlights: p.highlights
        })),
        certifications: certifications.map(c => ({
            name: c.name,
            issuingOrganization: c.issuingOrganization
        })),
        coverLetterInstructions: user.coverLetterInstructions || {}
    };
}

// ─── Job Post Cover Letter ──────────────────────────────────────────────────

exports.generateJobPost = async (req, res) => {
    const { error, value } = jobPostSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Deduct credits
    const creditResult = await deductCredits(req.user._id, 'job_post_cover_letter');
    if (!creditResult.success) {
        return res.status(402).json({
            error: creditResult.error,
            creditsRequired: creditResult.required,
            creditsAvailable: creditResult.remaining
        });
    }

    try {
        const profile = await gatherProfile(req.user._id);
        const payload = {
            ...profile,
            jobDescription: value.jobDescription,
            additionalInstructions: value.additionalInstructions || '',
            permanentInstructions: profile.coverLetterInstructions.jobPost || ''
        };

        const result = await coverLetterService.generateJobPostCoverLetter(payload);
        res.json({ ...result, creditsDeducted: creditResult.creditsDeducted, creditsRemaining: creditResult.remaining });
    } catch (err) {
        logger.error(`Job post cover letter failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to generate cover letter' });
    }
};

// ─── Upwork ──────────────────────────────────────────────────────────────────

exports.estimateUpwork = async (req, res) => {
    const { error, value } = upworkEstimateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Deduct credits
    const creditResult = await deductCredits(req.user._id, 'upwork_estimate');
    if (!creditResult.success) {
        return res.status(402).json({
            error: creditResult.error,
            creditsRequired: creditResult.required,
            creditsAvailable: creditResult.remaining
        });
    }

    try {
        const profile = await gatherProfile(req.user._id);
        const payload = {
            ...profile,
            jobDescription: value.jobDescription,
            clientName: value.clientName || '',
            additionalInstructions: value.additionalInstructions || '',
            permanentInstructions: profile.coverLetterInstructions.upwork || ''
        };

        const result = await coverLetterService.estimateUpwork(payload);
        res.json({ ...result, creditsDeducted: creditResult.creditsDeducted, creditsRemaining: creditResult.remaining });
    } catch (err) {
        logger.error(`Upwork estimate failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to estimate timeline & budget' });
    }
};

exports.writeUpworkProposal = async (req, res) => {
    const { error, value } = upworkProposalSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Deduct credits
    const creditResult = await deductCredits(req.user._id, 'upwork_proposal');
    if (!creditResult.success) {
        return res.status(402).json({
            error: creditResult.error,
            creditsRequired: creditResult.required,
            creditsAvailable: creditResult.remaining
        });
    }

    try {
        const profile = await gatherProfile(req.user._id);
        const payload = {
            ...profile,
            jobDescription: value.jobDescription,
            clientName: value.clientName || '',
            additionalInstructions: value.additionalInstructions || '',
            permanentInstructions: profile.coverLetterInstructions.upwork || ''
        };

        const result = await coverLetterService.writeUpworkProposal(payload);
        res.json({ ...result, creditsDeducted: creditResult.creditsDeducted, creditsRemaining: creditResult.remaining });
    } catch (err) {
        logger.error(`Upwork proposal failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to write proposal' });
    }
};

// ─── Fiverr ──────────────────────────────────────────────────────────────────

exports.estimateFiverr = async (req, res) => {
    const { error, value } = fiverrEstimateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Deduct credits
    const creditResult = await deductCredits(req.user._id, 'fiverr_estimate');
    if (!creditResult.success) {
        return res.status(402).json({
            error: creditResult.error,
            creditsRequired: creditResult.required,
            creditsAvailable: creditResult.remaining
        });
    }

    try {
        const profile = await gatherProfile(req.user._id);
        const payload = {
            ...profile,
            jobDescription: value.jobDescription,
            clientName: value.clientName || '',
            additionalInstructions: value.additionalInstructions || '',
            permanentInstructions: profile.coverLetterInstructions.fiverr || ''
        };

        const result = await coverLetterService.estimateFiverr(payload);
        res.json({ ...result, creditsDeducted: creditResult.creditsDeducted, creditsRemaining: creditResult.remaining });
    } catch (err) {
        logger.error(`Fiverr estimate failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to estimate timeline & budget' });
    }
};

exports.writeFiverrProposal = async (req, res) => {
    const { error, value } = fiverrProposalSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Deduct credits
    const creditResult = await deductCredits(req.user._id, 'fiverr_proposal');
    if (!creditResult.success) {
        return res.status(402).json({
            error: creditResult.error,
            creditsRequired: creditResult.required,
            creditsAvailable: creditResult.remaining
        });
    }

    try {
        const profile = await gatherProfile(req.user._id);
        const payload = {
            ...profile,
            jobDescription: value.jobDescription,
            clientName: value.clientName || '',
            additionalInstructions: value.additionalInstructions || '',
            permanentInstructions: profile.coverLetterInstructions.fiverr || ''
        };

        const result = await coverLetterService.writeFiverrProposal(payload);
        res.json({ ...result, creditsDeducted: creditResult.creditsDeducted, creditsRemaining: creditResult.remaining });
    } catch (err) {
        logger.error(`Fiverr proposal failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to write proposal' });
    }
};

// ─── Credit Costs ────────────────────────────────────────────────────────────

exports.getCosts = async (req, res) => {
    const [jobPost, upworkEstimate, upworkProposal, fiverrEstimate, fiverrProposal] = await Promise.all([
        AppSettings.get('credits_per_job_post_cover_letter', 1),
        AppSettings.get('credits_per_upwork_estimate', 1),
        AppSettings.get('credits_per_upwork_proposal', 1),
        AppSettings.get('credits_per_fiverr_estimate', 1),
        AppSettings.get('credits_per_fiverr_proposal', 1),
    ]);

    res.json({
        jobPost,
        upworkEstimate,
        upworkProposal,
        fiverrEstimate,
        fiverrProposal
    });
};

// ─── Permanent Instructions ─────────────────────────────────────────────────

exports.getInstructions = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
        instructions: user.coverLetterInstructions || { jobPost: '', upwork: '', fiverr: '' }
    });
};

exports.updateInstructions = async (req, res) => {
    const { error, value } = updateInstructionsSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const update = {};
        if (value.jobPost !== undefined) update['coverLetterInstructions.jobPost'] = value.jobPost;
        if (value.upwork !== undefined) update['coverLetterInstructions.upwork'] = value.upwork;
        if (value.fiverr !== undefined) update['coverLetterInstructions.fiverr'] = value.fiverr;

        const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found' });

        logger.info(`Cover letter instructions updated by ${req.user.email}`);
        res.json({
            message: 'Instructions updated',
            instructions: user.coverLetterInstructions
        });
    } catch (err) {
        logger.error(`Update instructions failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to update instructions' });
    }
};
