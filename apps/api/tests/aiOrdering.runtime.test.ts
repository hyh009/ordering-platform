import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_MENU_FIXTURE,
  aiOrderingModelReplyFor,
} from './fixtures/aiOrdering.js';
import { buildAiOrderingContext } from '../src/modules/aiOrdering/context.js';
import {
  aiOrderingProviderFailureReasons,
  mapAiOrderingProviderFailure,
} from '../src/modules/aiOrdering/runtime/failures.js';
import { createAiOrderingModelSession } from '../src/modules/aiOrdering/runtime/gemini.js';
import {
  isAiOrderingEnabled,
  resolveAiOrderingRuntime,
} from '../src/modules/aiOrdering/runtime/index.js';
import { toAiOrderingProviderMessages } from '../src/modules/aiOrdering/runtime/messages.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type { AiOrderingToolCallingModelResult } from '../src/modules/aiOrdering/runtime/gemini.js';
import type { BaseMessage } from '@langchain/core/messages';

const config = AI_ORDERING_V1_2026_09_30;

const context = buildAiOrderingContext({
  config,
  locale: 'zh-TW',
  storeName: '測試小館',
  menu: AI_ORDERING_MENU_FIXTURE,
  cart: AI_ORDERING_CART_FIXTURE,
  participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  message: '幫我點一份白飯',
  history: [],
});

function stubModel(results: AiOrderingToolCallingModelResult[]) {
  const seen: BaseMessage[][] = [];

  return {
    seen,
    model: {
      invoke: async (messages: BaseMessage[]) => {
        seen.push(messages);
        return results[seen.length - 1] ?? { toolCalls: [], text: '' };
      },
    },
  };
}

describe('AI ordering provider messages', () => {
  it('preserves the block order the context established', () => {
    const messages = toAiOrderingProviderMessages({ context });

    // The provider caches on a common prefix, so reordering here would quietly
    // undo the volatility ordering that context assembly exists to produce.
    expect(messages).toHaveLength(context.blocks.length);
    expect(messages[0]?.getType()).toBe('system');
    expect(messages[0]?.content).toBe(config.coreInstructions);
    expect(String(messages.at(-1)?.content)).toContain('幫我點一份白飯');
  });

  it('appends a repair note after every block', () => {
    const messages = toAiOrderingProviderMessages({
      context,
      repairNote: 'change #1 cannot be applied',
    });

    // Last, so the correction never disturbs the prefix the first attempt just
    // established.
    expect(messages).toHaveLength(context.blocks.length + 1);
    expect(String(messages.at(-1)?.content)).toBe(
      'change #1 cannot be applied',
    );
  });
});

describe('AI ordering model session', () => {
  it("passes on the model's tool call without touching the network", async () => {
    const { model, seen } = stubModel([
      aiOrderingModelReplyFor(
        {
          type: 'unanswered',
          reply: '查不到。',
          reason: 'missing_product_info',
        },
        {},
      ),
    ]);

    const session = createAiOrderingModelSession({ model, config });
    const output = await session.callModel({ context });

    expect(output).toEqual({
      toolCalls: [
        {
          name: 'report_unanswerable',
          args: { reply: '查不到。', reason: 'missing_product_info' },
        },
      ],
      text: '',
    });
    expect(seen).toHaveLength(1);
  });

  it('passes on a plain-text reply with no tool call', async () => {
    const { model } = stubModel([{ toolCalls: [], text: '好的。', raw: {} }]);

    const session = createAiOrderingModelSession({ model, config });
    const output = await session.callModel({ context });

    expect(output).toEqual({ toolCalls: [], text: '好的。' });
  });

  it('keeps the provider message out of what the gate and the stored turn see', async () => {
    const { model } = stubModel([
      { toolCalls: [], text: '好的。', raw: { secret: 'provider internals' } },
    ]);

    const session = createAiOrderingModelSession({ model, config });
    const output = await session.callModel({ context });

    // `raw` exists for usage accounting only. What the model said is the answer.
    expect(output).not.toHaveProperty('raw');
  });

  describe('turn deadline clamps each call', () => {
    function capturingModel() {
      const options: ({ signal?: AbortSignal } | undefined)[] = [];

      return {
        options,
        model: {
          invoke: async (
            _messages: BaseMessage[],
            callOptions?: { signal?: AbortSignal },
          ) => {
            options.push(callOptions);
            return { toolCalls: [], text: 'ok', raw: {} };
          },
        },
      };
    }

    it('aborts immediately when the turn budget is already spent', async () => {
      const { model, options } = capturingModel();

      const session = createAiOrderingModelSession({
        model,
        config,
        deadlineAt: Date.now() - 1,
      });

      await session.callModel({ context });
      await new Promise((resolve) => setTimeout(resolve, 5));

      // Without the clamp, a call starting with no budget left would still run
      // for the full per-call timeout and push the turn past its deadline.
      expect(options[0]?.signal?.aborted).toBe(true);
    });

    it('leaves the call running while budget remains', async () => {
      const { model, options } = capturingModel();

      const session = createAiOrderingModelSession({
        model,
        config,
        deadlineAt: Date.now() + 60_000,
      });

      await session.callModel({ context });
      await new Promise((resolve) => setTimeout(resolve, 5));

      expect(options[0]?.signal?.aborted).toBe(false);
    });
  });

  describe('usage accounting', () => {
    it('records the provider cache-read token count', async () => {
      const { model } = stubModel([
        {
          toolCalls: [],
          text: '好的。',
          raw: {
            usage_metadata: {
              input_tokens: 4200,
              output_tokens: 60,
              input_token_details: { cache_read: 3900 },
            },
          },
        },
      ]);

      const session = createAiOrderingModelSession({ model, config });
      await session.callModel({ context });

      // The only evidence that the prompt layout is actually earning cache hits.
      expect(session.getUsage()).toEqual({
        cacheReadTokens: 3900,
        inputTokens: 4200,
        outputTokens: 60,
      });
    });

    it('sums usage across a repair attempt', async () => {
      const { model } = stubModel([
        {
          toolCalls: [],
          text: 'one',
          raw: {
            usage_metadata: {
              input_tokens: 100,
              output_tokens: 10,
              input_token_details: { cache_read: 80 },
            },
          },
        },
        {
          toolCalls: [],
          text: 'two',
          raw: {
            usage_metadata: {
              input_tokens: 120,
              output_tokens: 12,
              input_token_details: { cache_read: 110 },
            },
          },
        },
      ]);

      const session = createAiOrderingModelSession({ model, config });
      await session.callModel({ context });
      await session.callModel({ context, repairNote: 'try again' });

      expect(session.getUsage()).toEqual({
        cacheReadTokens: 190,
        inputTokens: 220,
        outputTokens: 22,
      });
    });

    it('reports zeros when the provider sent no usage metadata', async () => {
      const { model } = stubModel([{ toolCalls: [], text: '好的。', raw: {} }]);

      const session = createAiOrderingModelSession({ model, config });
      await session.callModel({ context });

      expect(session.getUsage().cacheReadTokens).toBe(0);
    });
  });
});

describe('AI ordering runtime resolution', () => {
  it('is disabled when no version id is configured', () => {
    expect(
      resolveAiOrderingRuntime({
        apiKey: 'a-key-that-exists',
        modelName: 'gemini-3.5-flash-lite',
      }),
    ).toBeNull();
  });

  it('is disabled when a key exists but no version was selected', () => {
    // A credential sitting in the environment must never be enough to route
    // guest traffic to a metered provider.
    expect(
      resolveAiOrderingRuntime({
        versionId: undefined,
        apiKey: 'a-key-that-exists',
        modelName: 'gemini-3.5-flash-lite',
      }),
    ).toBeNull();
  });

  it('is disabled when a version is selected but no key is present', () => {
    expect(
      resolveAiOrderingRuntime({
        versionId: config.versionId,
        modelName: 'gemini-3.5-flash-lite',
      }),
    ).toBeNull();
  });

  it('is disabled on an unknown version id rather than throwing', () => {
    expect(() =>
      resolveAiOrderingRuntime({
        versionId: 'v99-does-not-exist',
        apiKey: 'a-key-that-exists',
        modelName: 'gemini-3.5-flash-lite',
      }),
    ).not.toThrow();
  });

  it('is off under an environment that sets none of the three variables', () => {
    // The suite boots the API with GEMINI_API_KEY, GEMINI_MODEL and
    // AI_ORDERING_VERSION_ID all unset, which is the deployment default: the
    // rest of the API must come up with the assistant simply absent.
    expect(isAiOrderingEnabled()).toBe(false);
  });

  it('is enabled only when both the version and the key are present', () => {
    const runtime = resolveAiOrderingRuntime({
      versionId: config.versionId,
      apiKey: 'a-key-that-exists',
      modelName: 'gemini-3.5-flash-lite',
    });

    expect(runtime?.config.versionId).toBe(config.versionId);
    expect(runtime?.modelName).toBe('gemini-3.5-flash-lite');
  });
});

describe('AI ordering provider failure mapping', () => {
  it.each([
    [
      'timeout',
      Object.assign(new Error('The operation was aborted'), {
        name: 'AbortError',
      }),
    ],
    ['timeout', { status: 408 }],
    ['rate_limited', { status: 429 }],
    ['rate_limited', new Error('Quota exceeded for this project')],
    ['provider_unavailable', { status: 503 }],
    ['not_authorized', { status: 401 }],
    ['not_authorized', { status: 403 }],
    ['invalid_request', { status: 400 }],
    ['content_filtered', new Error('Candidate was blocked due to SAFETY')],
    ['unknown', new Error('something nobody has seen before')],
  ])('maps to %s', (expected, error) => {
    expect(mapAiOrderingProviderFailure(error)).toBe(expected);
  });

  it('never returns anything but a known reason', () => {
    const errors: unknown[] = [
      null,
      undefined,
      'a bare string',
      { weird: true },
      new Error(''),
    ];

    for (const error of errors) {
      expect(aiOrderingProviderFailureReasons).toContain(
        mapAiOrderingProviderFailure(error),
      );
    }
  });

  it('does not leak the provider message in what it returns', () => {
    const reason = mapAiOrderingProviderFailure(
      new Error(
        'prompt fragment: the guest said 幫我加珍奶, internal-id 12345',
      ),
    );

    // Raw provider errors carry prompt fragments and internal identifiers. They
    // belong in logs, never in what the caller passes on.
    expect(reason).not.toContain('幫我加珍奶');
    expect(reason).not.toContain('12345');
  });
});
