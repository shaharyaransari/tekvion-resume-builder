const User = require('../models/user.model');
const CreditLog = require('../models/creditLog.model');
const { logCreditEvent } = require('../services/credit.service');
const logger = require('../utils/logger');

// Get user's credit balance
exports.getCredits = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+credits');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ credits: user.credits });
    } catch (error) {
        logger.error(`Failed to get credits: ${error.message}`);
        res.status(500).json({ error: 'Failed to get credits' });
    }
};

// Update user credits (Admin only)
exports.updateCredits = async (req, res) => {
    try {
        logger.info('Credit update request received', {
            body: req.body,
            headers: req.headers['content-type']
        });

        // Validate request body
        if (!req.body || !req.body.userId || !req.body.credits || !req.body.operation) {
            logger.warn('Invalid credit update request', { body: req.body });
            return res.status(400).json({
                error: 'Missing required fields: userId, credits, operation'
            });
        }

        const { userId, credits, operation } = req.body;

        // Validate operation type
        if (!['add', 'subtract', 'set'].includes(operation)) {
            logger.warn('Invalid operation type', { operation });
            return res.status(400).json({
                error: 'Invalid operation. Must be: add, subtract, or set'
            });
        }

        // Find user
        const user = await User.findById(userId).select('+credits');
        if (!user) {
            logger.warn('User not found', { userId });
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate new credits
        let newCredits;
        switch (operation) {
            case 'add':
                newCredits = user.credits + Number(credits);
                break;
            case 'subtract':
                newCredits = user.credits - Number(credits);
                break;
            case 'set':
                newCredits = Number(credits);
                break;
        }

        // Validate resulting credits
        if (newCredits < 0) {
            logger.warn('Operation would result in negative credits', {
                userId,
                currentCredits: user.credits,
                operation,
                amount: credits,
                resultingCredits: newCredits
            });
            return res.status(400).json({
                error: 'Operation would result in negative credits'
            });
        }

        // Update user credits
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { credits: newCredits },
            { new: true, select: '+credits' }
        );

        // Log the admin credit adjustment
        const diff = newCredits - user.credits;
        await logCreditEvent({
            userId,
            type: 'admin_adjustment',
            credits: Math.abs(diff),
            balanceAfter: updatedUser.credits,
            description: `Admin ${operation}: ${Math.abs(diff)} credit${Math.abs(diff) !== 1 ? 's' : ''} (${user.credits} → ${updatedUser.credits})`,
            metadata: { operation, previousCredits: user.credits, adminId: req.user.id }
        });

        logger.info('Credits updated successfully', {
            userId,
            operation,
            previousCredits: user.credits,
            newCredits: updatedUser.credits
        });

        return res.json({
            message: 'Credits updated successfully',
            credits: updatedUser.credits,
            previousCredits: user.credits,
            operation
        });
    } catch (error) {
        logger.error('Failed to update credits', {
            error: error.message,
            stack: error.stack
        });
        return res.status(500).json({
            error: 'Failed to update credits'
        });
    }
};

// Get user's credit history (paginated)
exports.getCreditHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const { type } = req.query;

        const result = await CreditLog.getUserHistory(req.user.id, { page, limit, type });
        res.json(result);
    } catch (error) {
        logger.error(`Failed to get credit history: ${error.message}`);
        res.status(500).json({ error: 'Failed to get credit history' });
    }
};