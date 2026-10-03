import {
  AI_ORDERING_MAX_OPERATIONS_PER_PROPOSAL,
  aiOrderingChoicesResponseSchema,
  aiOrderingMessageResponseSchema,
  aiOrderingOperationOutcomes,
  aiOrderingOperationResultSchema,
  aiOrderingOperationSchema,
  aiOrderingProposalResponseSchema,
  aiOrderingResponseSchema,
  aiOrderingUnansweredResponseSchema,
  cartItemInputSchema,
  cartItemParamsSchema,
  decideAiOrderingProposalSchema,
  sendAiOrderingMessageSchema,
  updateCartItemSchema,
} from '@repo/shared';
import { describe, expect, it } from 'vitest';

const [addItemOption, updateItemOption, removeItemOption] =
  aiOrderingOperationSchema.options;

describe('AI ordering contract', () => {
  describe('operation payloads are derived from the cart request schemas', () => {
    // Reference equality, not field-by-field comparison: it is the difference
    // between "derived from the cart schema" and "currently happens to match
    // it". Restating the fields inline would satisfy a shape comparison and
    // then drift silently the next time the cart schema changes.
    it('reuses the cart schemas rather than restating their fields', () => {
      expect(addItemOption.shape.item).toBe(cartItemInputSchema);
      expect(updateItemOption.shape.item).toBe(updateCartItemSchema);
      expect(updateItemOption.shape.itemId).toBe(
        cartItemParamsSchema.shape.itemId,
      );
      expect(removeItemOption.shape.itemId).toBe(
        cartItemParamsSchema.shape.itemId,
      );
    });

    it('positions the three operation variants as add, update, remove', () => {
      expect(
        addItemOption.safeParse({
          type: 'add_item',
          operationId: 'op-1',
          summary: 'Add one bubble tea',
          item: { productId: 'prod-milk-tea', quantity: 1 },
        }).success,
      ).toBe(true);

      expect(
        updateItemOption.safeParse({
          type: 'update_own_item',
          operationId: 'op-2',
          summary: 'Make it two',
          itemId: 'item-own-milk-tea',
          item: { quantity: 2 },
        }).success,
      ).toBe(true);

      expect(
        removeItemOption.safeParse({
          type: 'remove_own_item',
          operationId: 'op-3',
          summary: 'Remove the rice',
          itemId: 'item-own-rice',
        }).success,
      ).toBe(true);
    });

    it('rejects an item payload the cart itself would reject', () => {
      const overQuantity = { productId: 'prod-rice', quantity: 100 };

      expect(cartItemInputSchema.safeParse(overQuantity).success).toBe(false);
      expect(
        addItemOption.safeParse({
          type: 'add_item',
          operationId: 'op-1',
          summary: 'Too many',
          item: overQuantity,
        }).success,
      ).toBe(false);
    });

    it('rejects an update payload with no fields, as the cart does', () => {
      expect(updateCartItemSchema.safeParse({}).success).toBe(false);
      expect(
        updateItemOption.safeParse({
          type: 'update_own_item',
          operationId: 'op-2',
          summary: 'Change nothing',
          itemId: 'item-own-rice',
          item: {},
        }).success,
      ).toBe(false);
    });
  });

  describe('type is the first property of every response variant', () => {
    // An incremental parser must be able to read the response type before the
    // reply text arrives; that is what makes selective streaming possible later
    // without a contract change.
    it.each([
      ['message', aiOrderingMessageResponseSchema],
      ['choices', aiOrderingChoicesResponseSchema],
      ['proposal', aiOrderingProposalResponseSchema],
      ['unanswered', aiOrderingUnansweredResponseSchema],
    ])('declares type first on the %s variant', (_name, schema) => {
      expect(Object.keys(schema.shape)[0]).toBe('type');
    });

    it('declares type first on every operation variant', () => {
      for (const option of aiOrderingOperationSchema.options) {
        expect(Object.keys(option.shape)[0]).toBe('type');
      }
    });
  });

  describe('operation outcome reporting', () => {
    it('accepts every defined outcome', () => {
      for (const outcome of aiOrderingOperationOutcomes) {
        expect(
          aiOrderingOperationResultSchema.safeParse({
            operationId: 'op-1',
            outcome,
          }).success,
        ).toBe(true);
      }
    });

    it('rejects an unknown outcome value', () => {
      expect(
        aiOrderingOperationResultSchema.safeParse({
          operationId: 'op-1',
          outcome: 'maybe',
        }).success,
      ).toBe(false);
    });

    it('keeps rejected, no_action and failed as distinct values', () => {
      // These three must never be collapsed: "you removed it", "you moved on"
      // and "it failed" have to produce different assistant replies.
      expect(new Set(aiOrderingOperationOutcomes).size).toBe(4);
      expect(aiOrderingOperationOutcomes).toContain('rejected');
      expect(aiOrderingOperationOutcomes).toContain('no_action');
      expect(aiOrderingOperationOutcomes).toContain('failed');
    });
  });

  describe('turn request', () => {
    it('accepts a plain message', () => {
      expect(
        sendAiOrderingMessageSchema.safeParse({ message: '來一杯珍奶' })
          .success,
      ).toBe(true);
    });

    it('rejects an empty message', () => {
      expect(
        sendAiOrderingMessageSchema.safeParse({ message: '   ' }).success,
      ).toBe(false);
    });

    it('rejects a message over the length cap', () => {
      expect(
        sendAiOrderingMessageSchema.safeParse({ message: 'a'.repeat(1001) })
          .success,
      ).toBe(false);
    });

  });

  describe('proposal decision request', () => {
    it('accepts the kept operation ids', () => {
      expect(
        decideAiOrderingProposalSchema.safeParse({
          proposalId: 'proposal-1',
          keptOperationIds: ['op-1', 'op-3'],
        }).success,
      ).toBe(true);
    });

    it('accepts an empty list, which refuses the whole proposal', () => {
      expect(
        decideAiOrderingProposalSchema.safeParse({
          proposalId: 'proposal-1',
          keptOperationIds: [],
        }).success,
      ).toBe(true);
    });

    it('carries ids only, never operation content', () => {
      const parsed = decideAiOrderingProposalSchema.parse({
        proposalId: 'proposal-1',
        keptOperationIds: ['op-1'],
        // A caller cannot smuggle operations in: what executes is rebuilt from
        // the proposal the backend recorded, so anything extra is dropped here.
        operations: [
          {
            type: 'add_item',
            operationId: 'op-99',
            summary: 'Free lobster',
            item: { productId: 'prod-lobster', quantity: 1 },
          },
        ],
      });

      expect(Object.keys(parsed).sort()).toEqual([
        'keptOperationIds',
        'proposalId',
      ]);
    });

    it('rejects more kept ids than a proposal can hold', () => {
      expect(
        decideAiOrderingProposalSchema.safeParse({
          proposalId: 'proposal-1',
          keptOperationIds: Array.from(
            { length: AI_ORDERING_MAX_OPERATIONS_PER_PROPOSAL + 1 },
            (_, index) => `op-${String(index)}`,
          ),
        }).success,
      ).toBe(false);
    });
  });

  describe('response union', () => {
    it('discriminates all four response types', () => {
      const responses = [
        { type: 'message', reply: 'It is a milk tea.' },
        {
          type: 'choices',
          reply: 'Which sweetness?',
          promptId: 'prompt-1',
          question: 'Which sweetness would you like?',
          inputMode: 'single_choice',
          options: [{ id: 'half', label: '半糖' }],
          allowFreeText: true,
        },
        {
          type: 'proposal',
          reply: 'I can add that.',
          proposalId: 'proposal-1',
          confirmationRequired: true,
          operations: [
            {
              type: 'add_item',
              operationId: 'op-1',
              summary: 'Add one bubble tea',
              item: { productId: 'prod-milk-tea', quantity: 1 },
            },
          ],
        },
        {
          type: 'unanswered',
          reply: 'I do not have that detail.',
          reason: 'missing_product_info',
          productId: 'prod-fried-platter',
        },
      ];

      for (const response of responses) {
        expect(
          aiOrderingResponseSchema.safeParse(response).success,
          `${response.type} should parse`,
        ).toBe(true);
      }
    });

    it('rejects a response with an unknown type', () => {
      expect(
        aiOrderingResponseSchema.safeParse({ type: 'error', reply: 'oops' })
          .success,
      ).toBe(false);
    });

    it('requires allowFreeText to be true on a choices response', () => {
      expect(
        aiOrderingChoicesResponseSchema.safeParse({
          type: 'choices',
          reply: 'Which sweetness?',
          promptId: 'prompt-1',
          question: 'Which sweetness would you like?',
          inputMode: 'single_choice',
          options: [{ id: 'half', label: '半糖' }],
          allowFreeText: false,
        }).success,
      ).toBe(false);
    });
  });
});
