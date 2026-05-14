import { logger } from '@src/utils/logger.js';
import { RequestHandler } from 'express';

type RequestLogLevel = 'info' | 'warn' | 'error';

function getRequestLogLevel(statusCode: number): RequestLogLevel {
  if (statusCode >= 500) {
    return 'error';
  }

  if ([401, 403, 429].includes(statusCode)) {
    return 'warn';
  }

  return 'info';
}

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const statusCode = res.statusCode;
    const level = getRequestLogLevel(statusCode);

    logger[level](
      {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      },
      'request completed',
    );
  });

  next();
};
