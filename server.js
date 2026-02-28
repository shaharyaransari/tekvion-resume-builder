require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require("path");
// const logger = require('./utils/logger'); // Add this import

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');

const app = express();

// Routers
const authRouter = require('./routes/auth.routes');
const userRouter = require('./routes/user.routes');
const projectRouter = require('./routes/project.routes');
const experienceRouter = require('./routes/experience.routes');
const certificationRouter = require('./routes/certification.routes');
const educationRouter = require('./routes/education.routes');
const awardRouter = require('./routes/award.routes');
const resumeRouter = require('./routes/resume.routes');
const initialTemplateRouter = require('./routes/initialTemplate.routes');
const userGeneratedTemplateRouter = require('./routes/userGeneratedTemplate.routes');
const creditsRouter = require('./routes/credits.routes');
const settingsRouter = require('./routes/appSettings.routes');
const masterDataRouter = require('./routes/masterData.routes');
const paymentRouter = require('./routes/payment.routes');
const analyticsRouter = require('./routes/analytics.routes');
const salaryRouter = require('./routes/salary.routes');
const coverLetterRouter = require('./routes/coverLetter.routes');

// Middlewares
const errorHandler = require('./middlewares/error.middleware');
const {
  generalLimiter,
} = require('./middlewares/rateLimit.middleware');
const debugMiddleware = require('./middlewares/debug.middleware');

// Models
const Resume = require('./models/resume.model');
const User = require('./models/user.model');
const UserGeneratedTemplate = require('./models/userGeneratedTemplate.model');
const AppSettings = require('./models/appSettings.model');
const MasterData = require('./models/masterData.model');
const Subscription = require('./models/subscription.model');
const ResumeAnalytics = require('./models/resumeAnalytics.model');

// ========== Global Middlewares ==========

// Stripe webhook needs raw body — must be before express.json()
const { handleWebhook } = require('./controllers/payment.controller');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(cors()); // Allow all origins for now
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', generalLimiter); // Rate Limiter
app.use(debugMiddleware);

// ========== Lazy DB Connection (for Vercel serverless) ==========
if (process.env.VERCEL) {
  let dbConnected = false;
  app.use(async (req, res, next) => {
    if (!dbConnected && mongoose.connection.readyState !== 1) {
      if (!process.env.MONGO_URI) {
        return res.status(500).json({ success: false, message: 'MONGO_URI is not set' });
      }
      try {
        await mongoose.connect(process.env.MONGO_URI);
        dbConnected = true;
        console.log('✅ MongoDB connected (serverless)');
        await AppSettings.seedDefaults();
        await MasterData.seedDefaults();
      } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err.message);
        return res.status(500).json({ success: false, message: 'Database connection failed' });
      }
    }
    next();
  });
}

// // Add request logging middleware
// app.use((req, res, next) => {
//     if (req.method === 'POST' || req.method === 'PUT') {
//         logger.debug('Request body:', {
//             contentType: req.headers['content-type'],
//             body: req.body,
//             path: req.path
//         });
//     }
//     next();
// });

// ========== Default Route ==========
app.get('/', (req, res) => {
  res.send('Resume Builder Backend is Running');
});

// ========== API Routes ==========
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/projects', projectRouter);
app.use('/api/experiences', experienceRouter);
app.use('/api/certifications', certificationRouter);
app.use('/api/educations', educationRouter);
app.use('/api/awards', awardRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/initial-templates', initialTemplateRouter);
app.use('/api/user-generated-templates', userGeneratedTemplateRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/master-data', masterDataRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/cover-letters', coverLetterRouter);

// Swagger UI setup - Change the path to /api-docs instead of /api
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true
  }
}));

// ========== Public Routes (Read-only Hosting) ==========

// Serve uploaded files (profile photos, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve admin assets (template preview images, etc.)
app.use('/admin-assets', express.static(path.join(__dirname, 'admin-assets')));

// NOTE: /user-templates is NOT served statically — files are served through
// authenticated API endpoints (GET /api/user-generated-templates/:id/files/:type)
// or through public slug-based routes below.

// ── Helper: find the correct template for a public resume ──
async function findPublicTemplate(resume, templateIdOverride) {
  const query = { resumeId: resume._id, isDeleted: false };

  // Priority: ?template= query param > resume.linkedTemplateId > first available
  if (templateIdOverride) {
    query._id = templateIdOverride;
  } else if (resume.linkedTemplateId) {
    query._id = resume.linkedTemplateId;
  }

  const template = await UserGeneratedTemplate.findOne(query);

  // If a specific template was requested but not found, don't fall back  
  if (!template && (templateIdOverride || resume.linkedTemplateId)) {
    // Try fallback to any available template for this resume
    return UserGeneratedTemplate.findOne({ resumeId: resume._id, isDeleted: false });
  }

  return template;
}

// ── Helper: validate public resume access (visibility + subscription) ──
async function validatePublicAccess(resume, res, errorFormat = 'html') {
  if (!resume || resume.visibility !== 'public') {
    if (errorFormat === 'html') {
      res.status(404).send(`
        <html>
          <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;background:#f9fafb;">
            <div style="text-align:center;max-width:400px;padding:2rem;">
              <h2 style="color:#1f2937;">Resume Not Found</h2>
              <p style="color:#6b7280;">This resume does not exist or is not publicly available.</p>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(404).send('Resume not found');
    }
    return false;
  }

  const resumeOwner = await User.findById(resume.userId).select('role');
  const isAdmin = resumeOwner && resumeOwner.role === 'admin';
  const isSubscribed = isAdmin || await Subscription.isUserSubscribed(resume.userId);
  if (!isSubscribed) {
    if (errorFormat === 'html') {
      res.status(403).send(`
        <html>
          <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;background:#f9fafb;">
            <div style="text-align:center;max-width:450px;padding:2rem;">
              <div style="font-size:3rem;margin-bottom:1rem;">🔒</div>
              <h2 style="color:#1f2937;margin-bottom:0.5rem;">Resume Not Available</h2>
              <p style="color:#6b7280;line-height:1.6;">This resume was published by a user whose subscription is currently inactive. Public resume hosting is available exclusively to subscribers.</p>
              <a href="/" style="display:inline-block;margin-top:1rem;padding:0.5rem 1.5rem;background:#4f46e5;color:#fff;border-radius:0.5rem;text-decoration:none;">Build Your Own Resume</a>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(403).send('Subscription inactive');
    }
    return false;
  }

  return true;
}

// Preview Image  — GET /public/resume/:slug/preview?template=templateId
app.get('/public/resume/:slug/preview', async (req, res) => {
  try {
    const resume = await Resume.findOne({ slug: req.params.slug });
    if (!await validatePublicAccess(resume, res, 'text')) return;

    const template = await findPublicTemplate(resume, req.query.template);
    if (!template || !template.previewImagePath) return res.status(404).send('Preview not found');

    res.sendFile(path.resolve(template.previewImagePath));
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

// HTML Resume View  — GET /public/resume/:slug?template=templateId
app.get('/public/resume/:slug', async (req, res) => {
  try {
    const resume = await Resume.findOne({ slug: req.params.slug });
    if (!await validatePublicAccess(resume, res, 'html')) return;

    // Track view analytics
    try {
      await ResumeAnalytics.recordView(resume._id, resume.userId, resume.slug, {
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        referer: req.headers['referer'] || req.headers['referrer']
      });
    } catch (analyticsErr) {
      console.error('Analytics tracking error:', analyticsErr.message);
    }

    const template = await findPublicTemplate(resume, req.query.template);
    if (!template) return res.status(404).send('Template not found');

    res.sendFile(path.resolve(template.htmlFilePath));
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

// PDF Download  — GET /public/resume/:slug/pdf?template=templateId
app.get('/public/resume/:slug/pdf', async (req, res) => {
  try {
    const resume = await Resume.findOne({ slug: req.params.slug });
    if (!await validatePublicAccess(resume, res, 'text')) return;

    // Track PDF download
    try {
      await ResumeAnalytics.recordPdfDownload(resume._id);
    } catch (analyticsErr) {
      console.error('Analytics tracking error:', analyticsErr.message);
    }

    const template = await findPublicTemplate(resume, req.query.template);
    if (!template || !template.pdfFilePath) return res.status(404).send('PDF not found');

    res.setHeader('Content-Disposition', `attachment; filename="${resume.slug}.pdf"`);
    res.sendFile(path.resolve(template.pdfFilePath));
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

// Error Handler (should be last)
app.use(errorHandler);

// ========== Connect DB and Start Server ==========
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Seed default application settings
    await AppSettings.seedDefaults();
    console.log('✅ Default settings seeded');

    // Seed default skills and languages
    await MasterData.seedDefaults();
    console.log('✅ Default master data seeded');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1); // Exit on DB failure
  }
};

// Only start the HTTP server when NOT on Vercel (Vercel uses serverless functions)
if (!process.env.VERCEL) {
  startServer();
}

// Export app for Vercel serverless entry point
module.exports = app;