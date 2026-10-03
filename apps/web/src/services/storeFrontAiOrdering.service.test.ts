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
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer guest-token',
    );
  });

  it('sends the kept operation ids when the guest decides a proposal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'success',
        data: {
          proposalId: 'proposal-1',
          results: [{ operationId: 'op-2', outcome: 'accepted' }],
          cart: {
            id: 'cart-1',
            storeId: 'store-1',
            status: 'active',
            items: [],
            participants: [],
            subtotal: 0,
            serviceFeeRate: 0,
            serviceFeeAmount: 0,
            totalAmount: 0,
            createdAt: '2026-10-01T00:00:00.000Z',
            updatedAt: '2026-10-01T00:00:00.000Z',
          },
          reply: 'Added one.',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const decision = await storeFrontAiOrderingService.decideProposal(
      'guest-token',
      { proposalId: 'proposal-1', keptOperationIds: ['op-2'] },
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(String(url)).toContain('/ai-ordering/proposals/decision');
    // Ids only: what executes is rebuilt from the proposal the backend stored.
    expect(JSON.parse(String(init.body))).toEqual({
      proposalId: 'proposal-1',
      keptOperationIds: ['op-2'],
    });
    expect(decision.results).toEqual([
      { operationId: 'op-2', outcome: 'accepted' },
    ]);
    expect(decision.reply).toBe('Added one.');
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

describe('storeFrontAiOrderingService.getConversation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the transcript with the guest token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'success',
        data: {
          turns: [
            {
              id: 'turn-1',
              message: 'Anything good?',
              versionId: 'v1-2026-09-30',
              createdAt: '2026-10-01T00:00:00.000Z',
              response: { type: 'message', reply: 'The tea is popular.' },
            },
          ],
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const turns =
      await storeFrontAiOrderingService.getConversation('guest-token');

    expect(turns).toHaveLength(1);
    expect(turns[0]?.message).toBe('Anything good?');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toContain('/v1/public/guest/ai-ordering/conversation');
    // A read, so no method override and no body.
    expect(init.method).toBeUndefined();
    expect(init.body).toBeUndefined();
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer guest-token',
    );
  });

  it('surfaces an API error rather than an empty transcript', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            {
              status: 'error',
              message: 'Invalid guest token',
              statusCode: 401,
            },
            401,
          ),
        ),
    );

    await expect(
      storeFrontAiOrderingService.getConversation('guest-token'),
    ).rejects.toSatisfy(isApiError);
  });
});
