import { ERROR_CODES } from '@src/utils/errorCode.js';

import type { ErrorCode } from '@src/utils/errorCode.js';

export class AppError extends Error {
  public readonly isOperational: boolean;

  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: unknown,
    isOperational = true,
  ) {
    super(message);
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(
    message = 'Bad request',
    code: ErrorCode = ERROR_CODES.BAD_REQUEST,
    details?: unknown,
  ) {
    super(400, message, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = 'Unauthorized',
    code: ErrorCode = ERROR_CODES.UNAUTHORIZED,
  ) {
    super(401, message, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code: ErrorCode = ERROR_CODES.FORBIDDEN) {
    super(403, message, code);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = 'Resource not found',
    code: ErrorCode = ERROR_CODES.NOT_FOUND,
  ) {
    super(404, message, code);
  }
}

export class RouteNotFoundError extends AppError {
  constructor(
    message = 'Route not found',
    code: ErrorCode = ERROR_CODES.NOT_FOUND,
  ) {
    super(404, message, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code: ErrorCode = ERROR_CODES.CONFLICT) {
    super(409, message, code);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = 'Internal Server Error',
    code: ErrorCode = ERROR_CODES.INTERNAL_SERVER_ERROR,
    isOperational = false,
  ) {
    super(500, message, code, isOperational);
  }
}
