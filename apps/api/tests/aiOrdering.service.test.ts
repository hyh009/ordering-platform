import { describe, expect, it, vi } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_CART_ID,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_FIXTURE_STORE_ID,
  AI_ORDERING_MENU_FIXTURE,
} from './fixtures/aiOrdering.js';
import { AI_ORDERING_MAX_TURNS_PER_CONVERSATION } from '../src/models/aiOrdering/model.js';
import { createInMemoryAiOrderingRateLimiter } from '../src/modules/aiOrdering/rateLimit.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';
import { createAiOrderingService } from '../src/services/aiOrdering.service.js';

import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '../src/models/aiOrdering/model.js';
import type { StoreEntity } from '../src/models/store/model.js';
import type { AiOrderingStructuredModelResult } from '../src/modules/aiOrdering/runtime/gemini.js';

const claims = {
  storeId: AI_ORDERING_FIXTURE_STORE_ID,
  cartId: AI_ORDERING_FIXTURE_CART_ID,
  participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
};

const NOW = new Date('2026-09-30T00:00:00.000Z');

function store(overrides: Partial<StoreEntity> = {}): StoreEntity {
  return {
    id: AI_ORDERING_FIXTURE_STORE_ID,
    organizationId: 'org-1',
    profile: { displayName: { 'zh-TW': '測試小館', en: 'Test Diner' } },
    locale: { defaultLocale: 'zh-TW', supportedLocales: ['zh-TW', 'en'] },
    operation: {
      businessHours: [],
      serviceFeeRate: 0.1,
      orderModes: [],
    },
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function conversation(
  turns: AiOrderingTurnSnapshot[] = [],
): AiOrderingConversationEntity {
  return {
    id: 'ai-conversation-1',
    organizationId: 'org-1',
    ...claims,
    turns,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function emptyTurn(index: number): AiOrderingTurnSnapshot {
  return {
    id: `turn-${index}`,
    message: `訊息 ${index}`,
    versionId: AI_ORDERING_V1_2026_09_30.versionId,
    modelName: 'test-model',
    response: { type: 'message', reply: `回覆 ${index}` },
    quality: {
      repairAttempted: false,
      droppedOperationCount: 0,
      ownershipViolationCount: 0,
    },
    createdAt: NOW,
  };
}

type Harness = ReturnType<typeof harness>;

function harness(
  options: {
    modelResults?: AiOrderingStructuredModelResult[];
    existingConversation?: AiOrderingConversationEntity | null;
    storeEntity?: StoreEntity | null;
    versionPermitsAutomaticApplication?: boolean;
    appendTurnImpl?: () => Promise<AiOrderingConversationEntity | null>;
    now?: () => number;
    summaryText?: string;
    summaryThrows?: boolean;
    maxTurnDurationMs?: number;
    hangModel?: boolean;
  } = {},
) {
  const appended: AiOrderingTurnSnapshot[] = [];
  const created: unknown[] = [];
  const summaryWrites: unknown[] = [];
  let modelCalls = 0;
  let summaryCalls = 0;

  const results = options.modelResults ?? [
    {
      parsed: { type: 'message', reply: '珍珠奶茶是紅茶加鮮奶。' },
      raw: {
        usage_metadata: {
          input_tokens: 4000,
          output_tokens: 40,
          input_token_details: { cache_read: 3500 },
        },
      },
    },
  ];

  let counter = 0;

  const service = createAiOrderingService({
    conversations: {
      findByParticipant: vi.fn(
        async () => options.existingConversation ?? null,
      ),
      create: vi.fn(async (input) => {
        created.push(input);
        return conversation();
      }),
      appendTurn: vi.fn(async (_id, turn) => {
        if (options.appendTurnImpl) {
          return options.appendTurnImpl();
        }
        appended.push(turn);
        // Existing turns plus the new one, so summarisation sees the real length.
        return conversation([
          ...(options.existingConversation?.turns ?? []),
          ...appended,
        ]);
      }),
      updateSummary: vi.fn(async (input) => {
        summaryWrites.push(input);
        return conversation();
      }),
    },
    findStore: vi.fn(async () =>
      options.storeEntity === undefined ? store() : options.storeEntity,
    ),
    getPublicMenu: vi.fn(async () => AI_ORDERING_MENU_FIXTURE),
    getGuestCart: vi.fn(async () => AI_ORDERING_CART_FIXTURE),
    resolveRuntime: () => ({
      config: {
        ...AI_ORDERING_V1_2026_09_30,
        ...(options.maxTurnDurationMs !== undefined
          ? { maxTurnDurationMs: options.maxTurnDurationMs }
          : {}),
        ...(options.versionPermitsAutomaticApplication !== undefined
          ? {
              permitsAutomaticApplication:
                options.versionPermitsAutomaticApplication,
            }
          : {}),
      },
      modelName: 'test-model',
      createModel: () => ({
        invoke: async () => {
          modelCalls += 1;

          if (options.hangModel) {
            await new Promise(() => {
              // Never settles: stands in for a provider that has stopped
              // responding without closing the connection.
            });
          }

          return results[modelCalls - 1] ?? { parsed: undefined };
        },
      }),
      createSummaryCaller: () => async () => {
        summaryCalls += 1;

        if (options.summaryThrows) {
          throw new Error('summary provider is down');
        }

        return options.summaryText ?? '客人點了兩杯飲料。';
      },
    }),
    rateLimiter: createInMemoryAiOrderingRateLimiter({
      maxRequestsPerWindow: 10,
      windowMs: 60_000,
      ...(options.now ? { now: options.now } : {}),
    }),
    newId: (prefix) => `${prefix}-${++counter}`,
    now: () => NOW,
  });

  return {
    service,
    appended,
    created,
    summaryWrites,
    get modelCalls() {
      return modelCalls;
    },
    get summaryCalls() {
      return summaryCalls;
    },
  };
}

async function send(h: Harness, message = '介紹一下珍珠奶茶') {
  return h.service.sendMessage(claims, { message });
}

describe('AiOrderingService', () => {
  it('runs without a database, a provider, or Redis', async () => {
    const h = harness();

    const result = await send(h);

    expect(result.versionId).toBe(AI_ORDERING_V1_2026_09_30.versionId);
    expect(result.response.type).toBe('message');
  });

  it('refuses when the assistant is not enabled', async () => {
    const service = createAiOrderingService({ resolveRuntime: () => null });

    await expect(
      service.sendMessage(claims, { message: 'hi' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  describe('request limits are enforced before the model is called', () => {
    it('refuses past the per-minute rate', async () => {
      const h = harness({
        modelResults: Array.from({ length: 12 }, () => ({
          parsed: { type: 'message', reply: 'ok' },
          raw: {},
        })),
      });

      for (let index = 0; index < 10; index += 1) {
        await send(h);
      }

      await expect(send(h)).rejects.toMatchObject({ statusCode: 429 });
      // The eleventh request must not have reached the provider.
      expect(h.modelCalls).toBe(10);
    });

    it('refuses a second request while one is still in flight', async () => {
      let release: (() => void) | undefined;
      const h = harness({
        modelResults: [{ parsed: { type: 'message', reply: 'slow' }, raw: {} }],
      });

      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      const first = h.service.sendMessage(claims, { message: 'first' });
      // Let the first call reach its awaits before the second starts.
      await Promise.resolve();
      const second = h.service.sendMessage(claims, { message: 'second' });

      release?.();
      await gate;

      await expect(Promise.all([first, second])).rejects.toMatchObject({
        statusCode: 429,
      });
    });

    it('refuses once the conversation is full', async () => {
      const turns = Array.from(
        { length: AI_ORDERING_MAX_TURNS_PER_CONVERSATION },
        (_, index) => emptyTurn(index + 1),
      );
      const h = harness({ existingConversation: conversation(turns) });

      await expect(send(h)).rejects.toMatchObject({ statusCode: 429 });
      expect(h.modelCalls).toBe(0);
    });

    it('releases the in-flight slot even when the turn fails', async () => {
      const h = harness({ storeEntity: null });

      await expect(send(h)).rejects.toMatchObject({ statusCode: 404 });

      // A leaked slot would lock the guest out of the assistant for good.
      await expect(send(h)).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('turn persistence', () => {
    it('creates the conversation on the first turn', async () => {
      const h = harness({ existingConversation: null });

      await send(h);

      expect(h.created).toEqual([{ organizationId: 'org-1', ...claims }]);
    });

    it('stores the raw model output and the version that produced it', async () => {
      const h = harness();

      await send(h);

      const turn = h.appended[0];

      expect(turn?.versionId).toBe(AI_ORDERING_V1_2026_09_30.versionId);
      expect(turn?.modelName).toBe('test-model');
      expect(turn?.modelOutput).toEqual({
        type: 'message',
        reply: '珍珠奶茶是紅茶加鮮奶。',
      });
    });

    it('stores the quality signals, including the provider cache read', async () => {
      const h = harness();

      await send(h);

      // The signals only become comparable across versions once they are on the
      // stored turn; producing them is not enough.
      expect(h.appended[0]?.quality).toEqual({
        repairAttempted: false,
        droppedOperationCount: 0,
        ownershipViolationCount: 0,
        cacheReadTokens: 3500,
      });
    });

    it('stores a turn whose model output was rejected into a degraded reply', async () => {
      const h = harness({
        modelResults: [
          {
            parsed: {
              type: 'proposal',
              reply: '這個賣完了。',
              operations: [
                {
                  type: 'add_item',
                  summary: '香雞排',
                  item: { productId: 'prod-fried-chicken', quantity: 1 },
                },
              ],
            },
            raw: {},
          },
          {
            parsed: {
              type: 'proposal',
              reply: '這個賣完了。',
              operations: [
                {
                  type: 'add_item',
                  summary: '香雞排',
                  item: { productId: 'prod-fried-chicken', quantity: 1 },
                },
              ],
            },
            raw: {},
          },
        ],
      });

      const result = await send(h);

      // Rejected output is the most useful row in the evaluation corpus, so the
      // turn is stored even though no proposal survived.
      expect(result.response.type).toBe('message');
      expect(h.appended).toHaveLength(1);
      expect(h.appended[0]?.quality.droppedOperationCount).toBe(1);
      expect(h.appended[0]?.quality.repairAttempted).toBe(true);
    });

    it('snapshots a proposal so the next turn can resolve its outcomes', async () => {
      const h = harness({
        modelResults: [
          {
            parsed: {
              type: 'proposal',
              reply: '幫你加白飯。',
              operations: [
                {
                  type: 'add_item',
                  summary: '白飯 x1',
                  item: { productId: 'prod-rice', quantity: 1 },
                },
              ],
            },
            raw: {},
          },
        ],
      });

      await send(h);

      expect(h.appended[0]?.proposal?.operations).toHaveLength(1);
      expect(h.appended[0]?.proposal?.proposalId).toBeDefined();
    });

    it('fails the request when the turn cannot be stored', async () => {
      const h = harness({
        appendTurnImpl: async () => {
          throw new Error('mongo is down');
        },
      });

      // Returning the response anyway would hand the guest a proposal whose
      // snapshot does not exist, breaking the next turn instead of this one.
      await expect(send(h)).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('confirmation mode', () => {
    it('requires confirmation when the version forbids automatic application', async () => {
      const h = harness({
        versionPermitsAutomaticApplication: false,
        storeEntity: store({ assistant: { autoApplyCartOperations: true } }),
        modelResults: [
          {
            parsed: {
              type: 'proposal',
              reply: '幫你加白飯。',
              operations: [
                {
                  type: 'add_item',
                  summary: '白飯 x1',
                  item: { productId: 'prod-rice', quantity: 1 },
                },
              ],
            },
            raw: {},
          },
        ],
      });

      const result = await send(h);

      expect(
        result.response.type === 'proposal' &&
          result.response.confirmationRequired,
      ).toBe(true);
    });

    it('skips confirmation only when the store and the version both allow it', async () => {
      const h = harness({
        versionPermitsAutomaticApplication: true,
        storeEntity: store({ assistant: { autoApplyCartOperations: true } }),
        modelResults: [
          {
            parsed: {
              type: 'proposal',
              reply: '幫你加白飯。',
              operations: [
                {
                  type: 'add_item',
                  summary: '白飯 x1',
                  item: { productId: 'prod-rice', quantity: 1 },
                },
              ],
            },
            raw: {},
          },
        ],
      });

      const result = await send(h);

      expect(
        result.response.type === 'proposal' &&
          result.response.confirmationRequired,
      ).toBe(false);
    });
  });

  describe('turn budget', () => {
    it('fails the turn when it exceeds the version budget', async () => {
      const h = harness({ maxTurnDurationMs: 20, hangModel: true });

      // The per-call provider timeout does not bound a turn on its own, and a
      // provider that never answers would otherwise hold the request open.
      await expect(send(h)).rejects.toMatchObject({ statusCode: 500 });
    });

    it('releases the in-flight lock when the turn times out', async () => {
      const h = harness({ maxTurnDurationMs: 20, hangModel: true });

      await expect(send(h)).rejects.toMatchObject({ statusCode: 500 });

      // A leaked lock would make this second attempt fail with 429 for
      // concurrency instead of timing out on its own. That distinction is the
      // whole reason the lock's expiry can be set generously.
      await expect(send(h)).rejects.toMatchObject({ statusCode: 500 });
    });
  });

  describe('rolling summary', () => {
    function longConversation(turnCount: number) {
      return conversation(
        Array.from({ length: turnCount }, (_, index) => emptyTurn(index + 1)),
      );
    }

    it('does not rebuild while the conversation still fits in the window', async () => {
      const h = harness({ existingConversation: longConversation(5) });

      await send(h);

      expect(h.summaryCalls).toBe(0);
      expect(h.summaryWrites).toHaveLength(0);
    });

    it('does not rebuild until a batch has aged out', async () => {
      // 10 stored plus this turn is 11: one turn past the window, which is not
      // yet worth a model call.
      const h = harness({ existingConversation: longConversation(10) });

      await send(h);

      expect(h.summaryCalls).toBe(0);
    });

    it('rebuilds once a batch has aged out, covering the aged-out turns', async () => {
      const h = harness({ existingConversation: longConversation(15) });

      await send(h);

      expect(h.summaryCalls).toBe(1);
      expect(h.summaryWrites).toEqual([
        {
          conversationId: 'ai-conversation-1',
          summary: '客人點了兩杯飲料。',
          // 16 turns stored, 10 sent verbatim, so the first 6 are summarised.
          summarizedUpToTurnIndex: 6,
        },
      ]);
    });

    it('still answers the guest when the summary rebuild fails', async () => {
      const h = harness({
        existingConversation: longConversation(15),
        summaryThrows: true,
      });

      // Maintenance must not cost the guest their answer: the next batch rebuilds
      // from the same original turns.
      const result = await send(h);

      expect(result.response.type).toBe('message');
      expect(h.summaryWrites).toHaveLength(0);
      expect(h.appended).toHaveLength(1);
    });

    it('skips the write when the model returns nothing usable', async () => {
      const h = harness({
        existingConversation: longConversation(15),
        summaryText: '   ',
      });

      await send(h);

      expect(h.summaryCalls).toBe(1);
      expect(h.summaryWrites).toHaveLength(0);
    });
  });

  it('refuses a prompt id this conversation never issued', async () => {
    const h = harness({ existingConversation: conversation([emptyTurn(1)]) });

    await expect(
      h.service.sendMessage(claims, {
        message: '半糖',
        responseToPromptId: 'prompt-from-another-guest',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(h.modelCalls).toBe(0);
  });
});
