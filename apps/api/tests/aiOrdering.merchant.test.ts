import { describe, expect, it, vi } from 'vitest';

import {
  toAiOrderingConversationDetailDto,
  toAiOrderingConversationSummaryDto,
  toAiOrderingGuestConversationDto,
  toAiOrderingUnansweredEntryDtos,
} from '../src/models/aiOrdering/mapper.js';
import { createAiOrderingReviewService } from '../src/services/aiOrderingReview.service.js';

import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '../src/models/aiOrdering/model.js';
import type { AiOrderingResponse } from '@repo/shared';

const AT = new Date('2026-10-01T03:00:00.000Z');

function turn(
  id: string,
  response: AiOrderingResponse,
  overrides: Partial<AiOrderingTurnSnapshot> = {},
): AiOrderingTurnSnapshot {
  return {
    id,
    message: '這個有蔥嗎',
    versionId: 'v1-2026-09-30',
    versionFingerprint: 'fingerprint-1',
    provider: 'gemini',
    modelName: 'test-model',
    modelOutput: { toolCalls: [], text: 'provider internals' },
    response,
    quality: {
      repairAttempted: false,
      droppedOperationCount: 0,
      ownershipViolationCount: 0,
    },
    createdAt: AT,
    ...overrides,
  };
}

function conversation(
  turns: AiOrderingTurnSnapshot[],
  overrides: Partial<AiOrderingConversationEntity> = {},
): AiOrderingConversationEntity {
  return {
    id: 'ai-conversation-1',
    organizationId: 'org-1',
    storeId: 'store-1',
    cartId: 'cart-1',
    participantId: 'participant-1',
    turns,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

const unansweredResponse: AiOrderingResponse = {
  type: 'unanswered',
  reply: '店家資料中沒有標示是否含蔥。',
  reason: 'missing_product_info',
  productId: 'product-9',
};

describe('AI ordering merchant mapper', () => {
  it('exposes what the model answered, not only what the guest saw', () => {
    // The question this exists for: the reply promised a note and no note was
    // written. Only the model's own arguments say which of the two happened.
    const detail = toAiOrderingConversationDetailDto(
      conversation([
        turn(
          'turn-1',
          { type: 'message', reply: '好的，幫你備註加辣。' },
          {
            modelOutput: {
              toolCalls: [
                {
                  name: 'propose_cart_operations',
                  args: { operations: [{ type: 'update_own_item' }] },
                },
              ],
              text: '',
            },
          },
        ),
      ]),
    );

    expect(detail.turns[0]?.modelOutput).toEqual({
      toolCalls: [
        {
          name: 'propose_cart_operations',
          args: { operations: [{ type: 'update_own_item' }] },
        },
      ],
      text: '',
    });
  });

  it('exposes how the turn was reached, call by call', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([
        turn(
          'turn-1',
          { type: 'message', reply: '請問冰塊要哪一種？' },
          {
            modelTrace: {
              currentTurn: '# This turn\n## Guest message\n無糖紅茶',
              calls: [
                {
                  toolNames: ['propose_cart_operations', 'ask_choices'],
                  output: {
                    toolCalls: [{ name: 'propose_cart_operations', args: {} }],
                    text: '',
                  },
                },
                {
                  toolNames: ['propose_cart_operations', 'ask_choices'],
                  feedback: 'the guest has not chosen modifier "ab12cd34"',
                  // Not a recognizable reply: the call is kept, the output is not.
                  output: { candidates: [] },
                },
                { toolNames: ['ask_choices'], error: '429 Too Many Requests' },
              ],
            },
          },
        ),
      ]),
    );

    expect(detail.turns[0]?.modelTrace).toEqual({
      currentTurn: '# This turn\n## Guest message\n無糖紅茶',
      calls: [
        {
          toolNames: ['propose_cart_operations', 'ask_choices'],
          output: {
            toolCalls: [{ name: 'propose_cart_operations', args: {} }],
            text: '',
          },
        },
        {
          toolNames: ['propose_cart_operations', 'ask_choices'],
          feedback: 'the guest has not chosen modifier "ab12cd34"',
        },
        { toolNames: ['ask_choices'], error: '429 Too Many Requests' },
      ],
    });
  });

  it('keeps the prompt out of the merchant mapping', () => {
    const stored = conversation(
      [turn('turn-1', { type: 'message', reply: '好的。' })],
      {
        promptPreludes: [
          {
            hash: 'abc123def456',
            coreInstructions: 'You are an ordering assistant.',
            tools: '[]',
            storeData: '## Menu',
            createdAt: AT,
          },
        ],
      },
    );

    // The default is the merchant's view: the core instructions are the
    // platform's, so nothing about them leaves unless explicitly asked for.
    expect(toAiOrderingConversationDetailDto(stored)).not.toHaveProperty(
      'promptPreludes',
    );
    expect(
      toAiOrderingConversationDetailDto(stored, { includePromptPreludes: true })
        .promptPreludes,
    ).toEqual([
      {
        hash: 'abc123def456',
        coreInstructions: 'You are an ordering assistant.',
        tools: '[]',
        storeData: '## Menu',
        createdAt: AT.toISOString(),
      },
    ]);
  });

  it('omits a stored trace it does not recognize', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([
        turn(
          'turn-1',
          { type: 'message', reply: '好的。' },
          { modelTrace: { calls: 'not a list' } },
        ),
      ]),
    );

    expect(detail.turns[0]).not.toHaveProperty('modelTrace');
  });

  it('omits a stored output whose shape it does not recognize', () => {
    // `modelOutput` is `Mixed` in Mongo, so the stored value is whatever some
    // past or future runtime wrote. A half-understood object must not reach the
    // reader as though the contract covered it.
    const detail = toAiOrderingConversationDetailDto(
      conversation([
        turn(
          'turn-1',
          { type: 'message', reply: '好的。' },
          {
            modelOutput: { candidates: ['provider internals'] },
          },
        ),
      ]),
    );

    expect(detail.turns[0]).not.toHaveProperty('modelOutput');
    expect(JSON.stringify(detail)).not.toContain('provider internals');
  });

  it('omits the field entirely when a turn stored no output', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([
        turn(
          'turn-1',
          { type: 'message', reply: '好的。' },
          {
            modelOutput: undefined,
          },
        ),
      ]),
    );

    expect(detail.turns[0]).not.toHaveProperty('modelOutput');
  });

  it('keeps the raw output out of the guest transcript', () => {
    const dto = toAiOrderingGuestConversationDto(
      conversation([turn('turn-1', { type: 'message', reply: '好的。' })]),
    );

    // Opening this to the merchant did not open it to the guest: the two DTOs
    // are separate narrowings, which is what makes that a one-sided change.
    expect(JSON.stringify(dto)).not.toContain('provider internals');
    expect(dto.turns[0]).not.toHaveProperty('modelOutput');
  });

  it('exposes the quality signals that explain a turn', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([
        turn(
          'turn-1',
          { type: 'message', reply: '好的。' },
          {
            quality: {
              repairAttempted: true,
              repairSucceeded: false,
              droppedOperationCount: 2,
              ownershipViolationCount: 1,
            },
          },
        ),
      ]),
    );

    expect(detail.turns[0]).toMatchObject({
      repairAttempted: true,
      repairSucceeded: false,
      droppedOperationCount: 2,
      ownershipViolationCount: 1,
    });
  });

  it('carries the version fingerprint beside the version id', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([turn('turn-1', { type: 'message', reply: '好的。' })]),
    );

    // A draft version's file may be edited between two turns sharing an id.
    expect(detail.turns[0]?.versionFingerprint).toBe('fingerprint-1');
  });

  it('omits repairSucceeded when no repair ran', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([turn('turn-1', { type: 'message', reply: '好的。' })]),
    );

    expect(detail.turns[0]).not.toHaveProperty('repairSucceeded');
  });

  it('counts unanswered turns on the list summary', () => {
    const summary = toAiOrderingConversationSummaryDto(
      conversation([
        turn('turn-1', { type: 'message', reply: '好的。' }),
        turn('turn-2', unansweredResponse),
        turn('turn-3', unansweredResponse),
      ]),
    );

    expect(summary.turnCount).toBe(3);
    expect(summary.unansweredCount).toBe(2);
    expect(summary.lastTurnAt).toBe(AT.toISOString());
  });

  it('omits lastTurnAt on a conversation with no turns', () => {
    expect(
      toAiOrderingConversationSummaryDto(conversation([])),
    ).not.toHaveProperty('lastTurnAt');
  });

  it('flattens unanswered turns and keeps the product reference', () => {
    const entries = toAiOrderingUnansweredEntryDtos(
      conversation([
        turn('turn-1', { type: 'message', reply: '好的。' }),
        turn('turn-2', unansweredResponse),
      ]),
    );

    expect(entries).toEqual([
      {
        conversationId: 'ai-conversation-1',
        turnId: 'turn-2',
        participantId: 'participant-1',
        message: '這個有蔥嗎',
        reply: '店家資料中沒有標示是否含蔥。',
        reason: 'missing_product_info',
        productId: 'product-9',
        createdAt: AT.toISOString(),
      },
    ]);
  });

  it('omits the product when the reason does not identify one', () => {
    const entries = toAiOrderingUnansweredEntryDtos(
      conversation([
        turn('turn-1', {
          type: 'unanswered',
          reply: '這我沒辦法回答。',
          reason: 'out_of_scope',
        }),
      ]),
    );

    expect(entries[0]).not.toHaveProperty('productId');
  });
});

describe('AI ordering merchant review service', () => {
  function repositoryStub(
    overrides: Partial<
      Parameters<typeof createAiOrderingReviewService>[0]['repository']
    > = {},
  ) {
    return {
      listByStore: vi.fn().mockResolvedValue([]),
      countByStore: vi.fn().mockResolvedValue(0),
      findById: vi.fn().mockResolvedValue(null),
      listUnanswered: vi.fn().mockResolvedValue([]),
      countUnanswered: vi.fn().mockResolvedValue(0),
      ...overrides,
    };
  }

  it('turns a page number into a skip the repository understands', async () => {
    const repository = repositoryStub();
    const service = createAiOrderingReviewService({ repository });

    await service.listConversations('store-1', { page: 3, pageSize: 20 });

    expect(repository.listByStore).toHaveBeenCalledWith({
      storeId: 'store-1',
      skip: 40,
      limit: 20,
    });
  });

  it('returns the prompt only from the platform read', async () => {
    const stored = conversation(
      [turn('turn-1', { type: 'message', reply: '好的。' })],
      {
        promptPreludes: [
          {
            hash: 'abc123def456',
            coreInstructions: 'You are an ordering assistant.',
            tools: '[]',
            storeData: '## Menu',
            createdAt: AT,
          },
        ],
      },
    );
    const repository = repositoryStub({
      findById: vi.fn().mockResolvedValue(stored),
    });
    const service = createAiOrderingReviewService({ repository });

    // Which method was called is the whole access decision: a merchant route
    // cannot reach the prompt by passing a different argument, because there is
    // no argument to pass.
    await expect(
      service.getConversation('store-1', 'ai-conversation-1'),
    ).resolves.not.toHaveProperty('promptPreludes');

    const platform = await service.getConversationWithPrompt(
      'store-1',
      'ai-conversation-1',
    );

    expect(platform.promptPreludes).toHaveLength(1);
    expect(platform.promptPreludes?.[0]?.coreInstructions).toBe(
      'You are an ordering assistant.',
    );
  });

  it('refuses a conversation id that belongs to another store', async () => {
    // The store id is part of the repository lookup, so another store's id
    // resolves to null — which must surface as not-found, never as a document.
    const repository = repositoryStub();
    const service = createAiOrderingReviewService({ repository });

    await expect(
      service.getConversation('store-1', 'ai-conversation-from-store-2'),
    ).rejects.toMatchObject({ code: 'AI_ORDERING_CONVERSATION_NOT_FOUND' });

    expect(repository.findById).toHaveBeenCalledWith({
      storeId: 'store-1',
      conversationId: 'ai-conversation-from-store-2',
    });
  });

  it('returns entries for a conversation containing an unanswered turn', async () => {
    const repository = repositoryStub({
      listUnanswered: vi.fn().mockResolvedValue([
        {
          conversationId: 'ai-conversation-1',
          participantId: 'participant-1',
          turn: turn('turn-2', unansweredResponse),
        },
      ]),
      countUnanswered: vi.fn().mockResolvedValue(1),
    });
    const service = createAiOrderingReviewService({ repository });

    const result = await service.listUnanswered('store-1', {
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(1);
    expect(result.entries).toEqual([
      {
        conversationId: 'ai-conversation-1',
        turnId: 'turn-2',
        participantId: 'participant-1',
        message: '這個有蔥嗎',
        reply: '店家資料中沒有標示是否含蔥。',
        reason: 'missing_product_info',
        productId: 'product-9',
        createdAt: AT.toISOString(),
      },
    ]);
  });

  it('passes a reason filter through to both the page and the count', async () => {
    const repository = repositoryStub();
    const service = createAiOrderingReviewService({ repository });

    await service.listUnanswered('store-1', {
      page: 1,
      pageSize: 20,
      reason: 'missing_product_info',
    });

    // A filtered page with an unfiltered total would paginate against the wrong
    // number.
    expect(repository.listUnanswered).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'missing_product_info' }),
    );
    expect(repository.countUnanswered).toHaveBeenCalledWith({
      storeId: 'store-1',
      reason: 'missing_product_info',
    });
  });
});

describe('a proposal the guest changed before accepting, as a reviewer reads it', () => {
  const tea = (sugarOptionId: string, sugarLabel: string) =>
    ({
      type: 'add_item',
      operationId: 'op-tea',
      summary: `+ 紅茶 ×1 · ${sugarLabel}`,
      item: {
        productId: 'prod-black-tea',
        quantity: 1,
        selectedOptions: [{ modifierId: 'mod-sugar', optionId: sugarOptionId }],
      },
    }) as const;

  const rice = {
    type: 'add_item',
    operationId: 'op-rice',
    summary: '+ 白飯 ×1',
    item: { productId: 'prod-rice', quantity: 1 },
  } as const;

  const proposalTurn = (
    decision: NonNullable<AiOrderingTurnSnapshot['proposal']>['decision'],
  ) => {
    const operations = [tea('opt-sugar-free', '無糖'), rice];

    return turn(
      'turn-1',
      {
        type: 'proposal',
        reply: '幫你加紅茶和白飯。',
        proposalId: 'proposal-1',
        confirmationRequired: true,
        operations,
      },
      {
        proposal: {
          proposalId: 'proposal-1',
          operations,
          ...(decision ? { decision } : {}),
        },
      },
    );
  };

  const results = [
    { operationId: 'op-tea', outcome: 'accepted' as const },
    { operationId: 'op-rice', outcome: 'accepted' as const },
  ];

  it('shows what the assistant proposed beside what the guest applied', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([
        proposalTurn({
          decidedAt: AT,
          results,
          appliedOperations: [tea('opt-sugar-half', '半糖')],
        }),
      ]),
    );

    // One line for the operation that differs, and none for the rice nobody
    // touched: this is a list of what the assistant got wrong, not a second
    // copy of the proposal.
    expect(detail.turns[0]?.guestAdjustments).toEqual([
      {
        operationId: 'op-tea',
        proposed: '+ 紅茶 ×1 · 無糖',
        applied: '+ 紅茶 ×1 · 半糖',
      },
    ]);
  });

  it('still shows the proposal as the assistant made it', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([
        proposalTurn({
          decidedAt: AT,
          results,
          appliedOperations: [tea('opt-sugar-half', '半糖')],
        }),
      ]),
    );
    const response = detail.turns[0]?.response;

    // The correction is added to the record; it does not replace the mistake.
    expect(response?.type === 'proposal' && response.operations[0]).toEqual(
      tea('opt-sugar-free', '無糖'),
    );
  });

  it('reports nothing for a decision the guest did not change', () => {
    expect(
      toAiOrderingConversationDetailDto(
        conversation([proposalTurn({ decidedAt: AT, results })]),
      ).turns[0],
    ).not.toHaveProperty('guestAdjustments');
  });

  it('reports nothing for a proposal nobody has answered', () => {
    expect(
      toAiOrderingConversationDetailDto(conversation([proposalTurn(undefined)]))
        .turns[0],
    ).not.toHaveProperty('guestAdjustments');
  });

  it("gives the guest's own transcript the applied line, and nothing about the proposed one", () => {
    const dto = toAiOrderingGuestConversationDto(
      conversation([
        proposalTurn({
          decidedAt: AT,
          results,
          appliedOperations: [tea('opt-sugar-half', '半糖')],
        }),
      ]),
    );

    // Only the operation that differs: the rice is still described correctly
    // by the proposal the guest already has.
    expect(dto.turns[0]?.proposal).toMatchObject({
      status: 'decided',
      appliedSummaries: [
        { operationId: 'op-tea', summary: '+ 紅茶 ×1 · 半糖' },
      ],
    });
  });

  it("leaves it off the guest's transcript when they changed nothing", () => {
    expect(
      toAiOrderingGuestConversationDto(
        conversation([proposalTurn({ decidedAt: AT, results })]),
      ).turns[0]?.proposal,
    ).not.toHaveProperty('appliedSummaries');
  });

  it('ignores a stored value that is not a list of operations', () => {
    // `Mixed` in Mongo, so the shape is not guaranteed on the way out.
    expect(
      toAiOrderingConversationDetailDto(
        conversation([
          proposalTurn({
            decidedAt: AT,
            results,
            appliedOperations: 'not operations' as never,
          }),
        ]),
      ).turns[0],
    ).not.toHaveProperty('guestAdjustments');
  });
});
