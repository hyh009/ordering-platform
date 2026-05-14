import { describe, expect, it } from 'vitest';
import {
  ApiError,
  getApiFailureReason,
  getValidationDetails,
  hasApiErrorCode,
  normalizeApiError,
  normalizeInvalidApiResponse,
  normalizeNetworkError,
} from './apiError';

describe('api error normalization', () => {
  it('preserves documented backend error response fields', () => {
    const error = normalizeApiError({
      response: new Response(null, { status: 400 }),
      body: {
        status: 'error',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: [{ path: 'title', message: 'Required' }],
      },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: [{ path: 'title', message: 'Required' }],
    });
  });

  it('uses fallback messages when the API error body is not the expected envelope', () => {
    const error = normalizeApiError({
      response: new Response(null, { status: 503 }),
      body: { message: 'unexpected shape' },
    });

    expect(error).toMatchObject({
      statusCode: 503,
      message: 'The server could not complete the request.',
      details: { message: 'unexpected shape' },
    });
  });

  it('normalizes network failures without wrapping existing ApiError instances', () => {
    const existingError = new ApiError({
      statusCode: 404,
      code: 'TODO_NOT_FOUND',
      message: 'Todo not found',
    });

    expect(normalizeNetworkError(existingError)).toBe(existingError);
    expect(
      normalizeNetworkError(new TypeError('Failed to fetch')),
    ).toMatchObject({
      statusCode: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the API.',
    });
  });

  it('classifies generic failure reasons used by page commands', () => {
    expect(
      getApiFailureReason(
        new ApiError({
          statusCode: 0,
          code: 'NETWORK_ERROR',
          message: 'Unable to reach the API.',
        }),
      ),
    ).toBe('network');
    expect(
      getApiFailureReason(
        normalizeInvalidApiResponse({
          response: new Response(null, { status: 200 }),
          cause: new SyntaxError('Unexpected token'),
        }),
      ),
    ).toBe('invalid-response');
    expect(
      getApiFailureReason(
        new ApiError({
          statusCode: 500,
          message: 'Internal server error',
        }),
      ),
    ).toBe('server');
    expect(getApiFailureReason(new Error('plain error'))).toBe('unknown');
  });

  it('matches documented application error codes', () => {
    const error = new ApiError({
      statusCode: 404,
      code: 'TODO_NOT_FOUND',
      message: 'Todo not found',
    });

    expect(hasApiErrorCode(error, 'TODO_NOT_FOUND')).toBe(true);
    expect(hasApiErrorCode(error, 'VALIDATION_ERROR')).toBe(false);
  });

  it('returns typed validation details for validation errors only', () => {
    const validationError = new ApiError({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: [{ path: 'title', message: 'Required' }],
    });
    const malformedValidationError = new ApiError({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: [{ path: 'title', text: 'Required' }],
    });

    expect(getValidationDetails(validationError)).toEqual([
      { path: 'title', message: 'Required' },
    ]);
    expect(getValidationDetails(malformedValidationError)).toEqual([]);
    expect(
      getValidationDetails(
        new ApiError({
          statusCode: 404,
          code: 'TODO_NOT_FOUND',
          message: 'Todo not found',
        }),
      ),
    ).toEqual([]);
  });
});
