import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_MENU_FIXTURE,
  aiOrderingModelReplyFor,
} from './fixtures/aiOrdering.js';
import { hydrateAiOrderingResponse } from '../src/modules/aiOrdering/modelResponse.js';
import { inspectAiOrderingModelOutput } from '../src/modules/aiOrdering/outputGate.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type { AiOrderingModelResponse } from '../src/modules/aiOrdering/modelResponse.js';

const config = AI_ORDERING_V1_2026_09_30;

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${++idCounter}`;

const hydrationContext = {
  confirmationRequired: true,
  newId,
  label: {
    menu: AI_ORDERING_MENU_FIXTURE,
    cart: AI_ORDERING_CART_FIXTURE,
    locale: 'zh-TW' as const,
  },
};

function gate(output: unknown) {
  return inspectAiOrderingModelOutput(output, config);
}

/** Gates the answer as the model would have delivered it: as a tool call. */
function gateAnswer(response: Parameters<typeof aiOrderingModelReplyFor>[0]) {
  return gate(aiOrderingModelReplyFor(response));
}

describe('AI ordering output gate', () => {
  describe('rejects hostile or malformed model output', () => {
    it('rejects a tool call whose arguments are missing the reply', () => {
      const result = gate({
        toolCalls: [{ name: 'propose_cart_operations', args: {} }],
        text: '',
      });

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.rejection.code).toBe(
        'schema_invalid',
      );
    });

    it('rejects a tool nobody bound', () => {
      const result = gate({
        toolCalls: [{ name: 'error_fallback', args: { reply: 'oops' } }],
        text: '',
      });

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.rejection.code).toBe('no_tool_call');
    });

    it('rejects provider output that is not a reply at all', () => {
      // A defect on our side of the boundary rather than a model mistake: the
      // runtime always produces both fields.
      expect(gate('not a reply').ok).toBe(false);
      expect(gate({ nonsense: true }).ok).toBe(false);
    });

    it('rejects an operation whose payload has the wrong shape', () => {
      const result = gateAnswer({
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
      const result = gateAnswer({
        type: 'message',
        reply: 'a'.repeat(config.maxReplyCharacters + 1),
      });

      expect(result.ok).toBe(false);
      expect(result.ok === false && result.rejection.code).toBe(
        'reply_too_long',
      );
    });

    it('rejects more operations than the version allows', () => {
      const result = gateAnswer({
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
      const result = gateAnswer({
        type: 'proposal',
        reply: 'Submitting your order.',
        operations: [{ type: 'submit_order', summary: 'Submit' }],
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('accepts well-formed model output', () => {
    it('accepts each of the four response types', () => {
      const outputs: Parameters<typeof aiOrderingModelReplyFor>[0][] = [
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
        expect(gateAnswer(output).ok, JSON.stringify(output)).toBe(true);
      }
    });
  });

  describe('backend-owned fields are never taken from the model', () => {
    it('ignores a confirmationRequired the model tried to set', () => {
      // This is the field that matters most: a model-supplied `false` would skip
      // a store's confirmation step, which only the store setting and the
      // version's own permission may do.
      const result = gateAnswer({
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
        hydrationContext,
      );

      expect(
        hydrated.type === 'proposal' && hydrated.confirmationRequired,
      ).toBe(true);
    });

    it('keeps each further question once, dropping a repeat of the first', () => {
      const hydrated = hydrateAiOrderingResponse(
        {
          type: 'choices',
          reply: '紅茶需要選甜度和冰塊。',
          question: '甜度？',
          inputMode: 'single_choice',
          options: [{ label: '全糖' }, { label: '半糖' }],
          additionalQuestions: [
            // The model tends to list the first question again here.
            {
              question: '請選擇甜度',
              options: [{ label: '半糖' }, { label: '全糖' }],
            },
            {
              question: '冰塊？',
              options: [{ label: '正常冰' }, { label: '去冰' }],
            },
          ],
        },
        hydrationContext,
      );

      expect(
        hydrated.type === 'choices' && hydrated.additionalQuestions,
      ).toEqual([
        {
          question: '冰塊？',
          options: [
            { id: 'question-2-option-1', label: '正常冰' },
            { id: 'question-2-option-2', label: '去冰' },
          ],
        },
      ]);
    });

    it('assigns its own proposal and operation ids', () => {
      const result = gateAnswer({
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
        hydrationContext,
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
      const result = gateAnswer({
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
        hydrationContext,
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

describe('AI ordering tool-call transport', () => {
  it('maps each tool name onto its response type', () => {
    const cases: [string, unknown, string][] = [
      [
        'propose_cart_operations',
        {
          reply: '幫你加一份白飯。',
          operations: [
            {
              type: 'add_item',
              summary: '白飯 x1',
              item: { productId: 'prod-rice', quantity: 1 },
            },
          ],
        },
        'proposal',
      ],
      [
        'ask_choice',
        {
          reply: '要什麼甜度？',
          question: '要什麼甜度？',
          inputMode: 'single_choice',
          options: [{ label: '半糖' }],
        },
        'choices',
      ],
      [
        'report_unanswerable',
        { reply: '這個我查不到。', reason: 'missing_product_info' },
        'unanswered',
      ],
    ];

    for (const [name, args, expected] of cases) {
      const result = gate({ toolCalls: [{ name, args }], text: '' });

      expect(result.ok, name).toBe(true);
      expect(result.ok === true && result.modelResponse.type).toBe(expected);
    }
  });

  it('uses the question as the reply when a question came without one', () => {
    const result = gate({
      toolCalls: [
        {
          name: 'ask_choice',
          args: {
            question: '要什麼甜度？',
            inputMode: 'single_choice',
            options: [{ label: '半糖' }],
          },
        },
      ],
      text: '',
    });

    expect(result.ok && result.modelResponse.reply).toBe('要什麼甜度？');
  });

  it('reads an empty note on an added item as no note', () => {
    // On an update `null` erases a note, and the model sends it on additions
    // too. There it can only mean "none", so it is not worth a repair call.
    const result = gate({
      toolCalls: [
        {
          name: 'propose_cart_operations',
          args: {
            reply: '這是紅茶，請確認。',
            operations: [
              {
                type: 'add_item',
                item: { productId: 'prod-black-tea', quantity: 1, notes: null },
              },
              {
                type: 'update_own_item',
                itemId: 'item-own-rice',
                item: { notes: null },
              },
            ],
          },
        },
      ],
      text: '',
    });

    expect(result.ok).toBe(true);

    if (result.ok && result.modelResponse.type === 'proposal') {
      expect(result.modelResponse.operations[0]).toEqual({
        type: 'add_item',
        item: { productId: 'prod-black-tea', quantity: 1 },
      });
      // An update's null is an instruction and is left exactly as sent.
      expect(result.modelResponse.operations[1]).toEqual({
        type: 'update_own_item',
        itemId: 'item-own-rice',
        item: { notes: null },
      });
    }
  });

  it('reads a plain-text reply as a message', () => {
    // The fourth answer is the one the model gives by calling no tool, so there
    // is no `reply` tool to get wrong.
    const result = gate({ toolCalls: [], text: '珍珠奶茶是紅茶加鮮奶。' });

    if (!result.ok) {
      throw new Error('expected a usable message');
    }

    expect(result.modelResponse).toEqual({
      type: 'message',
      reply: '珍珠奶茶是紅茶加鮮奶。',
    });
  });

  it('rejects a reply that called no tool and said nothing', () => {
    // A bound tool is a request, not a guarantee: unlike a response schema,
    // nothing forces the model to produce one of the four answers.
    const result = gate({ toolCalls: [], text: '   ' });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.rejection.code).toBe('no_tool_call');
  });

  it('rejects two tools called at once', () => {
    const result = gate({
      toolCalls: [
        { name: 'ask_choice', args: {} },
        { name: 'report_unanswerable', args: {} },
      ],
      text: '',
    });

    // A turn has exactly one answer. Picking one of the two would silently drop
    // an intent the model expressed.
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.rejection.code).toBe(
      'ambiguous_tool_call',
    );
  });

  it('ignores free text that arrives alongside a tool call', () => {
    const result = gate({
      toolCalls: [
        {
          name: 'report_unanswerable',
          args: { reply: '這個我查不到。', reason: 'missing_product_info' },
        },
      ],
      text: 'thinking out loud',
    });

    if (!result.ok) {
      throw new Error('expected the tool call to be used');
    }

    // The guest sees the tool's own `reply`, so there is exactly one place it
    // comes from.
    expect(result.modelResponse.reply).toBe('這個我查不到。');
  });

  it('ignores a type the model put in the tool arguments', () => {
    const result = gate({
      toolCalls: [
        {
          name: 'report_unanswerable',
          args: {
            type: 'message',
            reply: '這個我查不到。',
            reason: 'missing_product_info',
          },
        },
      ],
      text: '',
    });

    // The tool NAME is the discriminator. An argument that contradicts it must
    // not win, or the model could answer as one type while calling another.
    expect(result.ok === true && result.modelResponse.type).toBe('unanswered');
  });
});
