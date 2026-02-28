const mongoose = require('mongoose');

const masterDataSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['skill', 'language', 'industry'],
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Compound unique index — no duplicate names within the same type
masterDataSchema.index({ type: 1, name: 1 }, { unique: true });

// Text index for search
masterDataSchema.index({ name: 'text', category: 'text' });

const MasterData = mongoose.model('MasterData', masterDataSchema);

/**
 * Seed some common defaults on first run.
 * Only inserts if the collection is completely empty.
 */
MasterData.seedDefaults = async function () {
    const count = await MasterData.countDocuments();
    if (count > 0) return;

    const defaultSkills = [
        // Programming Languages
        { type: 'skill', name: 'JavaScript', category: 'Programming' },
        { type: 'skill', name: 'TypeScript', category: 'Programming' },
        { type: 'skill', name: 'Python', category: 'Programming' },
        { type: 'skill', name: 'Java', category: 'Programming' },
        { type: 'skill', name: 'C#', category: 'Programming' },
        { type: 'skill', name: 'C++', category: 'Programming' },
        { type: 'skill', name: 'Go', category: 'Programming' },
        { type: 'skill', name: 'Rust', category: 'Programming' },
        { type: 'skill', name: 'PHP', category: 'Programming' },
        { type: 'skill', name: 'Ruby', category: 'Programming' },
        { type: 'skill', name: 'Swift', category: 'Programming' },
        { type: 'skill', name: 'Kotlin', category: 'Programming' },

        // Frontend
        { type: 'skill', name: 'React', category: 'Frontend' },
        { type: 'skill', name: 'Angular', category: 'Frontend' },
        { type: 'skill', name: 'Vue.js', category: 'Frontend' },
        { type: 'skill', name: 'Next.js', category: 'Frontend' },
        { type: 'skill', name: 'HTML', category: 'Frontend' },
        { type: 'skill', name: 'CSS', category: 'Frontend' },
        { type: 'skill', name: 'Tailwind CSS', category: 'Frontend' },
        { type: 'skill', name: 'Bootstrap', category: 'Frontend' },
        { type: 'skill', name: 'SASS/SCSS', category: 'Frontend' },

        // Backend
        { type: 'skill', name: 'Node.js', category: 'Backend' },
        { type: 'skill', name: 'Express.js', category: 'Backend' },
        { type: 'skill', name: 'Django', category: 'Backend' },
        { type: 'skill', name: 'Flask', category: 'Backend' },
        { type: 'skill', name: 'Spring Boot', category: 'Backend' },
        { type: 'skill', name: 'ASP.NET', category: 'Backend' },
        { type: 'skill', name: 'FastAPI', category: 'Backend' },
        { type: 'skill', name: 'NestJS', category: 'Backend' },

        // Database
        { type: 'skill', name: 'MongoDB', category: 'Database' },
        { type: 'skill', name: 'PostgreSQL', category: 'Database' },
        { type: 'skill', name: 'MySQL', category: 'Database' },
        { type: 'skill', name: 'Redis', category: 'Database' },
        { type: 'skill', name: 'Firebase', category: 'Database' },
        { type: 'skill', name: 'SQL Server', category: 'Database' },

        // DevOps & Cloud
        { type: 'skill', name: 'Docker', category: 'DevOps' },
        { type: 'skill', name: 'Kubernetes', category: 'DevOps' },
        { type: 'skill', name: 'AWS', category: 'Cloud' },
        { type: 'skill', name: 'Azure', category: 'Cloud' },
        { type: 'skill', name: 'GCP', category: 'Cloud' },
        { type: 'skill', name: 'CI/CD', category: 'DevOps' },
        { type: 'skill', name: 'Git', category: 'DevOps' },
        { type: 'skill', name: 'Linux', category: 'DevOps' },

        // Soft Skills
        { type: 'skill', name: 'Leadership', category: 'Soft Skills' },
        { type: 'skill', name: 'Communication', category: 'Soft Skills' },
        { type: 'skill', name: 'Problem Solving', category: 'Soft Skills' },
        { type: 'skill', name: 'Teamwork', category: 'Soft Skills' },
        { type: 'skill', name: 'Project Management', category: 'Soft Skills' },
        { type: 'skill', name: 'Agile/Scrum', category: 'Soft Skills' },

        // Design
        { type: 'skill', name: 'Figma', category: 'Design' },
        { type: 'skill', name: 'Adobe Photoshop', category: 'Design' },
        { type: 'skill', name: 'Adobe Illustrator', category: 'Design' },
        { type: 'skill', name: 'UI/UX Design', category: 'Design' },
    ];

    const defaultLanguages = [
        { type: 'language', name: 'English' },
        { type: 'language', name: 'Spanish' },
        { type: 'language', name: 'French' },
        { type: 'language', name: 'German' },
        { type: 'language', name: 'Chinese (Mandarin)' },
        { type: 'language', name: 'Japanese' },
        { type: 'language', name: 'Korean' },
        { type: 'language', name: 'Arabic' },
        { type: 'language', name: 'Hindi' },
        { type: 'language', name: 'Urdu' },
        { type: 'language', name: 'Portuguese' },
        { type: 'language', name: 'Russian' },
        { type: 'language', name: 'Italian' },
        { type: 'language', name: 'Dutch' },
        { type: 'language', name: 'Turkish' },
        { type: 'language', name: 'Polish' },
        { type: 'language', name: 'Swedish' },
        { type: 'language', name: 'Thai' },
        { type: 'language', name: 'Vietnamese' },
        { type: 'language', name: 'Indonesian' },
        { type: 'language', name: 'Malay' },
        { type: 'language', name: 'Bengali' },
        { type: 'language', name: 'Punjabi' },
        { type: 'language', name: 'Tamil' },
        { type: 'language', name: 'Persian (Farsi)' },
    ];

    const defaultIndustries = [
        { type: 'industry', name: 'Technology', category: 'Technology' },
        { type: 'industry', name: 'Software Development', category: 'Technology' },
        { type: 'industry', name: 'Information Technology', category: 'Technology' },
        { type: 'industry', name: 'Cybersecurity', category: 'Technology' },
        { type: 'industry', name: 'Artificial Intelligence', category: 'Technology' },
        { type: 'industry', name: 'Data Science', category: 'Technology' },
        { type: 'industry', name: 'Cloud Computing', category: 'Technology' },
        { type: 'industry', name: 'Telecommunications', category: 'Technology' },
        { type: 'industry', name: 'Finance', category: 'Business' },
        { type: 'industry', name: 'Banking', category: 'Business' },
        { type: 'industry', name: 'Insurance', category: 'Business' },
        { type: 'industry', name: 'Accounting', category: 'Business' },
        { type: 'industry', name: 'Consulting', category: 'Business' },
        { type: 'industry', name: 'Real Estate', category: 'Business' },
        { type: 'industry', name: 'Healthcare', category: 'Health & Science' },
        { type: 'industry', name: 'Pharmaceuticals', category: 'Health & Science' },
        { type: 'industry', name: 'Biotechnology', category: 'Health & Science' },
        { type: 'industry', name: 'Medical Devices', category: 'Health & Science' },
        { type: 'industry', name: 'Education', category: 'Public Sector' },
        { type: 'industry', name: 'Government', category: 'Public Sector' },
        { type: 'industry', name: 'Non-Profit', category: 'Public Sector' },
        { type: 'industry', name: 'Manufacturing', category: 'Industrial' },
        { type: 'industry', name: 'Automotive', category: 'Industrial' },
        { type: 'industry', name: 'Aerospace', category: 'Industrial' },
        { type: 'industry', name: 'Construction', category: 'Industrial' },
        { type: 'industry', name: 'Energy', category: 'Industrial' },
        { type: 'industry', name: 'Oil & Gas', category: 'Industrial' },
        { type: 'industry', name: 'Retail', category: 'Consumer' },
        { type: 'industry', name: 'E-Commerce', category: 'Consumer' },
        { type: 'industry', name: 'Hospitality', category: 'Consumer' },
        { type: 'industry', name: 'Food & Beverage', category: 'Consumer' },
        { type: 'industry', name: 'Entertainment', category: 'Media' },
        { type: 'industry', name: 'Media', category: 'Media' },
        { type: 'industry', name: 'Advertising', category: 'Media' },
        { type: 'industry', name: 'Marketing', category: 'Media' },
        { type: 'industry', name: 'Transportation', category: 'Logistics' },
        { type: 'industry', name: 'Logistics', category: 'Logistics' },
        { type: 'industry', name: 'Supply Chain', category: 'Logistics' },
        { type: 'industry', name: 'Legal', category: 'Professional Services' },
        { type: 'industry', name: 'Human Resources', category: 'Professional Services' },
        { type: 'industry', name: 'Agriculture', category: 'Other' },
        { type: 'industry', name: 'Mining', category: 'Other' },
        { type: 'industry', name: 'Sports', category: 'Other' },
        { type: 'industry', name: 'Fashion', category: 'Other' },
    ];

    await MasterData.insertMany([...defaultSkills, ...defaultLanguages, ...defaultIndustries]);
};

module.exports = MasterData;
