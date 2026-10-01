import { afterEach, describe, expect, it, vi } from 'vitest';

import { isApiError } from '@/api/apiError';

import { storeFrontAiOrderingService } from './storeFrontAiOrdering.service';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe('storeFrontAiOrderingService.sendMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the guest token and returns a deserialized turn', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'success',
        data: {
          versionId: 'v1-2026-09-30',
          response: { type: 'message', reply: 'Bubble tea is black tea.' },
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      storeFrontAiOrderingService.sendMessage('guest-token', {
        message: 'What is bubble tea?',
      }),
    ).resolves.toEqual({
      versionId: 'v1-2026-09-30',
      response: { type: 'message', reply: 'Bubble tea is black tea.' },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toContain('/v1/public/guest/ai-ordering/chat');
    expect(init.method).toBe('POST');
    expect(
      new Headers(init.headers).get('Authorization'),
    ).toBe('Bearer guest-token');
  });

  it('attaches the previous outcome when one is reported', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'success',
        data: {
          versionId: 'v1-2026-09-30',
          response: { type: 'message', reply: 'Noted.' },
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await storeFrontAiOrderingService.sendMessage('guest-token', {
      message: 'Something else then',
      previousOutcome: {
        proposalId: 'proposal-1',
        results: [{ operationId: 'op-1', outcome: 'rejected' }],
      },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(JSON.parse(String(init.body))).toMatchObject({
      previousOutcome: {
        proposalId: 'proposal-1',
        results: [{ operationId: 'op-1', outcome: 'rejected' }],
      },
    });
  });

  it('raises the typed failure when the assistant is disabled for the store', async () => {
    // The backend answers 404 with this code rather than hiding the route, so the
    // panel can tell "assistant off" from a genuine missing resource.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            status: 'error',
            statusCode: 404,
            code: 'AI_ORDERING_DISABLED',
            message: 'The AI ordering assistant is not available.',
          },
          404,
        ),
      ),
    );

    const error = await storeFrontAiOrderingService
      .sendMessage('guest-token', { message: 'Hi' })
      .catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    expect(isApiError(error) && error.code).toBe('AI_ORDERING_DISABLED');
    expect(isApiError(error) && error.statusCode).toBe(404);
  });

  it('raises the typed failure when the provider is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            status: 'error',
            statusCode: 503,
            code: 'AI_ORDERING_UNAVAILABLE',
            message: 'The assistant is temporarily unavailable.',
          },
          503,
        ),
      ),
    );

    const error = await storeFrontAiOrderingService
      .sendMessage('guest-token', { message: 'Hi' })
      .catch((caught: unknown) => caught);

    expect(isApiError(error) && error.code).toBe('AI_ORDERING_UNAVAILABLE');
  });
});
