import { ERROR_CODES } from '@src/utils/errorCode.js';
import { mapToAppError } from '@src/utils/errorMapper.js';
import { AppError } from '@src/utils/errors';
import { logger } from '@src/utils/logger.js';
import { ErrorRequestHandler } from 'express';

function normalizeThrownValue(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      raw: error,
    };
  }

  return {
    message: 'Unknown error',
    raw: error,
  };
}

function shouldWarnAppError(error: AppError) {
  return (
    error.code === ERROR_CODES.UNAUTHORIZED ||
    error.code === ERROR_CODES.FORBIDDEN
  );
}

function getUnexpectedErrorLogContext(error: unknown) {
  if (error instanceof Error) {
    return { err: error };
  }

  return {
    thrownType: error === null ? 'null' : typeof error,
  };
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const error = mapToAppError(err);
  const normalizedError = normalizeThrownValue(error);
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;

  if (isAppError && error.isOperational && shouldWarnAppError(error)) {
    logger.warn(
      {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        code: error.code,
      },
      'security-sensitive application error',
    );
  }

  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      status: 'error',
      statusCode,
      code: isAppError ? error.code : undefined,
      message: normalizedError.message,
      details: isAppError ? error.details : undefined,
      stack: normalizedError.stack,
      error: normalizedError.raw,
    });
    return;
  }

  if (isAppError && error.isOperational) {
    res.status(statusCode).json({
      status: 'error',
      statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  logger.error(
    {
      ...getUnexpectedErrorLogContext(error),
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: 500,
    },
    'unexpected error',
  );

  res.status(500).json({
    status: 'error',
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal Server Error',
  });
};
