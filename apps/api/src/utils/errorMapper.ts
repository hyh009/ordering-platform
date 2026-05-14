import { ERROR_CODES } from '@src/utils/errorCode.js';
import { AppError, BadRequestError, ConflictError } from '@src/utils/errors.js';
import { isMongoDuplicateKeyError } from '@src/utils/mongoError.js';
import { ZodError } from 'zod';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function mapToAppError(err: unknown): AppError | unknown {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof ZodError) {
    return new BadRequestError(
      'Invalid request body',
      ERROR_CODES.VALIDATION_ERROR,
      err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  if (isMongoDuplicateKeyError(err)) {
    return new ConflictError(
      'Resource already exists',
      ERROR_CODES.RESOURCE_ALREADY_EXISTS,
    );
  }

  if (isObject(err) && err.name === 'CastError') {
    const path = typeof err.path === 'string' ? err.path : undefined;

    if (path === '_id') {
      return new BadRequestError('Invalid ID format', ERROR_CODES.INVALID_ID);
    }

    return new BadRequestError(
      path ? `Invalid value for field ${path}` : 'Invalid value format',
      ERROR_CODES.INVALID_FIELD_VALUE,
    );
  }

  return err;
}
