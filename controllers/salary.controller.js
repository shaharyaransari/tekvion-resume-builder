const { estimateSalary } = require('../services/salary.service');
const { salaryEstimationSchema } = require('../validations/salary.validation');
const User = require('../models/user.model');
const Resume = require('../models/resume.model');
const Experience = require('../models/experience.model');
const Education = require('../models/education.model');
const Project = require('../models/project.model');
const Certification = require('../models/certification.model');
const logger = require('../utils/logger');

/**
 * Estimate salary and hiring chance for a given job description.
 * Subscriber-only feature.
 */
exports.estimateSalary = async (req, res) => {
    const { error, value } = salaryEstimationSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const userId = req.user._id;

        // Gather user profile data
        const [user, experiences, educations, projects, certifications] = await Promise.all([
            User.findById(userId).select('+credits'),
            Experience.find({ userId, isDeleted: false }),
            Education.find({ userId, isDeleted: false }),
            Project.find({ userId, isDeleted: false }),
            Certification.find({ userId, isDeleted: false })
        ]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const payload = {
            jobDescription: value.jobDescription,
            country: value.country || user.country || 'United States',
            userProfile: {
                name: `${user.first_name} ${user.last_name}`,
                intro: user.intro,
                skills: user.skills,
                languages: user.languages
            },
            experiences: experiences.map(e => ({
                jobTitle: e.jobTitle,
                company: e.company,
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
                technologies: p.technologies
            })),
            certifications: certifications.map(c => ({
                name: c.name,
                issuingOrganization: c.issuingOrganization
            }))
        };

        const result = await estimateSalary(payload);

        res.json({
            jobDescription: value.jobDescription.substring(0, 100) + '...',
            country: payload.country,
            ...result
        });
    } catch (err) {
        logger.error(`Salary estimation failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to estimate salary' });
    }
};

/**
 * Estimate salary and hiring chance for a specific resume.
 * Uses the resume's jobDescription and the user's country.
 * Available to all authenticated users (frontend handles display gating).
 */
exports.estimateSalaryForResume = async (req, res) => {
    try {
        const userId = req.user._id;
        const { resumeId } = req.params;

        const resume = await Resume.findOne({ _id: resumeId, userId, isDeleted: false });
        if (!resume) {
            return res.status(404).json({ error: 'Resume not found' });
        }

        if (!resume.jobDescription || resume.jobDescription.trim().length < 10) {
            return res.status(400).json({ error: 'Resume does not have a valid job description' });
        }

        // Gather user profile data
        const [user, experiences, educations, projects, certifications] = await Promise.all([
            User.findById(userId),
            Experience.find({ userId, isDeleted: false }),
            Education.find({ userId, isDeleted: false }),
            Project.find({ userId, isDeleted: false }),
            Certification.find({ userId, isDeleted: false })
        ]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const payload = {
            jobDescription: resume.jobDescription,
            country: user.country || 'United States',
            userProfile: {
                name: `${user.first_name} ${user.last_name}`,
                intro: user.intro,
                skills: user.skills,
                languages: user.languages
            },
            experiences: experiences.map(e => ({
                jobTitle: e.jobTitle,
                company: e.company,
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
                technologies: p.technologies
            })),
            certifications: certifications.map(c => ({
                name: c.name,
                issuingOrganization: c.issuingOrganization
            }))
        };

        const result = await estimateSalary(payload);

        res.json({
            resumeId: resume._id,
            jobDescription: resume.jobDescription.substring(0, 100) + '...',
            country: payload.country,
            ...result
        });
    } catch (err) {
        logger.error(`Resume salary estimation failed: ${err.message}`);
        res.status(500).json({ error: 'Failed to estimate salary for this resume' });
    }
};
