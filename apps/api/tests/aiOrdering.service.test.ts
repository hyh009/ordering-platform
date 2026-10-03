import { AIMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { fakeModel } from 'langchain';
import { describe, expect, it, vi } from 'vitest';


import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_CART_ID,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_FIXTURE_STORE_ID,
  AI_ORDERING_MENU_FIXTURE,
  aiOrderingModelMessageFor,
} from './fixtures/aiOrdering.js';
import { AI_ORDERING_MAX_TURNS_PER_CONVERSATION } from '../src/models/aiOrdering/model.js';
import { createInMemoryAiOrderingRateLimiter } from '../src/modules/aiOrdering/rateLimit.js';
import { toGeminiToolSchema } from '../src/modules/aiOrdering/runtime/geminiSchema.js';
import { aiOrderingVersionFingerprint } from '../src/modules/aiOrdering/versions/fingerprint.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';
import { createAiOrderingService } from '../src/services/aiOrdering.service.js';

import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '../src/models/aiOrdering/model.js';
import type { StoreEntity } from '../src/models/store/model.js';


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
    versionFingerprint: 'test-fingerprint',
    provider: 'gemini',
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
    modelResults?: AIMessage[];
    existingConversation?: AiOrderingConversationEntity | null;
    storeEntity?: StoreEntity | null;
    versionPermitsAutomaticApplication?: boolean;
    appendTurnImpl?: () => Promise<AiOrderingConversationEntity | null>;
    now?: () => number;
    summaryText?: string;
    summaryThrows?: boolean;
    maxTurnDurationMs?: number;
    hangModel?: boolean;
    /** `null` stands in for the assistant being switched off for the deployment. */
    runtime?: null;
  } = {},
) {
  const appended: AiOrderingTurnSnapshot[] = [];
  const findByParticipantCalls: unknown[] = [];
  const created: unknown[] = [];
  const summaryWrites: unknown[] = [];
  let summaryCalls = 0;

  const chatModel = fakeModel();

  const results = options.modelResults ?? [
    withUsage(
      aiOrderingModelMessageFor({
        type: 'message',
        reply: '珍珠奶茶是紅茶加鮮奶。',
      }),
      { cacheRead: 3500, input: 4000, output: 40 },
    ),
  ];

  for (const result of results) {
    chatModel.respond(result);
  }

  // Stands in for a provider that has stopped responding without closing the
  // connection. A proxy rather than an assignment because the agent invokes the
  // model through `bindTools(...)`, so overwriting `invoke` on the instance
  // would never be reached.
  const neverSettles = () =>
    new Promise<never>(() => {
      // deliberately never settles
    });

  const hangingProxy = (target: object): object =>
    new Proxy(target, {
      get(instance, property, receiver) {
        if (property === 'invoke' || property === 'stream') {
          return neverSettles;
        }

        const value = Reflect.get(instance, property, receiver);

        if (typeof value === 'function') {
          return (...args: unknown[]) => {
            const result = (value as (...a: unknown[]) => unknown).apply(
              instance,
              args,
            );

            return typeof result === 'object' && result !== null
              ? hangingProxy(result)
              : result;
          };
        }

        return value;
      },
    });

  const activeModel = options.hangModel ? hangingProxy(chatModel) : chatModel;

  let counter = 0;

  const service = createAiOrderingService({
    conversations: {
      findByParticipant: vi.fn(async (lookup) => {
        findByParticipantCalls.push(lookup);
        return options.existingConversation ?? null;
      }),
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
    resolveRuntime: () =>
      options.runtime === null
        ? null
        : {
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
            provider: 'gemini',
            modelName: 'test-model',
            createChatModel: () => activeModel,
            toToolSchema: (schema: unknown) =>
              toGeminiToolSchema(schema as never) as Record<string, unknown>,
            createModel: () => ({ invoke: async () => ({ toolCalls: [], text: '' }) }),
            createSummaryCaller: () => async () => {
              summaryCalls += 1;

              if (options.summaryThrows) {
                throw new Error('summary provider is down');
              }

              return options.summaryText ?? '客人點了兩杯飲料。';
            },
          },
    getCheckpointer: async () => new MemorySaver(),
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
    findByParticipantCalls,
    get modelCalls() {
      return chatModel.callCount;
    },
    get summaryCalls() {
      return summaryCalls;
    },
  };
}

async function send(h: Harness, message = '介紹一下珍珠奶茶') {
  return h.service.sendMessage(claims, { message });
}


/**
 * Attaches provider usage to a scripted reply.
 *
 * The cache-read count is the only evidence the volatility-ordered prompt layout
 * is earning its keep, so it has to survive the agent and reach the stored turn.
 */
function withUsage(
  message: AIMessage,
  usage: { cacheRead: number; input: number; output: number },
): AIMessage {
  (message as unknown as { usage_metadata: unknown }).usage_metadata = {
    input_tokens: usage.input,
    output_tokens: usage.output,
    input_token_details: { cache_read: usage.cacheRead },
  };

  return message;
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
        modelResults: Array.from({ length: 12 }, () =>
          aiOrderingModelMessageFor({ type: 'message', reply: 'ok' }),
        ),
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
        modelResults: [
          aiOrderingModelMessageFor({ type: 'message', reply: 'slow' }),
        ],
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
      // v1 is a draft, so its file may be edited between two turns that both
      // say `v1-2026-09-30`. The fingerprint is what tells those turns apart.
      expect(turn?.versionFingerprint).toBe(
        aiOrderingVersionFingerprint(AI_ORDERING_V1_2026_09_30),
      );
      // Provider and model together: the same model reached through two routes
      // would otherwise be indistinguishable in the corpus.
      expect(turn?.provider).toBe('gemini');
      expect(turn?.modelName).toBe('test-model');
      // What the model actually said, in the transport's own terms: a replay or a
      // backstage reader needs to see whether it called a tool, not a shape we
      // reconstructed from it.
      expect(turn?.modelOutput).toEqual({
        toolCalls: [],
        text: '珍珠奶茶是紅茶加鮮奶。',
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
          aiOrderingModelMessageFor(
            {
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
            {},
          ),
          aiOrderingModelMessageFor(
            {
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
            {},
          ),
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
          aiOrderingModelMessageFor(
            {
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
            {},
          ),
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
          aiOrderingModelMessageFor(
            {
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
            {},
          ),
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
          aiOrderingModelMessageFor(
            {
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
            {},
          ),
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

describe('AiOrderingService.getConversation', () => {
  function proposalTurn(id: string): AiOrderingTurnSnapshot {
    return {
      ...emptyTurn(1),
      id,
      response: {
        type: 'proposal',
        reply: '這樣可以嗎？',
        proposalId: 'proposal-1',
        confirmationRequired: true,
        operations: [
          {
            type: 'add_item',
            operationId: 'op-1',
            summary: '加入珍珠奶茶',
            item: { productId: 'prod-tea', quantity: 1 },
          },
        ],
      },
    };
  }

  it('returns an empty transcript before the guest has said anything', async () => {
    const h = harness({ existingConversation: null });

    await expect(h.service.getConversation(claims)).resolves.toEqual({
      turns: [],
    });
  });

  it('returns the stored turns oldest first', async () => {
    const h = harness({
      existingConversation: conversation([emptyTurn(1), emptyTurn(2)]),
    });

    const result = await h.service.getConversation(claims);

    expect(result.turns.map((turn) => turn.id)).toEqual(['turn-1', 'turn-2']);
    expect(result.turns[0]).toEqual({
      id: 'turn-1',
      message: '訊息 1',
      response: { type: 'message', reply: '回覆 1' },
      versionId: AI_ORDERING_V1_2026_09_30.versionId,
      createdAt: NOW.toISOString(),
    });
  });

  it('never exposes the merchant-only signals on a turn', async () => {
    const h = harness({
      existingConversation: conversation([emptyTurn(1)]),
    });

    const result = await h.service.getConversation(claims);

    // The stored snapshot carries all of these; the guest's DTO must not. A
    // storefront response is not the place for a prompt fingerprint or which
    // provider answered.
    expect(Object.keys(result.turns[0] ?? {}).sort()).toEqual([
      'createdAt',
      'id',
      'message',
      'response',
      'versionId',
    ]);
  });

  it('carries a proposal turn through intact', async () => {
    const h = harness({
      existingConversation: conversation([proposalTurn('turn-1')]),
    });

    const result = await h.service.getConversation(claims);

    // The operations have to survive: this is what lets a reopened panel show
    // what was proposed rather than just the sentence introducing it.
    expect(result.turns[0]?.response).toEqual(proposalTurn('turn-1').response);
  });

  it('looks the conversation up by store, cart AND participant', async () => {
    const h = harness({ existingConversation: conversation([emptyTurn(1)]) });

    await h.service.getConversation(claims);

    // Participant scoping is the lookup itself, so one guest cannot read another
    // participant's side of a shared cart.
    expect(h.findByParticipantCalls).toEqual([claims]);
  });

  it('reads back with the assistant switched off', async () => {
    const h = harness({
      existingConversation: conversation([emptyTurn(1)]),
      runtime: null,
    });

    // `sendMessage` is a 404 in this state. The transcript is not: the turns
    // already happened, and the guest should still see what they said.
    await expect(
      h.service.sendMessage(claims, { message: 'hi' }),
    ).rejects.toThrow(/not enabled/);
    await expect(h.service.getConversation(claims)).resolves.toMatchObject({
      turns: [{ id: 'turn-1' }],
    });
  });

  it('does not spend the guest rate-limit budget', async () => {
    const h = harness({ existingConversation: conversation([emptyTurn(1)]) });

    for (let i = 0; i < 20; i += 1) {
      await h.service.getConversation(claims);
    }

    // Reopening the panel is free. If the read took a token, a guest who
    // reloaded a few times would be locked out of actually talking.
    await expect(send(h)).resolves.toMatchObject({
      response: { type: 'message' },
    });
  });
});

describe('AiOrderingService proposal decisions', () => {
  const operations = [
    {
      type: 'add_item' as const,
      operationId: 'op-1',
      summary: '白飯 x1',
      item: { productId: 'prod-rice', quantity: 1 },
    },
    {
      type: 'add_item' as const,
      operationId: 'op-2',
      summary: '白飯 x2',
      item: { productId: 'prod-rice', quantity: 2 },
    },
  ];

  function decisionHarness(
    options: {
      proposal?: {
        proposalId: string;
        operations: typeof operations;
        decision?: { decidedAt: Date; results: unknown[] };
      } | null;
      claimed?: boolean;
      resumable?: boolean;
      addItemImpl?: (...args: unknown[]) => Promise<unknown>;
    } = {},
  ) {
    const snapshot =
      options.proposal === undefined
        ? { proposalId: 'proposal-1', operations }
        : options.proposal;
    const proposal = snapshot
      ? {
          snapshot,
          response: {
            type: 'proposal' as const,
            reply: '幫你加白飯。',
            proposalId: snapshot.proposalId,
            confirmationRequired: true,
            operations: snapshot.operations,
          },
        }
      : null;

    const resultsWritten: unknown[] = [];
    const cartCalls: unknown[] = [];
    const chatModel = fakeModel().respond(new AIMessage('都幫你加好了。'));

    const service = createAiOrderingService({
      conversations: {
        findByParticipant: vi.fn(async () => null),
        findProposal: vi.fn(async () => proposal),
        recordProposalDecision: vi.fn(async () => ({
          claimed: options.claimed ?? true,
          proposal,
        })),
        setProposalResults: vi.fn(async (input: { results: unknown }) => {
          resultsWritten.push(input.results);
        }),
      } as never,
      findStore: vi.fn(async () => store()),
      getPublicMenu: vi.fn(async () => AI_ORDERING_MENU_FIXTURE),
      getGuestCart: vi.fn(async () => AI_ORDERING_CART_FIXTURE),
      addCartItem: vi.fn(async (...args: unknown[]) => {
        cartCalls.push(args);
        return options.addItemImpl ? options.addItemImpl(...args) : undefined;
      }),
      updateCartItem: vi.fn(async () => undefined),
      removeCartItem: vi.fn(async () => undefined),
      resolveRuntime: () => ({
        config: AI_ORDERING_V1_2026_09_30,
        provider: 'gemini',
        modelName: 'test-model',
        createChatModel: () => chatModel,
        toToolSchema: (schema: unknown) =>
          toGeminiToolSchema(schema as never) as Record<string, unknown>,
        createModel: () => ({
          invoke: async () => ({ toolCalls: [], text: '' }),
        }),
        createSummaryCaller: () => async () => '',
      }) as never,
      getCheckpointer: async () => new MemorySaver(),
      rateLimiter: createInMemoryAiOrderingRateLimiter({
        maxRequestsPerWindow: 10,
        windowMs: 60_000,
      }),
      newId: (prefix) => `${prefix}-decision`,
      now: () => NOW,
    });

    return { service, resultsWritten, cartCalls };
  }

  it('refuses a second decision on the same proposal', async () => {
    const h = decisionHarness({
      claimed: false,
      proposal: {
        proposalId: 'proposal-1',
        operations,
        decision: { decidedAt: NOW, results: [] },
      },
    });

    await expect(
      h.service.decideProposal(claims, {
        proposalId: 'proposal-1',
        keptOperationIds: ['op-1'],
      }),
    ).rejects.toMatchObject({
      code: 'AI_ORDERING_PROPOSAL_ALREADY_DECIDED',
    });

    // Nothing ran. The claim is what stops a double apply, not the UI.
    expect(h.cartCalls).toHaveLength(0);
  });

  it('reports an unknown proposal differently from a decided one', async () => {
    const h = decisionHarness({ claimed: false, proposal: null });

    await expect(
      h.service.decideProposal(claims, {
        proposalId: 'proposal-gone',
        keptOperationIds: ['op-1'],
      }),
    ).rejects.toMatchObject({ code: 'AI_ORDERING_PROPOSAL_NOT_FOUND' });
  });

  it('changes nothing when the guest dismissed every operation', async () => {
    const h = decisionHarness();

    const result = await h.service.decideProposal(claims, {
      proposalId: 'proposal-1',
      keptOperationIds: [],
    });

    // No cart call and no model call: an empty decision resolves the proposal
    // and leaves the paused run to expire.
    expect(h.cartCalls).toHaveLength(0);
    expect(result.results).toEqual([
      { operationId: 'op-1', outcome: 'rejected' },
      { operationId: 'op-2', outcome: 'rejected' },
    ]);
    expect(result.reply).toBeUndefined();
  });

  it('records a result for every operation, dismissed ones included', async () => {
    const h = decisionHarness();

    await h.service
      .decideProposal(claims, {
        proposalId: 'proposal-1',
        keptOperationIds: [],
      })
      .catch(() => undefined);

    // An operation with no result would be an outcome the assistant has to
    // infer from absence.
    expect((h.resultsWritten[0] as unknown[]).length).toBe(operations.length);
  });

  it('treats a proposal with no resumable run as expired', async () => {
    const h = decisionHarness();

    // Nothing was ever paused under this proposal id in this harness, so the
    // checkpoint is absent — which is what expiry looks like from here.
    await expect(
      h.service.decideProposal(claims, {
        proposalId: 'proposal-1',
        keptOperationIds: ['op-1'],
      }),
    ).rejects.toMatchObject({ code: 'AI_ORDERING_PROPOSAL_EXPIRED' });

    expect(h.cartCalls).toHaveLength(0);
  });
});
