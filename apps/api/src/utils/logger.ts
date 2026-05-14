import { env } from '@src/config/env.js';
import pino from 'pino';

const isDevelopment = env.NODE_ENV === 'development';

const loggerOptions: pino.LoggerOptions = {
  level: env.LOG_LEVEL,
  base: {
    service: 'api',
  },
  redact: {
    paths: [
      'authorization',
      'cookie',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      '*.authorization',
      '*.cookie',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
    ],
    remove: true,
  },
};

export const logger = pino(
  isDevelopment
    ? {
        ...loggerOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        },
      }
    : loggerOptions,
);
