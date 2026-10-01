import { describe, expect, it } from 'vitest';

import { aiOrderingModel } from '@/models/aiOrdering';

import { createAiOrderingConversationsActions } from './conversations/actions';
import { createAiOrderingConversationsStore } from './conversations/store';
import { createAiOrderingUnansweredActions } from './unanswered/actions';
import { createAiOrderingUnansweredStore } from './unanswered/store';

import type { AiOrderingReviewTurnDtoType } from '@/models/aiOrdering';

const AT = '2026-10-01T03:00:00.000Z';

function turnDto(
  overrides: Partial<AiOrderingReviewTurnDtoType> = {},
): AiOrderingReviewTurnDtoType {
  return {
    id: 'turn-1',
    message: '這個有蔥嗎',
    response: { type: 'message', reply: '有的。' },
    versionId: 'v1-2026-09-30',
    versionFingerprint: 'fingerprint-1',
    provider: 'gemini',
    modelName: 'test-model',
    repairAttempted: false,
    droppedOperationCount: 0,
    ownershipViolationCount: 0,
    createdAt: AT,
    ...overrides,
  };
}

describe('merchant AI ordering deserialize', () => {
  it('keeps the quality signals that explain a turn', () => {
    const turn = aiOrderingModel.deserializeReviewTurn(
      turnDto({
        repairAttempted: true,
        repairSucceeded: false,
        droppedOperationCount: 2,
        ownershipViolationCount: 1,
      }),
    );

    expect(turn).toMatchObject({
      repairAttempted: true,
      repairSucceeded: false,
      droppedOperationCount: 2,
      ownershipViolationCount: 1,
    });
  });

  it('omits repairSucceeded when no repair ran', () => {
    expect(
      aiOrderingModel.deserializeReviewTurn(turnDto()),
    ).not.toHaveProperty('repairSucceeded');
  });

  it('carries the version fingerprint beside the version id', () => {
    // A draft version's prompt may have moved between two turns sharing an id.
    expect(
      aiOrderingModel.deserializeReviewTurn(turnDto()).versionFingerprint,
    ).toBe('fingerprint-1');
  });

  it('keeps the product reference on an unanswered entry that names one', () => {
    expect(
      aiOrderingModel.deserializeUnansweredEntry({
        conversationId: 'conv-1',
        turnId: 'turn-1',
        participantId: 'participant-1',
        message: '這個有蔥嗎',
        reply: '資料沒有標示。',
        reason: 'missing_product_info',
        productId: 'product-9',
        createdAt: AT,
      }).productId,
    ).toBe('product-9');
  });

  it('omits the product when the reason does not identify one', () => {
    expect(
      aiOrderingModel.deserializeUnansweredEntry({
        conversationId: 'conv-1',
        turnId: 'turn-1',
        participantId: 'participant-1',
        message: '今天天氣如何',
        reply: '這不在我能回答的範圍。',
        reason: 'out_of_scope',
        createdAt: AT,
      }),
    ).not.toHaveProperty('productId');
  });

  it('omits lastTurnAt on a conversation that has none', () => {
    expect(
      aiOrderingModel.deserializeConversationSummary({
        id: 'conv-1',
        cartId: 'cart-1',
        participantId: 'participant-1',
        turnCount: 0,
        unansweredCount: 0,
        createdAt: AT,
        updatedAt: AT,
      }),
    ).not.toHaveProperty('lastTurnAt');
  });
});

describe('merchant AI ordering conversations store', () => {
  function setup() {
    const store = createAiOrderingConversationsStore();
    return { store, actions: createAiOrderingConversationsActions(store) };
  }

  it('clears the open conversation on leaving', () => {
    const { store, actions } = setup();

    actions.detailLoaded({
      id: 'conv-1',
      storeId: 'store-1',
      cartId: 'cart-1',
      participantId: 'participant-1',
      turns: [],
      createdAt: AT,
      updatedAt: AT,
    });
    expect(store.getState().detail).not.toBeNull();

    actions.detailCleared();

    // Otherwise the next conversation flashes this one while it loads.
    expect(store.getState().detail).toBeNull();
  });

  it('a load failure stops the spinner and records the message', () => {
    const { store, actions } = setup();

    actions.loadStarted();
    actions.loadFailed('Could not reach the API.');

    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().error).toBe('Could not reach the API.');
  });
});

describe('merchant AI ordering unanswered store', () => {
  it('stores the filter alongside the page it produced', () => {
    const store = createAiOrderingUnansweredStore();
    const actions = createAiOrderingUnansweredActions(store);

    actions.loaded({
      entries: [],
      total: 0,
      page: 1,
      pageSize: 20,
      reason: 'missing_product_info',
    });

    // The filter and the rows on screen must never disagree about what is being
    // shown.
    expect(store.getState().reason).toBe('missing_product_info');
  });
});
