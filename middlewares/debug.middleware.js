const logger = require('../utils/logger');

const debugMiddleware = (req, res, next) => {
    logger.debug('Request:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params
    });
    next();
};

module.exports = debugMiddleware;