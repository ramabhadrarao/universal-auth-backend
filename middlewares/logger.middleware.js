const winston = require('winston');

// Create a custom format for winston logger
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'user-management-api' },
  transports: [
    // Write logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    // Write all logs to combined.log
    new winston.transports.File({ filename: 'logs/combined.log' }),
    // Write all errors to error.log
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  ]
});

// Express middleware for logging HTTP requests
const requestLogger = (req, res, next) => {
  // Log when request starts
  const start = Date.now();
  
  // Log once the response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user: req.user ? req.user._id : 'unauthenticated'
    });
  });
  
  next();
};

module.exports = {
  logger,
  requestLogger
};
