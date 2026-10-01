import { describe, expect, it, vi } from 'vitest';

import {
  toAiOrderingConversationDetailDto,
  toAiOrderingConversationSummaryDto,
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
  it('never exposes the raw provider output', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([turn('turn-1', { type: 'message', reply: '好的。' })]),
    );

    // `modelOutput` is kept for replay and evaluation. It is not a stable shape
    // and a backstage reader must not come to depend on it.
    expect(JSON.stringify(detail)).not.toContain('provider internals');
    expect(detail.turns[0]).not.toHaveProperty('modelOutput');
  });

  it('exposes the quality signals that explain a turn', () => {
    const detail = toAiOrderingConversationDetailDto(
      conversation([
        turn('turn-1', { type: 'message', reply: '好的。' }, {
          quality: {
            repairAttempted: true,
            repairSucceeded: false,
            droppedOperationCount: 2,
            ownershipViolationCount: 1,
          },
        }),
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
    expect(toAiOrderingConversationSummaryDto(conversation([]))).not.toHaveProperty(
      'lastTurnAt',
    );
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
    overrides: Partial<Parameters<typeof createAiOrderingReviewService>[0]['repository']> = {},
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
