require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require("path");

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../config/swagger.config');

const app = express();

// Routers
const authRouter = require('../routes/auth.routes');
const userRouter = require('../routes/user.routes');
const projectRouter = require('../routes/project.routes');
const experienceRouter = require('../routes/experience.routes');
const certificationRouter = require('../routes/certification.routes');
const educationRouter = require('../routes/education.routes');
const awardRouter = require('../routes/award.routes');
const resumeRouter = require('../routes/resume.routes');
const initialTemplateRouter = require('../routes/initialTemplate.routes');
const userGeneratedTemplateRouter = require('../routes/userGeneratedTemplate.routes');
const creditsRouter = require('../routes/credits.routes');
const settingsRouter = require('../routes/appSettings.routes');
const masterDataRouter = require('../routes/masterData.routes');
const paymentRouter = require('../routes/payment.routes');
const analyticsRouter = require('../routes/analytics.routes');
const salaryRouter = require('../routes/salary.routes');
const coverLetterRouter = require('../routes/coverLetter.routes');

// Middlewares
const errorHandler = require('../middlewares/error.middleware');
const {
    generalLimiter,
} = require('../middlewares/rateLimit.middleware');
const debugMiddleware = require('../middlewares/debug.middleware');

// Models
const Resume = require('../models/resume.model');
const User = require('../models/user.model');
const UserGeneratedTemplate = require('../models/userGeneratedTemplate.model');
const AppSettings = require('../models/appSettings.model');
const MasterData = require('../models/masterData.model');
const Subscription = require('../models/subscription.model');
const ResumeAnalytics = require('../models/resumeAnalytics.model');

// ========== Global Middlewares ==========

// Enable CORS with credentials
app.use(cors({
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Debug middleware
if (process.env.NODE_ENV === 'development') {
    app.use(debugMiddleware);
}

// Rate Limiting
app.use(generalLimiter);

// ========== Database Connection ==========

let dbConnected = false;

const connectDB = async () => {
    if (dbConnected || mongoose.connection.readyState === 1) {
        dbConnected = true;
        return;
    }

    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not set');
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        dbConnected = true;
        console.log('✅ MongoDB connected');

        await AppSettings.seedDefaults();
        console.log('✅ Default settings seeded');

        await MasterData.seedDefaults();
        console.log('✅ Default master data seeded');
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB:', err.message);
        throw err;
    }
};

app.use(async (req, res, next) => {
    if (!dbConnected) {
        try {
            await connectDB();
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Database connection failed'
            });
        }
    }
    next();
});

// ========== API Routes ==========

// Health check endpoint (important for Vercel)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/projects', projectRouter);
app.use('/api/experience', experienceRouter);
app.use('/api/certifications', certificationRouter);
app.use('/api/education', educationRouter);
app.use('/api/awards', awardRouter);
app.use('/api/resumes', resumeRouter);
app.use('/api/initial-templates', initialTemplateRouter);
app.use('/api/user-templates', userGeneratedTemplateRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/master-data', masterDataRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/cover-letter', coverLetterRouter);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Resume Builder API',
        version: '1.0.0',
        docs: '/api-docs',
        health: '/health'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
app.use(errorHandler);

// Export for Vercel
module.exports = app;
