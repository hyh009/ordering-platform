import { describe, expect, it } from 'vitest';

import { hydrateAiOrderingResponse } from '../src/modules/aiOrdering/modelResponse.js';
import { inspectAiOrderingModelOutput } from '../src/modules/aiOrdering/outputGate.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type { AiOrderingModelResponse } from '../src/modules/aiOrdering/modelResponse.js';

const config = AI_ORDERING_V1_2026_09_30;

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${++idCounter}`;

function gate(output: unknown) {
  return inspectAiOrderingModelOutput(output, config);
}

describe('AI ordering output gate', () => {
  describe('rejects hostile or malformed model output', () => {
    it('rejects output with no type', () => {
      const result = gate({ reply: 'Sure thing.' });

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.rejection.code).toBe(
        'schema_invalid',
      );
    });

    it('rejects an unknown response type', () => {
      const result = gate({ type: 'error_fallback', reply: 'oops' });

      expect(result.ok).toBe(false);
    });

    it('rejects an operation whose payload has the wrong shape', () => {
      const result = gate({
        type: 'proposal',
        reply: 'Adding that now.',
        operations: [
          {
            type: 'add_item',
            summary: 'Add rice',
            item: { productId: 'prod-rice', quantity: 'two' },
          },
        ],
      });

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.rejection.code).toBe(
        'schema_invalid',
      );
    });

    it('rejects a reply longer than the version allows', () => {
      const result = gate({
        type: 'message',
        reply: 'a'.repeat(config.maxReplyCharacters + 1),
      });

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.rejection.code).toBe(
        'reply_too_long',
      );
    });

    it('rejects more operations than the version allows', () => {
      const result = gate({
        type: 'proposal',
        reply: 'Quite a lot.',
        operations: Array.from(
          { length: config.maxOperationsPerProposal + 1 },
          () => ({
            type: 'add_item',
            summary: 'Add rice',
            item: { productId: 'prod-rice', quantity: 1 },
          }),
        ),
      });

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.rejection.code).toBe(
        'too_many_operations',
      );
    });

    it('rejects an operation type that would place an order', () => {
      // Ordering stays a human action. There is no such operation in the model
      // contract, so the attempt cannot even be expressed.
      const result = gate({
        type: 'proposal',
        reply: 'Submitting your order.',
        operations: [{ type: 'submit_order', summary: 'Submit' }],
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('accepts well-formed model output', () => {
    it('accepts each of the four response types', () => {
      const outputs: unknown[] = [
        { type: 'message', reply: '珍珠奶茶是錫蘭紅茶加鮮奶。' },
        {
          type: 'choices',
          reply: '要什麼甜度？',
          question: '要什麼甜度？',
          inputMode: 'single_choice',
          options: [{ label: '半糖' }, { label: '無糖' }],
        },
        {
          type: 'proposal',
          reply: '幫你加一份白飯。',
          operations: [
            {
              type: 'add_item',
              summary: '白飯 x1',
              item: { productId: 'prod-rice', quantity: 1 },
            },
          ],
        },
        {
          type: 'unanswered',
          reply: '這個我查不到。',
          reason: 'missing_product_info',
        },
      ];

      for (const output of outputs) {
        expect(gate(output).ok, JSON.stringify(output)).toBe(true);
      }
    });
  });

  describe('backend-owned fields are never taken from the model', () => {
    it('ignores a confirmationRequired the model tried to set', () => {
      // This is the field that matters most: a model-supplied `false` would skip
      // a store's confirmation step, which only the store setting and the
      // version's own permission may do.
      const result = gate({
        type: 'proposal',
        reply: 'Adding that.',
        confirmationRequired: false,
        operations: [
          {
            type: 'add_item',
            summary: 'Add rice',
            item: { productId: 'prod-rice', quantity: 1 },
          },
        ],
      });

      expect(result.ok).toBe(true);

      const hydrated = hydrateAiOrderingResponse(
        (result as { ok: true; modelResponse: AiOrderingModelResponse })
          .modelResponse,
        { confirmationRequired: true, newId },
      );

      expect(
        hydrated.type === 'proposal' && hydrated.confirmationRequired,
      ).toBe(true);
    });

    it('assigns its own proposal and operation ids', () => {
      const result = gate({
        type: 'proposal',
        reply: 'Two things.',
        proposalId: 'proposal-chosen-by-the-model',
        operations: [
          {
            type: 'add_item',
            summary: 'Add rice',
            operationId: 'op-chosen-by-the-model',
            item: { productId: 'prod-rice', quantity: 1 },
          },
          {
            type: 'remove_own_item',
            summary: 'Remove the tea',
            itemId: 'item-own-milk-tea',
          },
        ],
      });

      expect(result.ok).toBe(true);

      const hydrated = hydrateAiOrderingResponse(
        (result as { ok: true; modelResponse: AiOrderingModelResponse })
          .modelResponse,
        { confirmationRequired: true, newId },
      );

      if (hydrated.type !== 'proposal') {
        throw new Error('expected a proposal');
      }

      expect(hydrated.proposalId).not.toBe('proposal-chosen-by-the-model');
      expect(
        hydrated.operations.map((operation) => operation.operationId),
      ).toEqual(['op-1', 'op-2']);
    });

    it('assigns choice option ids and always allows free text', () => {
      const result = gate({
        type: 'choices',
        reply: '要什麼甜度？',
        question: '要什麼甜度？',
        inputMode: 'single_choice',
        options: [
          { label: '半糖' },
          { label: '無糖', description: '完全不加糖' },
        ],
        allowFreeText: false,
      });

      expect(result.ok).toBe(true);

      const hydrated = hydrateAiOrderingResponse(
        (result as { ok: true; modelResponse: AiOrderingModelResponse })
          .modelResponse,
        { confirmationRequired: true, newId },
      );

      if (hydrated.type !== 'choices') {
        throw new Error('expected choices');
      }

      // Answering by typing is never something the model gets to switch off.
      expect(hydrated.allowFreeText).toBe(true);
      expect(hydrated.options.map((option) => option.id)).toEqual([
        'option-1',
        'option-2',
      ]);
      expect(hydrated.options[1]?.description).toBe('完全不加糖');
    });
  });
});
