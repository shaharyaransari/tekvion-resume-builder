const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

const isServerless = !!process.env.VERCEL;

// Ensure logs directory exists (non-serverless only)
const logDir = path.join(__dirname, '../logs');
if (!isServerless) {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  } catch (err) {
    console.warn('Logger file transport disabled:', err.message);
  }
}

// Define log format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message }) => {
    return `[${level.toUpperCase()}] ${timestamp} - ${message}`;
  })
);

const loggerTransports = [
  new transports.Console({
    format: format.combine(format.colorize(), logFormat),
    level: 'debug'
  })
];

if (!isServerless) {
  loggerTransports.unshift(
    new transports.DailyRotateFile({
      filename: 'app-%DATE%.log',
      dirname: logDir,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '14d',
      level: 'debug'
    }),
    new transports.DailyRotateFile({
      filename: 'error-%DATE%.log',
      dirname: logDir,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '30d',
      level: 'error'
    })
  );
}

const loggerInstance = createLogger({
  level: 'debug',
  format: logFormat,
  transports: loggerTransports
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