import pino, { type LoggerOptions } from 'pino';

// Define the configuration object with proper typing
const pinoConfig: LoggerOptions = {
  // 1. Level Strategy
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'trace'),

  // 2. Redaction Strategy (Standard for Erinde)
  redact: {
    paths: [
      'password', 
      '*.password',             // Catch nested passwords in objects
      'credentials.password', 
      'token', 
      '*.token',
      'email', 
      'phoneNumber',
      'identifier'              // Catch the login identifier
    ],
    censor: '***REDACTED***'    // Industry standard placeholder
  }
};

// 3. Environment-based Transport (Solves the TS "undefined" error)
if (process.env.NODE_ENV !== 'production') {
  pinoConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'    // Cleaner dev logs
    }
  };
}

export const logger = pino(pinoConfig);