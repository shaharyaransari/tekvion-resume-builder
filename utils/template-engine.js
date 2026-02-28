const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// ── Profile Image Utilities ─────────────────────────────────────────────────

/**
 * Read a profile photo from disk and return a base64 data URI.
 * Returns null if the file doesn't exist or the path is empty.
 * @param {string|null} profilePhotoPath - Relative path like "uploads/profile-photos/photo.jpg"
 * @returns {string|null} Data URI string e.g. "data:image/jpeg;base64,..." or null
 */
function profilePhotoToDataUri(profilePhotoPath) {
    if (!profilePhotoPath) return null;
    try {
        const absolutePath = path.resolve(__dirname, '..', profilePhotoPath);
        if (!fs.existsSync(absolutePath)) return null;
        const buffer = fs.readFileSync(absolutePath);
        const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
        const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
        const mime = mimeMap[ext] || 'image/jpeg';
        return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
        return null;
    }
}

// ── Custom Helpers ──────────────────────────────────────────────────────────

/**
 * Format a date value into a readable string.
 * Usage: {{formatDate startDate "MMM YYYY"}}
 * Supported formats: "MMM YYYY", "YYYY", "DD MMM YYYY", "MM/YYYY"
 * Defaults to "MMM YYYY" if no format specified.
 */
Handlebars.registerHelper('formatDate', function (date, format) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const fmt = typeof format === 'string' ? format : 'MMM YYYY';

    switch (fmt) {
        case 'YYYY':
            return d.getFullYear().toString();
        case 'MM/YYYY':
            return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        case 'DD MMM YYYY':
            return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
        case 'MMMM YYYY':
            return `${fullMonths[d.getMonth()]} ${d.getFullYear()}`;
        case 'MMM YYYY':
        default:
            return `${months[d.getMonth()]} ${d.getFullYear()}`;
    }
});

/**
 * Uppercase a string.
 * Usage: {{uppercase "hello"}} → "HELLO"
 */
Handlebars.registerHelper('uppercase', function (str) {
    return typeof str === 'string' ? str.toUpperCase() : '';
});

/**
 * Lowercase a string.
 * Usage: {{lowercase "HELLO"}} → "hello"
 */
Handlebars.registerHelper('lowercase', function (str) {
    return typeof str === 'string' ? str.toLowerCase() : '';
});

/**
 * Capitalize first letter.
 * Usage: {{capitalize "hello"}} → "Hello"
 */
Handlebars.registerHelper('capitalize', function (str) {
    if (typeof str !== 'string' || !str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
});

/**
 * Join an array with a separator.
 * Usage: {{joinArray skills ", "}} → "JavaScript, Python, React"
 */
Handlebars.registerHelper('joinArray', function (arr, separator) {
    if (!Array.isArray(arr)) return '';
    const sep = typeof separator === 'string' ? separator : ', ';
    return arr.join(sep);
});

/**
 * Equality check.
 * Usage: {{#ifEquals status "active"}}...{{/ifEquals}}
 */
Handlebars.registerHelper('ifEquals', function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
});

/**
 * Not-equal check.
 * Usage: {{#ifNotEquals status "inactive"}}...{{/ifNotEquals}}
 */
Handlebars.registerHelper('ifNotEquals', function (a, b, options) {
    return a !== b ? options.fn(this) : options.inverse(this);
});

/**
 * Check if array has items.
 * Usage: {{#ifHasItems experiences}}...{{/ifHasItems}}
 */
Handlebars.registerHelper('ifHasItems', function (arr, options) {
    if (Array.isArray(arr) && arr.length > 0) {
        return options.fn(this);
    }
    return options.inverse(this);
});

/**
 * Get array length.
 * Usage: {{arrayLength experiences}}
 */
Handlebars.registerHelper('arrayLength', function (arr) {
    return Array.isArray(arr) ? arr.length : 0;
});

/**
 * Map skill expertise level to a percentage width.
 * Usage: {{skillWidth this.expertise}}
 * Output: "100%" for Expert, "80%" for Advanced, etc.
 */
Handlebars.registerHelper('skillWidth', function (expertise) {
    const map = {
        'Expert': '100%',
        'Advanced': '80%',
        'Intermediate': '60%',
        'Beginner': '35%'
    };
    return map[expertise] || '50%';
});

/**
 * Date range helper (common resume pattern).
 * Usage: {{dateRange startDate endDate isCurrent "MMM YYYY"}}
 * Output: "Jan 2020 – Present" or "Jan 2020 – Dec 2023"
 */
Handlebars.registerHelper('dateRange', function (startDate, endDate, isCurrent, format) {
    const fmt = typeof format === 'string' ? format : 'MMM YYYY';
    const start = Handlebars.helpers.formatDate(startDate, fmt);
    if (isCurrent) return `${start} – Present`;
    const end = Handlebars.helpers.formatDate(endDate, fmt);
    return end ? `${start} – ${end}` : start;
});

/**
 * Get the primary phone number.
 * Usage: {{primaryPhone user.phones}}
 */
Handlebars.registerHelper('primaryPhone', function (phones) {
    if (!Array.isArray(phones) || phones.length === 0) return '';
    const primary = phones.find(p => p.isPrimary);
    return primary ? primary.number : phones[0].number;
});

/**
 * Get social media URL by platform name.
 * Usage: {{socialUrl socialMedia "LinkedIn"}}
 */
Handlebars.registerHelper('socialUrl', function (socialMedia, platform) {
    if (!Array.isArray(socialMedia)) return '';
    const entry = socialMedia.find(s => s.platform === platform);
    return entry ? entry.url : '';
});

/**
 * Get full address from user.
 * Usage: {{fullAddress user}}
 */
Handlebars.registerHelper('fullAddress', function (user) {
    const parts = [user.streetAddress, user.city, user.state, user.country, user.postalCode].filter(Boolean);
    return parts.join(', ');
});

/**
 * 1-indexed loop index.
 * Usage: Inside {{#each}}, use {{indexPlusOne @index}}
 */
Handlebars.registerHelper('indexPlusOne', function (index) {
    return index + 1;
});

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Compile a Handlebars template string into a template function.
 * @param {string} htmlString - The Handlebars template HTML
 * @returns {HandlebarsTemplateDelegate} Compiled template function
 */
function compileTemplate(htmlString) {
    return Handlebars.compile(htmlString);
}

/**
 * Render a Handlebars template with the given context data.
 * @param {string} templateHtml - The raw Handlebars template HTML
 * @param {Object} contextData - The data context to render with
 * @returns {string} Rendered HTML string
 */
function renderTemplate(templateHtml, contextData) {
    const template = compileTemplate(templateHtml);
    return template(contextData);
}

/**
 * Extract all placeholder variable names from a Handlebars template.
 * Useful for showing admins what variables a template uses.
 * @param {string} htmlString - The Handlebars template HTML
 * @returns {string[]} Array of unique placeholder paths (e.g., ['user.first_name', 'experiences'])
 */
function extractPlaceholders(htmlString) {
    const placeholders = new Set();

    // Match simple variables: {{variable}} or {{object.property}}
    const simplePattern = /\{\{(?!#|\/|!|>)([^{}]+)\}\}/g;
    let match;
    while ((match = simplePattern.exec(htmlString)) !== null) {
        let placeholder = match[1].trim();
        // Skip helpers with arguments (e.g., "formatDate startDate") — extract just the first arg context
        // But keep direct paths like "user.first_name"
        if (placeholder.startsWith('this.')) {
            placeholder = placeholder.replace('this.', '');
        }
        // Skip built-in helpers like @index, @key, else
        if (placeholder.startsWith('@') || placeholder === 'else') continue;
        // For helper calls like "formatDate this.startDate", extract the variable
        const parts = placeholder.split(/\s+/);
        if (parts.length > 1) {
            // It's a helper call — extract variables (skip the helper name and string literals)
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i].replace(/^this\./, '').replace(/^["']|["']$/g, '');
                if (!part.startsWith('@') && !part.startsWith('"') && !part.startsWith("'") && part.length > 1 && !/^[,;.]+$/.test(part)) {
                    placeholders.add(part);
                }
            }
        } else {
            if (placeholder && placeholder.length > 0 && placeholder !== 'this') {
                placeholders.add(placeholder);
            }
        }
    }

    // Match block helpers: {{#each experiences}}, {{#if skills.length}}, {{#ifHasItems projects}}
    const blockPattern = /\{\{#(?:each|if|unless|ifHasItems|ifEquals|ifNotEquals)\s+([^{}]+)\}\}/g;
    while ((match = blockPattern.exec(htmlString)) !== null) {
        let placeholder = match[1].trim().split(/\s+/)[0]; // First arg is the variable
        placeholder = placeholder.replace('.length', ''); // Remove .length suffix
        // Skip this.* references inside loops (context-relative)
        if (placeholder.startsWith('this.')) {
            placeholder = placeholder.replace('this.', '');
        }
        if (placeholder && placeholder.length > 0) {
            placeholders.add(placeholder);
        }
    }

    return [...placeholders].filter(p => p && p.length > 0).sort();
}

/**
 * Build the full template context object from a populated resume and user.
 * This is the data shape that every template receives.
 * 
 * @param {Object} resume - Fully populated Resume document
 * @param {Object} user - User document
 * @returns {Object} Template context object
 */
function buildTemplateContext(resume, user) {
    const userObj = user.toObject ? user.toObject() : { ...user };
    const resumeObj = resume.toObject ? resume.toObject() : { ...resume };

    // Resolve selected skills from user's skill list
    const selectedSkills = resumeObj.selectedSkills || [];
    const allUserSkills = userObj.skills || [];
    const skills = selectedSkills.length > 0
        ? allUserSkills.filter(s => selectedSkills.includes(s.name))
        : allUserSkills;

    // Resolve selected languages from user's language list
    const selectedLanguages = resumeObj.selectedLanguages || [];
    const allUserLanguages = userObj.languages || [];
    const languages = selectedLanguages.length > 0
        ? allUserLanguages.filter(l => selectedLanguages.includes(l.name))
        : allUserLanguages;

    // Resolve selected social media from user's social media list
    const selectedSocialMedia = resumeObj.selectedSocialMedia || [];
    const allUserSocialMedia = userObj.socialMedia || [];
    const socialMedia = selectedSocialMedia.length > 0
        ? allUserSocialMedia.filter(s => selectedSocialMedia.includes(s.platform))
        : allUserSocialMedia;

    // Clean populated arrays (remove mongoose metadata, filter deleted)
    const cleanArray = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr
            .filter(item => item && !item.isDeleted)
            .map(item => (item.toObject ? item.toObject() : { ...item }));
    };

    // Convert profile photo to base64 data URI for embedding in templates
    const profileImageDataUri = profilePhotoToDataUri(userObj.profilePhoto);

    return {
        user: {
            first_name: userObj.first_name,
            last_name: userObj.last_name,
            full_name: `${userObj.first_name} ${userObj.last_name}`,
            email: userObj.email,
            intro: userObj.intro,
            dateOfBirth: userObj.dateOfBirth,
            country: userObj.country,
            state: userObj.state,
            city: userObj.city,
            streetAddress: userObj.streetAddress,
            postalCode: userObj.postalCode,
            profilePhoto: userObj.profilePhoto,
            profileImage: profileImageDataUri,
            phones: userObj.phones || [],
            socialMedia: allUserSocialMedia,
            hobbies: userObj.hobbies || []
        },
        resume: {
            title: resumeObj.title,
            summary: resumeObj.summary,
            jobDescription: resumeObj.jobDescription,
            selectedSkills: resumeObj.selectedSkills || [],
            selectedLanguages: resumeObj.selectedLanguages || [],
            selectedSocialMedia: resumeObj.selectedSocialMedia || [],
            customFields: resumeObj.customFields || [],
            slug: resumeObj.slug,
            visibility: resumeObj.visibility
        },
        experiences: cleanArray(resumeObj.experiences),
        educations: cleanArray(resumeObj.educations),
        projects: cleanArray(resumeObj.projects),
        certifications: cleanArray(resumeObj.certifications),
        awards: cleanArray(resumeObj.awards),
        skills,
        languages,
        socialMedia
    };
}

/**
 * Sample data used to render admin template previews.
 * Contains realistic dummy data that covers all template variables.
 */
const SAMPLE_TEMPLATE_DATA = {
    user: {
        first_name: 'Alex',
        last_name: 'Johnson',
        full_name: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        intro: 'Experienced software engineer passionate about building scalable web applications.',
        dateOfBirth: new Date('1995-03-15'),
        country: 'United States',
        state: 'California',
        city: 'San Francisco',
        streetAddress: '123 Tech Avenue',
        postalCode: '94102',
        profilePhoto: null,
        profileImage: 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="100" fill="#e2e8f0"/><text x="100" y="125" text-anchor="middle" font-family="Arial" font-size="80" fill="#94a3b8">AJ</text></svg>').toString('base64'),
        phones: [
            { number: '+1 (555) 123-4567', isPrimary: true },
            { number: '+1 (555) 987-6543', isPrimary: false }
        ],
        socialMedia: [
            { platform: 'LinkedIn', url: 'https://linkedin.com/in/alexjohnson' },
            { platform: 'GitHub', url: 'https://github.com/alexjohnson' },
            { platform: 'Portfolio', url: 'https://alexjohnson.dev' }
        ],
        hobbies: ['Open Source Contributing', 'Photography', 'Hiking']
    },
    resume: {
        title: 'Senior Full Stack Developer',
        summary: 'Results-driven Full Stack Developer with 6+ years of experience designing and implementing scalable web applications. Proficient in React, Node.js, and cloud technologies. Passionate about clean code, performance optimization, and mentoring junior developers.',
        jobDescription: 'Senior Full Stack Developer',
        selectedSkills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
        selectedLanguages: ['English', 'Spanish'],
        selectedSocialMedia: ['LinkedIn', 'GitHub'],
        customFields: [
            { label: 'Availability', value: 'Immediate', icon: 'calendar', category: 'general' },
            { label: 'Work Authorization', value: 'US Citizen', icon: 'shield', category: 'general' }
        ],
        slug: 'alex-johnson-resume',
        visibility: 'public'
    },
    experiences: [
        {
            jobTitle: 'Senior Full Stack Developer',
            company: 'TechCorp Inc.',
            location: 'San Francisco, CA',
            employmentType: 'Full-time',
            industry: 'Technology',
            startDate: new Date('2021-06-01'),
            endDate: null,
            isCurrent: true,
            description: 'Lead development of microservices architecture serving 2M+ users. Mentor team of 5 junior developers.',
            achievements: [
                'Reduced API response time by 40% through query optimization',
                'Led migration from monolith to microservices architecture',
                'Implemented CI/CD pipeline reducing deployment time by 60%'
            ],
            technologiesUsed: ['React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS']
        },
        {
            jobTitle: 'Full Stack Developer',
            company: 'StartupXYZ',
            location: 'Remote',
            employmentType: 'Full-time',
            industry: 'SaaS',
            startDate: new Date('2019-01-15'),
            endDate: new Date('2021-05-30'),
            isCurrent: false,
            description: 'Built and maintained SaaS platform features from concept to deployment.',
            achievements: [
                'Developed real-time collaboration feature used by 50K+ users',
                'Improved test coverage from 45% to 90%'
            ],
            technologiesUsed: ['Vue.js', 'Express', 'MongoDB', 'Redis']
        }
    ],
    educations: [
        {
            institution: 'University of California, Berkeley',
            degree: 'Bachelor of Science',
            fieldOfStudy: 'Computer Science',
            startDate: new Date('2013-09-01'),
            endDate: new Date('2017-05-15'),
            isOngoing: false,
            grade: '3.8 GPA',
            description: 'Focused on software engineering and distributed systems.',
            activities: ['ACM Club President', 'Hackathon Organizer']
        }
    ],
    projects: [
        {
            title: 'Open Source Task Manager',
            role: 'Creator & Maintainer',
            description: 'A full-featured task management app with real-time sync, built with React and Firebase.',
            technologies: ['React', 'Firebase', 'TypeScript', 'Tailwind CSS'],
            highlights: ['500+ GitHub stars', 'Featured on Hacker News'],
            teamSize: 3,
            startDate: new Date('2022-03-01'),
            endDate: null,
            isOngoing: true,
            projectUrl: 'https://taskmanager.example.com',
            githubRepo: 'https://github.com/alexjohnson/taskmanager'
        }
    ],
    certifications: [
        {
            name: 'AWS Solutions Architect – Associate',
            issuingOrganization: 'Amazon Web Services',
            issueDate: new Date('2023-01-20'),
            expirationDate: new Date('2026-01-20'),
            doesNotExpire: false,
            credentialId: 'AWS-SAA-12345',
            credentialUrl: 'https://aws.amazon.com/verify/SAA-12345'
        }
    ],
    awards: [
        {
            title: 'Employee of the Year',
            issuer: 'TechCorp Inc.',
            date: new Date('2023-12-15'),
            description: 'Recognized for outstanding technical leadership and mentorship.'
        }
    ],
    skills: [
        { name: 'JavaScript', expertise: 'Expert' },
        { name: 'TypeScript', expertise: 'Advanced' },
        { name: 'React', expertise: 'Expert' },
        { name: 'Node.js', expertise: 'Expert' },
        { name: 'Python', expertise: 'Advanced' },
        { name: 'PostgreSQL', expertise: 'Advanced' },
        { name: 'Docker', expertise: 'Intermediate' },
        { name: 'AWS', expertise: 'Advanced' }
    ],
    languages: [
        { name: 'English', level: 'Native' },
        { name: 'Spanish', level: 'Conversational' }
    ],
    socialMedia: [
        { platform: 'LinkedIn', url: 'https://linkedin.com/in/alexjohnson' },
        { platform: 'GitHub', url: 'https://github.com/alexjohnson' }
    ]
};

module.exports = {
    compileTemplate,
    renderTemplate,
    extractPlaceholders,
    buildTemplateContext,
    SAMPLE_TEMPLATE_DATA,
    Handlebars
};