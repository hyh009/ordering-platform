import { describe, expect, it } from 'vitest';

import { aiOrderingModel } from './model';

import type { AiOrderingResponseDtoType } from './types';

describe('aiOrderingModel.deserializeResponse', () => {
  it('maps a message response', () => {
    expect(
      aiOrderingModel.deserializeResponse({
        type: 'message',
        reply: 'Bubble tea is black tea with milk.',
      }),
    ).toEqual({ type: 'message', reply: 'Bubble tea is black tea with milk.' });
  });

  it('maps a choices response and keeps the free-text flag', () => {
    const dto: AiOrderingResponseDtoType = {
      type: 'choices',
      reply: 'Which size?',
      promptId: 'prompt-1',
      question: 'Which size would you like?',
      inputMode: 'single_choice',
      options: [
        { id: 'option-1', label: 'Medium' },
        { id: 'option-2', label: 'Large', description: 'Plus NT$10' },
      ],
      allowFreeText: true,
    };

    expect(aiOrderingModel.deserializeResponse(dto)).toEqual(dto);
  });

  it('maps a proposal response across all three operation types', () => {
    const dto: AiOrderingResponseDtoType = {
      type: 'proposal',
      reply: 'Here is what I would change.',
      proposalId: 'proposal-1',
      confirmationRequired: true,
      operations: [
        {
          type: 'add_item',
          operationId: 'op-1',
          summary: 'Add 1 bubble tea',
          item: {
            productId: 'product-1',
            quantity: 1,
            selectedOptions: [{ modifierId: 'mod-1', optionId: 'opt-1' }],
            notes: 'Less ice',
          },
        },
        {
          type: 'update_own_item',
          operationId: 'op-2',
          summary: 'Change to 2 portions',
          itemId: 'item-1',
          item: { quantity: 2 },
        },
        {
          type: 'remove_own_item',
          operationId: 'op-3',
          summary: 'Remove the rice',
          itemId: 'item-2',
        },
      ],
    };

    expect(aiOrderingModel.deserializeResponse(dto)).toEqual(dto);
  });

  it('maps an unanswered response and omits an absent product id', () => {
    const deserialized = aiOrderingModel.deserializeResponse({
      type: 'unanswered',
      reply: 'I cannot tell from the menu.',
      reason: 'missing_product_info',
    });

    expect(deserialized).toEqual({
      type: 'unanswered',
      reply: 'I cannot tell from the menu.',
      reason: 'missing_product_info',
    });
    // The merchant review surface branches on presence, so an absent id must not
    // arrive as an explicit `undefined` key.
    expect(deserialized).not.toHaveProperty('productId');
  });

  it('keeps the product id when the reason names one', () => {
    expect(
      aiOrderingModel.deserializeResponse({
        type: 'unanswered',
        reply: 'The menu does not say.',
        reason: 'missing_product_info',
        productId: 'product-9',
      }),
    ).toMatchObject({ productId: 'product-9' });
  });

  it('drops a field the contract does not declare', () => {
    const deserialized = aiOrderingModel.deserializeResponse({
      type: 'message',
      reply: 'Sure.',
      // A server-side addition must not reach the panel until deserialize
      // allows it through.
      internalScore: 0.9,
    } as AiOrderingResponseDtoType);

    expect(deserialized).not.toHaveProperty('internalScore');
  });
});

describe('aiOrderingModel.deserializeTurn', () => {
  it('carries the version id beside the response', () => {
    expect(
      aiOrderingModel.deserializeTurn({
        versionId: 'v1-2026-09-30',
        response: { type: 'message', reply: 'Sure.' },
      }),
    ).toEqual({
      versionId: 'v1-2026-09-30',
      response: { type: 'message', reply: 'Sure.' },
    });
  });
});

describe('aiOrderingModel.deserializeTranscript', () => {
  it('rebuilds each stored turn with both halves of the exchange', () => {
    expect(
      aiOrderingModel.deserializeTranscript({
        turns: [
          {
            id: 'turn-1',
            message: 'Anything good?',
            versionId: 'v1-2026-09-30',
            createdAt: '2026-10-01T00:00:00.000Z',
            response: { type: 'message', reply: 'The tea is popular.' },
          },
        ],
      }),
    ).toEqual([
      {
        id: 'turn-1',
        message: 'Anything good?',
        versionId: 'v1-2026-09-30',
        createdAt: '2026-10-01T00:00:00.000Z',
        response: { type: 'message', reply: 'The tea is popular.' },
      },
    ]);
  });

  it('drops a field the guest DTO was never meant to carry', () => {
    const [turn] = aiOrderingModel.deserializeTranscript({
      turns: [
        {
          id: 'turn-1',
          message: 'Anything good?',
          versionId: 'v1-2026-09-30',
          createdAt: '2026-10-01T00:00:00.000Z',
          response: { type: 'message', reply: 'The tea is popular.' },
          // The merchant's view of this turn has a fingerprint. If one ever
          // leaked into the guest's, it still stops here.
          versionFingerprint: 'abc123',
        },
      ],
    } as unknown as Parameters<
      typeof aiOrderingModel.deserializeTranscript
    >[0]);

    expect(turn).not.toHaveProperty('versionFingerprint');
  });

  it('returns an empty transcript for a guest with no turns', () => {
    expect(aiOrderingModel.deserializeTranscript({ turns: [] })).toEqual([]);
  });
});

describe('aiOrderingModel.deserializeReviewTurn', () => {
  const reviewTurn = {
    id: 'turn-1',
    message: '幫我加辣',
    response: { type: 'message', reply: '好的，幫你備註加辣。' },
    versionId: 'v1-2026-09-30',
    versionFingerprint: 'abc123',
    provider: 'gemini',
    modelName: 'test-model',
    repairAttempted: false,
    droppedOperationCount: 0,
    ownershipViolationCount: 0,
    createdAt: '2026-10-01T00:00:00.000Z',
  } as const;

  it('carries what the model answered through to the review surface', () => {
    const turn = aiOrderingModel.deserializeReviewTurn({
      ...reviewTurn,
      modelOutput: {
        toolCalls: [
          { name: 'propose_cart_operations', args: { operations: [] } },
        ],
        text: '',
      },
    });

    // Untouched on purpose: a reviewer comparing the reply against the cart is
    // reading the arguments the model sent, not this layer's reading of them.
    expect(turn.modelOutput).toEqual({
      toolCalls: [
        { name: 'propose_cart_operations', args: { operations: [] } },
      ],
      text: '',
    });
  });

  it('leaves the field off a turn that recorded no output', () => {
    expect(
      aiOrderingModel.deserializeReviewTurn(reviewTurn),
    ).not.toHaveProperty('modelOutput');
  });
});
