const AppSettings = require('../models/appSettings.model');
const logger = require('../utils/logger');

// ─── Mock Providers ──────────────────────────────────────────────────────────

/**
 * Mock: generate a job-post cover letter from user profile + JD.
 */
function mockJobPostCoverLetter(payload) {
    const { userProfile, jobDescription } = payload;
    const name = userProfile?.name || 'John Doe';
    const skills = (userProfile?.skills || []).slice(0, 5).map(s => s.name || s).join(', ');

    return {
        coverLetter:
`Dear Hiring Manager,

I am writing to express my strong interest in the position described in your job posting. With my background in ${skills || 'modern technologies'}, I am confident I would be a valuable addition to your team.

Throughout my career, I have developed expertise in building scalable, high-quality solutions. My experience aligns closely with the requirements outlined in your job description, and I am eager to bring my skills and dedication to your organization.

I am particularly drawn to this opportunity because it aligns with my passion for creating impactful work while collaborating with talented professionals. I am confident that my technical abilities and collaborative approach make me an excellent fit.

I would welcome the opportunity to discuss how my experience and skills can contribute to your team's success. Thank you for considering my application.

Best regards,
${name}`
    };
}

/**
 * Mock: estimate timeline & budget for an Upwork job.
 */
function mockUpworkEstimate(payload) {
    const jd = (payload.jobDescription || '').toLowerCase();
    let hours = 20;
    let rate = 40;

    if (/complex|large|enterprise|full[- ]?stack|architecture/i.test(jd)) {
        hours = 60;
        rate = 55;
    } else if (/simple|basic|small|landing|fix|bug/i.test(jd)) {
        hours = 8;
        rate = 35;
    } else if (/medium|moderate|feature|integration/i.test(jd)) {
        hours = 30;
        rate = 45;
    }

    const low = Math.round(hours * rate * 0.8);
    const high = Math.round(hours * rate * 1.3);

    return {
        timeline: `Estimated delivery: ${Math.ceil(hours / 8)} - ${Math.ceil(hours / 5)} business days (${hours} hours of work). This includes initial setup, development, testing, and revisions.`,
        budget: `Estimated budget: $${low} - $${high} USD (based on ~${hours} hours at $${rate}/hr). Final cost depends on scope refinements and revision rounds.`
    };
}

/**
 * Mock: write an Upwork proposal.
 */
function mockUpworkProposal(payload) {
    const { userProfile, jobDescription, clientName } = payload;
    const name = userProfile?.name || 'John Doe';
    const skills = (userProfile?.skills || []).slice(0, 5).map(s => s.name || s).join(', ');
    const greeting = clientName ? `Hi ${clientName},` : 'Hi,';

    return {
        proposal:
`${greeting}

I read your job posting carefully and I'm confident I can deliver exactly what you need.

With strong experience in ${skills || 'relevant technologies'}, I've handled similar projects successfully. I focus on writing clean, well-documented code and maintaining clear communication throughout the project.

Here's my approach:
- Review requirements in detail and clarify any questions upfront
- Break the work into milestones for transparency
- Deliver each milestone with testing and documentation
- Provide a reasonable revision period after delivery

I'm available to start immediately and can discuss the project scope in more detail at your earliest convenience.

Looking forward to hearing from you.

Best regards,
${name}`
    };
}

/**
 * Mock: estimate timeline & budget for a Fiverr order.
 */
function mockFiverrEstimate(payload) {
    const jd = (payload.jobDescription || '').toLowerCase();
    let days = 5;
    let price = 150;

    if (/complex|large|enterprise|full[- ]?stack|architecture/i.test(jd)) {
        days = 14;
        price = 500;
    } else if (/simple|basic|small|landing|fix|bug/i.test(jd)) {
        days = 2;
        price = 50;
    } else if (/medium|moderate|feature|integration/i.test(jd)) {
        days = 7;
        price = 250;
    }

    const lowPrice = Math.round(price * 0.8);
    const highPrice = Math.round(price * 1.4);

    return {
        timeline: `Estimated delivery: ${days} - ${days + 3} days. This includes requirements review, development, testing, and up to 2 revision rounds.`,
        budget: `Estimated price range: $${lowPrice} - $${highPrice} USD. This is broken into Basic ($${lowPrice}), Standard ($${price}), and Premium ($${highPrice}) tiers depending on scope and features.`
    };
}

/**
 * Mock: write a Fiverr buyer request / offer message.
 */
function mockFiverrProposal(payload) {
    const { userProfile, jobDescription, clientName } = payload;
    const name = userProfile?.name || 'John Doe';
    const skills = (userProfile?.skills || []).slice(0, 5).map(s => s.name || s).join(', ');
    const greeting = clientName ? `Hi ${clientName},` : 'Hi there,';

    return {
        proposal:
`${greeting}

Thank you for posting this request! I've reviewed your requirements and I'm excited to offer my services.

I specialize in ${skills || 'modern development'} and have completed numerous similar projects on Fiverr with great results.

What you'll get:
- High-quality, clean, and well-documented deliverables
- Responsive communication and regular progress updates
- Revisions until you're completely satisfied
- On-time delivery, guaranteed

I'd love to discuss your project further and tailor my approach to your exact needs. Feel free to reach out with any questions!

Best,
${name}`
    };
}

// ─── OpenAI Providers ────────────────────────────────────────────────────────

async function getOpenAIClient() {
    const OpenAI = require('openai');
    const dbKey = await AppSettings.get('openai_api_key');
    const apiKey = (dbKey && dbKey.trim()) || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key is not configured.');
    return new OpenAI({ apiKey });
}

async function callOpenAIText(systemPrompt, userPrompt) {
    const client = await getOpenAIClient();
    const model = await AppSettings.get('ai_model', 'gpt-4o-mini');

    const response = await client.chat.completions.create({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
}

async function openaiJobPostCoverLetter(payload) {
    const systemPrompt = `You are an expert career consultant and cover letter writer.
Write a compelling, professional cover letter for a job application.
Use the candidate's profile data to highlight relevant experience and skills.

Respond with JSON: { "coverLetter": "string — the full cover letter in plain text" }

Rules:
- Address the hiring manager professionally
- Tailor the letter to the specific job description
- Highlight the most relevant skills and experience from the candidate's profile
- Keep it concise (3-4 paragraphs)
- Use a professional but warm tone
- End with a call to action
${payload.permanentInstructions ? `- User's permanent instructions: ${payload.permanentInstructions}` : ''}
${payload.additionalInstructions ? `- Additional instructions for this letter: ${payload.additionalInstructions}` : ''}`;

    return callOpenAIText(systemPrompt, JSON.stringify(payload));
}

async function openaiUpworkEstimate(payload) {
    const systemPrompt = `You are an experienced freelancer on Upwork who estimates project timelines and budgets.
Analyze the job description and provide realistic timeline and budget estimates.

Respond with JSON: { "timeline": "string — estimated timeline in plain text", "budget": "string — estimated budget range in plain text" }

Rules:
- Be realistic and specific
- Consider project complexity, required skills, and typical market rates
- Provide ranges where appropriate
- Include what's covered in the estimate (setup, development, testing, revisions)
- Format as plain text suitable for a textarea
${payload.permanentInstructions ? `- User's permanent instructions: ${payload.permanentInstructions}` : ''}
${payload.additionalInstructions ? `- Additional instructions: ${payload.additionalInstructions}` : ''}`;

    return callOpenAIText(systemPrompt, JSON.stringify(payload));
}

async function openaiUpworkProposal(payload) {
    const systemPrompt = `You are an expert Upwork freelancer who writes winning proposals.
Write a compelling Upwork proposal/cover letter for the given job posting.
Use the candidate's profile to highlight relevant experience.

Respond with JSON: { "proposal": "string — the full proposal in plain text" }

Rules:
- Start with a personalized greeting${payload.clientName ? ` (address the client as "${payload.clientName}")` : ''}
- Show you've read and understood the job description
- Highlight relevant experience and skills concisely
- Include a brief approach/plan for the project
- Be professional but personable (Upwork style)
- Keep it focused and not too long (clients read many proposals)
- End with availability and willingness to discuss
${payload.permanentInstructions ? `- User's permanent instructions: ${payload.permanentInstructions}` : ''}
${payload.additionalInstructions ? `- Additional instructions: ${payload.additionalInstructions}` : ''}`;

    return callOpenAIText(systemPrompt, JSON.stringify(payload));
}

async function openaiIFiverrEstimate(payload) {
    const systemPrompt = `You are an experienced Fiverr seller who estimates project timelines and pricing.
Analyze the buyer's request and provide realistic timeline and pricing estimates using Fiverr's tier model.

Respond with JSON: { "timeline": "string — estimated timeline in plain text", "budget": "string — estimated pricing breakdown in plain text" }

Rules:
- Structure pricing around Fiverr's Basic/Standard/Premium tiers
- Be realistic with delivery times
- Consider project complexity and market rates on Fiverr
- Include what each tier covers
- Format as plain text suitable for a textarea
${payload.permanentInstructions ? `- User's permanent instructions: ${payload.permanentInstructions}` : ''}
${payload.additionalInstructions ? `- Additional instructions: ${payload.additionalInstructions}` : ''}`;

    return callOpenAIText(systemPrompt, JSON.stringify(payload));
}

async function openaiIFiverrProposal(payload) {
    const systemPrompt = `You are an expert Fiverr seller who writes winning buyer request responses and custom offers.
Write a compelling Fiverr proposal/message for the given buyer request.
Use the seller's profile to highlight relevant experience.

Respond with JSON: { "proposal": "string — the full proposal/message in plain text" }

Rules:
- Start with a friendly, professional greeting${payload.clientName ? ` (address the buyer as "${payload.clientName}")` : ''}
- Show you've understood the buyer's requirements
- Highlight relevant experience and portfolio items
- Be concise and value-focused (Fiverr buyers expect quick, clear pitches)
- Mention delivery timeline and what's included
- End with an invitation to discuss or place an order
${payload.permanentInstructions ? `- User's permanent instructions: ${payload.permanentInstructions}` : ''}
${payload.additionalInstructions ? `- Additional instructions: ${payload.additionalInstructions}` : ''}`;

    return callOpenAIText(systemPrompt, JSON.stringify(payload));
}

// ─── Provider Maps ───────────────────────────────────────────────────────────

const jobPostProviders = {
    mock: (p) => mockJobPostCoverLetter(p),
    openai: (p) => openaiJobPostCoverLetter(p)
};

const upworkEstimateProviders = {
    mock: (p) => mockUpworkEstimate(p),
    openai: (p) => openaiUpworkEstimate(p)
};

const upworkProposalProviders = {
    mock: (p) => mockUpworkProposal(p),
    openai: (p) => openaiUpworkProposal(p)
};

const fiverrEstimateProviders = {
    mock: (p) => mockFiverrEstimate(p),
    openai: (p) => openaiIFiverrEstimate(p)
};

const fiverrProposalProviders = {
    mock: (p) => mockFiverrProposal(p),
    openai: (p) => openaiIFiverrProposal(p)
};

// ─── Public API ──────────────────────────────────────────────────────────────

async function getProvider() {
    return AppSettings.get('ai_provider', process.env.AI_PROVIDER || 'mock');
}

function resolve(providerMap, providerKey, payload) {
    const fn = providerMap[providerKey];
    if (!fn) throw new Error(`AI provider "${providerKey}" is not supported for this operation.`);
    logger.info(`Cover letter AI → provider: ${providerKey}, action: ${Object.keys(providerMap).join('/')}`);
    return fn(payload);
}

async function generateJobPostCoverLetter(payload) {
    const provider = await getProvider();
    return resolve(jobPostProviders, provider, payload);
}

async function estimateUpwork(payload) {
    const provider = await getProvider();
    return resolve(upworkEstimateProviders, provider, payload);
}

async function writeUpworkProposal(payload) {
    const provider = await getProvider();
    return resolve(upworkProposalProviders, provider, payload);
}

async function estimateFiverr(payload) {
    const provider = await getProvider();
    return resolve(fiverrEstimateProviders, provider, payload);
}

async function writeFiverrProposal(payload) {
    const provider = await getProvider();
    return resolve(fiverrProposalProviders, provider, payload);
}

module.exports = {
    generateJobPostCoverLetter,
    estimateUpwork,
    writeUpworkProposal,
    estimateFiverr,
    writeFiverrProposal
};
