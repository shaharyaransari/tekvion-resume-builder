const AppSettings = require('../models/appSettings.model');
const logger = require('../utils/logger');

/**
 * Salary Estimation Service
 *
 * Uses AI (or mock) to estimate:
 * 1. Market salary range for a job description in the user's country
 * 2. Hiring chance percentage based on user profile vs job requirements
 *
 * Subscriber-only feature.
 */

/**
 * Mock salary estimation — keyword-based heuristics.
 */
function mockEstimate(payload) {
    const { jobDescription, country, userProfile } = payload;
    const jd = (jobDescription || '').toLowerCase();

    // Base salary range by seniority keywords
    let baseLow = 40000;
    let baseHigh = 70000;

    if (/senior|lead|principal|staff/i.test(jd)) {
        baseLow = 90000;
        baseHigh = 150000;
    } else if (/mid[- ]?level|intermediate|3\+?\s*years?/i.test(jd)) {
        baseLow = 60000;
        baseHigh = 100000;
    } else if (/junior|entry[- ]?level|intern|fresh/i.test(jd)) {
        baseLow = 30000;
        baseHigh = 55000;
    }

    // Country-based multiplier (rough)
    const countryMultipliers = {
        'us': 1.0, 'usa': 1.0, 'united states': 1.0,
        'uk': 0.85, 'united kingdom': 0.85,
        'canada': 0.80,
        'germany': 0.80, 'france': 0.75, 'netherlands': 0.80,
        'australia': 0.90,
        'india': 0.25, 'pakistan': 0.15,
        'uae': 0.60, 'dubai': 0.60,
        'singapore': 0.70,
        'remote': 0.80
    };

    const countryLower = (country || 'us').toLowerCase();
    const multiplier = countryMultipliers[countryLower] || 0.50;

    const salaryLow = Math.round(baseLow * multiplier / 1000) * 1000;
    const salaryHigh = Math.round(baseHigh * multiplier / 1000) * 1000;

    // Currency mapping
    const currencyMap = {
        'us': 'USD', 'usa': 'USD', 'united states': 'USD',
        'uk': 'GBP', 'united kingdom': 'GBP',
        'canada': 'CAD',
        'germany': 'EUR', 'france': 'EUR', 'netherlands': 'EUR',
        'australia': 'AUD',
        'india': 'INR', 'pakistan': 'PKR',
        'uae': 'AED', 'dubai': 'AED',
        'singapore': 'SGD'
    };
    const currency = currencyMap[countryLower] || 'USD';

    // Hiring chance — calculate based on profile completeness
    const profile = userProfile || {};
    let hiringScore = 30; // base

    const skills = profile.skills || [];
    const experiences = payload.experiences || [];
    const educations = payload.educations || [];
    const projects = payload.projects || [];
    const certifications = payload.certifications || [];

    // Skill match
    const jdWords = jd.split(/\s+/).filter(w => w.length > 2);
    const skillNames = skills.map(s => (s.name || s).toLowerCase());
    const matchedSkills = skillNames.filter(s => jdWords.some(w => s.includes(w) || w.includes(s)));
    hiringScore += Math.min(matchedSkills.length * 5, 25);

    // Experience bonus
    if (experiences.length >= 3) hiringScore += 15;
    else if (experiences.length >= 1) hiringScore += 8;

    // Education bonus
    if (educations.length >= 1) hiringScore += 5;

    // Projects bonus
    if (projects.length >= 2) hiringScore += 10;
    else if (projects.length >= 1) hiringScore += 5;

    // Certifications bonus
    if (certifications.length >= 1) hiringScore += 5;

    // Profile completeness bonus
    if (profile.intro && profile.intro.length > 50) hiringScore += 5;

    hiringScore = Math.min(hiringScore, 95);

    return {
        salaryEstimate: {
            low: salaryLow,
            high: salaryHigh,
            currency,
            period: 'yearly',
            country: country || 'United States'
        },
        hiringChance: {
            percentage: hiringScore,
            level: hiringScore >= 70 ? 'High' : hiringScore >= 45 ? 'Medium' : 'Low',
            factors: {
                skillMatch: matchedSkills.length,
                totalSkills: skillNames.length,
                experienceCount: experiences.length,
                educationCount: educations.length,
                projectCount: projects.length,
                certificationCount: certifications.length,
                profileComplete: !!(profile.intro && profile.intro.length > 50)
            }
        },
        suggestions: generateSuggestions(matchedSkills.length, skillNames.length, experiences.length, projects.length)
    };
}

function generateSuggestions(matchedSkills, totalSkills, experienceCount, projectCount) {
    const suggestions = [];

    if (matchedSkills < 3) {
        suggestions.push('Add more skills that match the job description to increase your hiring chance.');
    }
    if (totalSkills < 5) {
        suggestions.push('Consider adding more skills to your profile.');
    }
    if (experienceCount < 2) {
        suggestions.push('Adding more work experience details will strengthen your application.');
    }
    if (projectCount < 2) {
        suggestions.push('Showcase more projects to demonstrate your hands-on experience.');
    }

    if (suggestions.length === 0) {
        suggestions.push('Your profile looks strong! Make sure your resume summary is tailored to this specific role.');
    }

    return suggestions;
}

/**
 * OpenAI-based salary estimation.
 */
async function openaiEstimate(payload) {
    const OpenAI = require('openai');
    // DB key takes precedence; fall back to .env
    const dbKey = await AppSettings.get('openai_api_key');
    const apiKey = (dbKey && dbKey.trim()) || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key is not configured. Set it in Admin Settings or OPENAI_API_KEY environment variable.');
    const client = new OpenAI({ apiKey });
    const model = await AppSettings.get('ai_model', 'gpt-4o-mini');

    const response = await client.chat.completions.create({
        model,
        messages: [
            {
                role: 'system',
                content: `You are a career consultant and salary estimation expert.
Given a job description, a user profile, and their country, provide:
1. A market salary range (low/high) in the local currency for that country
2. A hiring chance percentage (0-100) based on how well the candidate's profile matches

Respond with JSON:
{
  "salaryEstimate": {
    "low": number,
    "high": number,
    "currency": "string (ISO 4217)",
    "period": "yearly",
    "country": "string"
  },
  "hiringChance": {
    "percentage": number (0-100),
    "level": "High|Medium|Low",
    "factors": {
      "skillMatch": number,
      "totalSkills": number,
      "experienceCount": number,
      "educationCount": number,
      "projectCount": number,
      "certificationCount": number,
      "profileComplete": boolean
    }
  },
  "suggestions": ["string array of improvement tips"]
}`
            },
            {
                role: 'user',
                content: JSON.stringify(payload)
            }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
}

const estimateProviders = {
    mock: mockEstimate,
    openai: openaiEstimate
};

/**
 * Estimate salary and hiring chance for a job description + user profile.
 * @param {Object} payload - { jobDescription, country, userProfile, experiences, educations, projects, certifications }
 * @returns {Object} - { salaryEstimate, hiringChance, suggestions }
 */
async function estimateSalary(payload) {
    const providerKey = await AppSettings.get('ai_provider', process.env.AI_PROVIDER || 'mock');
    const providerFn = estimateProviders[providerKey];

    if (!providerFn) {
        throw new Error(`AI provider "${providerKey}" is not registered for salary estimation.`);
    }

    logger.info(`Salary estimation → provider: ${providerKey}, country: ${payload.country || 'not specified'}`);

    const result = providerKey === 'mock'
        ? providerFn(payload)
        : await providerFn(payload);

    return result;
}

module.exports = {
    estimateSalary
};
