const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middlewares/auth.middleware');
const { requireSubscription } = require('../middlewares/subscription.middleware');
const coverLetterController = require('../controllers/coverLetter.controller');
const tryCatch = require('../utils/tryCatch');

// All routes require authentication
router.use(authenticateUser);

// ─── Credit Costs (public to all authenticated users) ────────────────────────
router.get('/costs', tryCatch(coverLetterController.getCosts));

// ─── Permanent Instructions (subscriber only) ───────────────────────────────
router.get('/instructions', requireSubscription, tryCatch(coverLetterController.getInstructions));
router.put('/instructions', requireSubscription, tryCatch(coverLetterController.updateInstructions));

// ─── Job Post (subscriber only) ─────────────────────────────────────────────
router.post('/job-post/generate', requireSubscription, tryCatch(coverLetterController.generateJobPost));

// ─── Upwork (subscriber only) ───────────────────────────────────────────────
router.post('/upwork/estimate', requireSubscription, tryCatch(coverLetterController.estimateUpwork));
router.post('/upwork/proposal', requireSubscription, tryCatch(coverLetterController.writeUpworkProposal));

// ─── Fiverr (subscriber only) ───────────────────────────────────────────────
router.post('/fiverr/estimate', requireSubscription, tryCatch(coverLetterController.estimateFiverr));
router.post('/fiverr/proposal', requireSubscription, tryCatch(coverLetterController.writeFiverrProposal));

module.exports = router;
