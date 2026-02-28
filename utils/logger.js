const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

// Define log format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message }) => {
    return `[${level.toUpperCase()}] ${timestamp} - ${message}`;
  })
);

// Setup transports
const transportAll = new transports.DailyRotateFile({
  filename: 'app-%DATE%.log',
  dirname: logDir,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '14d',
  level: 'debug' // Changed from 'info' to include debug level
});

const transportError = new transports.DailyRotateFile({
  filename: 'error-%DATE%.log',
  dirname: logDir,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '10m',
  maxFiles: '30d',
  level: 'error'
});

const loggerInstance = createLogger({
  level: 'debug', // Set minimum logging level
  format: logFormat,
  transports: [
    transportAll,
    transportError,
    new transports.Console({ 
      format: format.combine(format.colorize(), logFormat),
      level: 'debug'
    })
  ]
});

// Export matching your existing usage style with added debug
const logger = {
  debug: (...args) => loggerInstance.debug(args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ')),
  info: (...args) => loggerInstance.info(args.map(String).join(' ')),
  warn: (...args) => loggerInstance.warn(args.map(String).join(' ')),
  error: (...args) => loggerInstance.error(args.map(String).join(' '))
};

module.exports = logger;