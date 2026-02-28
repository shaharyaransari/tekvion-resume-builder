const AppSettings = require('../models/appSettings.model');
const logger = require('../utils/logger');

/**
 * AI Service — Provider-agnostic wrapper.
 *
 * Currently supports: OpenAI, mock (placeholder)
 * To add a new provider:
 *   1. Create a function like `callOpenAI` below
 *   2. Register it in the `providers` map
 *   3. Set `ai_provider` in AppSettings (or .env) to the new key
 *
 * NOTE: The default provider is set to "mock" to avoid real API costs
 *       during development. Switch `ai_provider` to "openai" when ready.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function randomSubset(arr, min = 1, max) {
    if (!arr || arr.length === 0) return [];
    const upper = max ? Math.min(max, arr.length) : arr.length;
    const count = Math.max(min, Math.floor(Math.random() * upper) + 1);
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * Simple keyword matching — scores each item by how many job description
 * words appear in its name (case-insensitive). Returns items sorted by
 * relevance, with a fallback random pick if nothing matches.
 */
function pickByRelevance(items, jobDescription, min = 3, max = 8) {
    if (!items || items.length === 0) return [];

    const jobWords = jobDescription
        .toLowerCase()
        .replace(/[^a-z0-9\s.#+]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);

    // Score each item
    const scored = items.map(item => {
        const nameLower = (typeof item === 'string' ? item : item.name || '').toLowerCase();
        const score = jobWords.reduce((s, word) => s + (nameLower.includes(word) ? 1 : 0), 0);
        return { item, score };
    });

    // Separate matched and unmatched
    const matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.item);
    const unmatched = scored.filter(s => s.score === 0).map(s => s.item);

    // Take all matches + fill up to min/max with random unmatched
    const count = Math.max(min, Math.min(max, matched.length + 2));
    const result = [...matched];

    if (result.length < count) {
        const filler = randomSubset(unmatched, 1, count - result.length);
        result.push(...filler);
    }

    return result.slice(0, max);
}

// ─── Provider Implementations ────────────────────────────────────────────────

/**
 * Mock provider — returns placeholder data derived from the user's own profile.
 * Uses keyword matching against the job description for realistic selection.
 * No API key required. Useful for development & testing.
 */
async function callMock(prompt, _systemPrompt, _model) {
    logger.info('AI mock provider: generating placeholder response from user profile data');

    // Parse the aiInputPayload that was stringified as the prompt
    let payload;
    try {
        payload = JSON.parse(prompt);
    } catch {
        return JSON.stringify({
            title: 'My Resume',
            summary: 'Experienced professional seeking new opportunities.',
            educations: [],
            experiences: [],
            projects: [],
            certifications: [],
            awards: [],
            selectedSkills: [],
            selectedLanguages: [],
            selectedSocialMedia: [],
            customFields: []
        });
    }

    const profile = payload.userProfile || {};
    const jobDescription = (payload.jobDescription || '').toLowerCase();

    // Pick relevant subsets of each entity (using title/jobTitle for matching)
    const educations = payload.educations || [];
    const experiences = payload.experiences || [];
    const projects = payload.projects || [];
    const certifications = payload.certifications || [];
    const awards = payload.awards || [];

    const selectedEducations = educations.length > 0 ? pickByRelevance(
        educations.map(e => ({ ...e, name: `${e.degree} ${e.fieldOfStudy || ''}` })),
        jobDescription, 1, Math.min(3, educations.length)
    ) : [];

    const selectedExperiences = experiences.length > 0 ? pickByRelevance(
        experiences.map(e => ({ ...e, name: `${e.jobTitle} ${e.company || ''} ${(e.technologiesUsed || []).join(' ')}` })),
        jobDescription, 1, Math.min(3, experiences.length)
    ) : [];

    const selectedProjects = projects.length > 0 ? pickByRelevance(
        projects.map(p => ({ ...p, name: `${p.title} ${(p.technologies || []).join(' ')}` })),
        jobDescription, 1, Math.min(3, projects.length)
    ) : [];

    const selectedCertifications = certifications.length > 0 ? pickByRelevance(
        certifications.map(c => ({ ...c, name: c.name })),
        jobDescription, 1, Math.min(3, certifications.length)
    ) : [];

    const selectedAwards = awards.length > 0 ? randomSubset(awards, 1, Math.min(2, awards.length)) : [];

    // Pick skills: only from user's own profile skills
    const existingSkills = (profile.skills || []).map(s => s.name);
    const selectedSkills = existingSkills.length > 0
        ? pickByRelevance(existingSkills, payload.jobDescription || '', 3, Math.min(10, existingSkills.length))
        : [];

    // Pick languages: only from user's own profile languages
    const existingLangs = (profile.languages || []).map(l => l.name);
    const selectedLanguages = existingLangs.length > 0
        ? existingLangs.slice(0, 5)
        : [];

    // Pick social media — include all that the user has
    const selectedSocialMedia = (profile.socialMedia || []).map(sm => sm.platform);

    // Build a summary that references the job description
    const name = profile.name || 'the candidate';
    const summary = profile.intro
        ? profile.intro
        : `${name} is a results-driven professional with expertise in modern web technologies. With a strong foundation in full-stack development, ${name.split(' ')[0]} is well-suited for roles requiring hands-on experience with scalable applications, clean code practices, and collaborative team environments.`;

    // Determine a title from job description or experience
    const firstExperience = selectedExperiences[0];
    let title;
    if (payload.jobDescription && payload.jobDescription.length > 10) {
        // Extract a role-like phrase from the job description
        const jd = payload.jobDescription;
        const roleMatch = jd.match(/(?:looking for|hiring|seeking)?\s*(?:a|an)?\s*((?:senior|junior|lead|principal|staff)?\s*[\w\s./#+-]{3,40}(?:developer|engineer|designer|manager|analyst|architect|consultant))/i);
        title = roleMatch ? `${roleMatch[1].trim()} Resume` : (firstExperience ? `${firstExperience.jobTitle} Resume` : 'Professional Resume');
    } else {
        title = firstExperience ? `${firstExperience.jobTitle} Resume` : 'Professional Resume';
    }

    const result = {
        title,
        summary,
        educations: selectedEducations.map(e => e._id),
        experiences: selectedExperiences.map(e => e._id),
        projects: selectedProjects.map(p => p._id),
        certifications: selectedCertifications.map(c => c._id),
        awards: selectedAwards.map(a => a._id),
        selectedSkills,
        selectedLanguages,
        selectedSocialMedia,
        customFields: []
    };

    return JSON.stringify(result);
}

async function callOpenAI(prompt, systemPrompt, model) {
    // Dynamic import so the app doesn't crash if openai isn't installed for other providers
    const OpenAI = require('openai');
    // DB key takes precedence; fall back to .env
    const dbKey = await AppSettings.get('openai_api_key');
    const apiKey = (dbKey && dbKey.trim()) || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key is not configured. Set it in Admin Settings or OPENAI_API_KEY environment variable.');
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
    });

    return response.choices[0].message.content;
}

// Register providers here — add more as needed
const providers = {
    mock: callMock,
    openai: callOpenAI
    // anthropic: callAnthropic,
    // gemini: callGemini,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a prompt to the configured AI provider.
 * Returns parsed JSON from the AI response.
 */
async function generateAIResponse(prompt, systemPrompt) {
    const providerKey = await AppSettings.get('ai_provider', process.env.AI_PROVIDER || 'openai');
    const model = await AppSettings.get('ai_model', process.env.AI_MODEL || 'gpt-4o-mini');

    const providerFn = providers[providerKey];
    if (!providerFn) {
        throw new Error(`AI provider "${providerKey}" is not registered. Available: ${Object.keys(providers).join(', ')}`);
    }

    logger.info(`AI request → provider: ${providerKey}, model: ${model}`);

    const raw = await providerFn(prompt, systemPrompt, model);

    try {
        return JSON.parse(raw);
    } catch {
        logger.warn('AI response was not valid JSON, returning raw text');
        return { raw };
    }
}

/**
 * Generate a tailored resume from user data + job description.
 * Returns an object matching the Resume schema fields.
 */
async function generateResumeFromProfile(aiInputPayload) {
    const systemPrompt = `You are an expert resume writer and career consultant. 
Your job is to analyze a candidate's profile data and a target job description, then produce an optimized resume.

You MUST respond with a valid JSON object with these exact keys:
{
  "title": "string — a title for this resume (e.g. 'Senior Frontend Developer Resume')",
  "summary": "string — a professional summary (3-5 sentences) tailored to the job description",
  "educations": ["array of education _id strings that are most relevant"],
  "experiences": ["array of experience _id strings that are most relevant"],
  "projects": ["array of project _id strings that are most relevant"],
  "certifications": ["array of certification _id strings that are most relevant"],
  "awards": ["array of award _id strings that are most relevant"],
  "selectedSkills": ["array of skill name strings — pick ONLY from the candidate's existing skills list"],
  "selectedLanguages": ["array of language name strings — pick ONLY from the candidate's existing languages list"],
  "selectedSocialMedia": ["array of platform name strings to include"],
  "customFields": [{"label": "string", "value": "string"}]
}

Rules:
- Only include entity IDs that exist in the provided data.
- For selectedSkills, choose ONLY from the candidate's own skills. Do NOT invent or add skills that are not in the candidate's profile.
- For selectedLanguages, choose ONLY from the candidate's own languages. Do NOT invent or add languages that are not in the candidate's profile.
- Prioritize relevance to the job description.
- The summary should be compelling, professional, and tailored to the target role.
- Keep customFields empty unless there's something notable to add.`;

    const prompt = JSON.stringify(aiInputPayload);

    return generateAIResponse(prompt, systemPrompt);
}

/**
 * Generate a resume title from user data + job description.
 * Accepts optional custom instructions from the user.
 */
async function generateResumeTitle(payload) {
    const systemPrompt = `You are an expert resume writer. Generate a concise, professional resume title.

You MUST respond with a valid JSON object:
{ "title": "string — a professional resume title (e.g. 'Senior Full Stack Developer Resume')" }

Rules:
- The title should be relevant to the job description.
- Keep it concise (3-8 words).
- Make it specific to the candidate's strongest role match.
${payload.customInstructions ? `- Additional user instructions: ${payload.customInstructions}` : ''}`;

    const prompt = JSON.stringify({
        jobDescription: payload.jobDescription,
        userName: payload.userName,
        currentTitle: payload.currentTitle,
        experiences: payload.experiences,
        educations: payload.educations,
        skills: payload.skills
    });

    return generateAIResponse(prompt, systemPrompt);
}

/**
 * Generate a professional summary from user data + job description.
 * Accepts optional custom instructions from the user.
 */
async function generateResumeSummary(payload) {
    const systemPrompt = `You are an expert resume writer. Generate a compelling professional summary.

You MUST respond with a valid JSON object:
{ "summary": "string — a professional summary (3-5 sentences) tailored to the job description" }

Rules:
- The summary should be compelling, professional, and tailored to the target role.
- Highlight the candidate's most relevant experience, skills, and achievements.
- Keep it between 3-5 sentences.
- Write in third person or first person based on common resume conventions.
${payload.customInstructions ? `- Additional user instructions: ${payload.customInstructions}` : ''}`;

    const prompt = JSON.stringify({
        jobDescription: payload.jobDescription,
        userName: payload.userName,
        currentSummary: payload.currentSummary,
        experiences: payload.experiences,
        educations: payload.educations,
        projects: payload.projects,
        certifications: payload.certifications,
        skills: payload.skills
    });

    return generateAIResponse(prompt, systemPrompt);
}

/**
 * Extract structured profile data from CV/resume text.
 * Returns an object with intro, skills, languages, educations, experiences, projects, certifications, awards.
 */
async function extractProfileFromCV(cvText) {
    const systemPrompt = `You are an expert CV/resume parser. Extract structured data from the provided CV text.

You MUST respond with a valid JSON object with these exact keys:
{
  "intro": "string — a professional bio/summary extracted or composed from the CV (2-4 sentences)",
  "skills": [{"name": "string", "expertise": "Beginner|Intermediate|Advanced|Expert"}],
  "languages": [{"name": "string", "level": "Basic|Conversational|Fluent|Native"}],
  "educations": [{"institution": "string (required)", "degree": "string (required)", "fieldOfStudy": "string or empty", "startDate": "ISO date string or null", "endDate": "ISO date string or null", "isOngoing": false, "grade": "string or empty", "description": "string or empty"}],
  "experiences": [{"jobTitle": "string (required)", "company": "string (required)", "location": "string or empty", "employmentType": "Full-time|Part-time|Contract|Internship|Freelance|Temporary|Self-employed or empty", "industry": "string or empty", "startDate": "ISO date string or null", "endDate": "ISO date string or null", "isCurrent": false, "description": "string or empty", "achievements": ["string"], "technologiesUsed": ["string"]}],
  "projects": [{"title": "string (required)", "role": "string or empty", "description": "string or empty", "technologies": ["string"], "highlights": ["string"], "startDate": "ISO date string or null", "endDate": "ISO date string or null", "isOngoing": false, "projectUrl": "string or empty", "githubRepo": "string or empty"}],
  "certifications": [{"name": "string (required)", "issuingOrganization": "string or empty", "issueDate": "ISO date string or null", "expirationDate": "ISO date string or null", "doesNotExpire": true, "credentialId": "string or empty", "credentialUrl": "string or empty"}],
  "awards": [{"title": "string (required)", "issuer": "string or empty", "date": "ISO date string or null", "description": "string or empty"}]
}

Rules:
- Extract as much data as possible from the CV text.
- If a field is not found, use empty string for strings, null for dates, empty array for arrays.
- For dates, try to parse them into ISO format (YYYY-MM-DD). If only a year is given, use January 1st of that year.
- For skills expertise, estimate based on context (years of experience, role level, etc.).
- For language levels, estimate based on context.
- Do NOT invent data that is not present in the CV text.
- Return empty arrays if a section has no data.`;

    return generateAIResponse(cvText, systemPrompt);
}

/**
 * Mock version of CV extraction — generates realistic sample data from the CV text.
 * Used when the AI provider is set to "mock".
 */
function extractProfileFromCVMock(cvText) {
    const text = cvText.toLowerCase();

    // Try to extract a name for the intro
    const lines = cvText.trim().split('\n').filter(l => l.trim());
    const possibleName = lines[0]?.trim() || 'the candidate';

    const intro = `${possibleName} is a dedicated professional with a strong background in their field. Experienced in delivering high-quality results and collaborating effectively with cross-functional teams.`;

    // Extract skills by looking for common tech keywords
    const skillKeywords = ['javascript', 'typescript', 'react', 'node', 'python', 'java', 'sql', 'html', 'css', 'git', 'docker', 'aws', 'mongodb', 'express', 'angular', 'vue', 'c++', 'c#', '.net', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'flutter', 'redis', 'postgresql', 'mysql', 'graphql', 'rest', 'api', 'agile', 'scrum', 'jira', 'figma', 'photoshop', 'linux', 'azure', 'gcp', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'next.js', 'tailwind'];
    const foundSkills = skillKeywords
        .filter(skill => text.includes(skill))
        .map(skill => ({
            name: skill.charAt(0).toUpperCase() + skill.slice(1),
            expertise: text.includes('senior') || text.includes('lead') || text.includes('expert') ? 'Advanced' : 'Intermediate'
        }));

    // Extract languages
    const langKeywords = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'korean', 'arabic', 'hindi', 'urdu', 'portuguese', 'italian', 'russian', 'dutch', 'turkish'];
    const foundLanguages = langKeywords
        .filter(lang => text.includes(lang))
        .map(lang => ({
            name: lang.charAt(0).toUpperCase() + lang.slice(1),
            level: text.includes('native') || text.includes('mother tongue') ? 'Native' : 'Fluent'
        }));

    if (foundLanguages.length === 0) {
        foundLanguages.push({ name: 'English', level: 'Fluent' });
    }

    // Try to extract education
    const educations = [];
    const degreePatterns = [
        /(?:bachelor|b\.?s\.?|b\.?a\.?|b\.?sc\.?|b\.?e\.?|b\.?tech)\s*(?:of|in|\.?\s)?\s*([\w\s]+?)(?:\n|,|\||from|at)/gi,
        /(?:master|m\.?s\.?|m\.?a\.?|m\.?sc\.?|m\.?e\.?|m\.?tech|mba)\s*(?:of|in|\.?\s)?\s*([\w\s]+?)(?:\n|,|\||from|at)/gi,
        /(?:ph\.?d\.?|doctorate)\s*(?:of|in|\.?\s)?\s*([\w\s]+?)(?:\n|,|\||from|at)/gi,
    ];
    const degreeNames = ['Bachelor', 'Master', 'PhD'];
    degreePatterns.forEach((pattern, idx) => {
        const match = pattern.exec(cvText);
        if (match) {
            educations.push({
                institution: 'University',
                degree: degreeNames[idx] + "'s Degree",
                fieldOfStudy: match[1]?.trim().substring(0, 50) || '',
                startDate: null,
                endDate: null,
                isOngoing: false,
                grade: '',
                description: ''
            });
        }
    });

    // Try to extract experiences from job title patterns
    const experiences = [];
    const jobPatterns = /(?:^|\n)\s*([\w\s]+(?:developer|engineer|designer|manager|analyst|architect|consultant|director|lead|specialist|coordinator))\s*(?:at|@|-|–|—|\|)\s*([\w\s&.]+)/gi;
    let jobMatch;
    while ((jobMatch = jobPatterns.exec(cvText)) !== null && experiences.length < 5) {
        experiences.push({
            jobTitle: jobMatch[1].trim().substring(0, 100),
            company: jobMatch[2].trim().substring(0, 100),
            location: '',
            employmentType: 'Full-time',
            industry: '',
            startDate: null,
            endDate: null,
            isCurrent: experiences.length === 0,
            description: '',
            achievements: [],
            technologiesUsed: []
        });
    }

    return {
        intro,
        skills: foundSkills.slice(0, 15),
        languages: foundLanguages.slice(0, 5),
        educations,
        experiences,
        projects: [],
        certifications: [],
        awards: []
    };
}

module.exports = {
    generateAIResponse,
    generateResumeFromProfile,
    generateResumeTitle,
    generateResumeSummary,
    extractProfileFromCV,
    extractProfileFromCVMock
};
