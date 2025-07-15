const pino = require('pino');
const config = require('./config');

let loggerOptions = {
  level: config.logging.level,
};

if (process.env.NODE_ENV !== 'production' || config.logging.debugMode) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:dd-mm-yyyy HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
}

const logger = pino(loggerOptions);

logger.debugOnly = (message, ...args) => {
  if (config.logging.debugMode) {
    logger.debug(message, ...args);
  }
};

module.exports = logger;