import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_MENU_FIXTURE,
  aiOrderingModelReplyFor,
} from './fixtures/aiOrdering.js';
import { buildAiOrderingContext } from '../src/modules/aiOrdering/context.js';
import { planAiOrderingTurn } from '../src/modules/aiOrdering/planner.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type {
  AiOrderingModelCall,
  AiOrderingPlanInput,
} from '../src/modules/aiOrdering/planner.js';

const config = AI_ORDERING_V1_2026_09_30;

const context = buildAiOrderingContext({
  config,
  locale: 'zh-TW',
  storeName: '測試小館',
  menu: AI_ORDERING_MENU_FIXTURE,
  cart: AI_ORDERING_CART_FIXTURE,
  participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  message: '幫我點餐',
  history: [],
});

function stubModel(outputs: unknown[]) {
  const calls: AiOrderingModelCall[] = [];

  return {
    calls,
    callModel: async (call: AiOrderingModelCall) => {
      calls.push(call);
      return outputs[calls.length - 1];
    },
  };
}

/**
 * The model's answers, as the tool-calling transport delivers them.
 *
 * A plain object with a `type` is written as the tool call that carries it; a
 * reply that is deliberately unusable is passed through untouched.
 */
function asModelReplies(answers: unknown[]): unknown[] {
  return answers.map((answer) =>
    typeof answer === 'object' &&
    answer !== null &&
    'type' in answer &&
    typeof (answer as { type: unknown }).type === 'string'
      ? aiOrderingModelReplyFor(
          answer as Parameters<typeof aiOrderingModelReplyFor>[0],
        )
      : answer,
  );
}

function planInput(
  outputs: unknown[],
  overrides: Partial<AiOrderingPlanInput> = {},
) {
  const model = stubModel(asModelReplies(outputs));
  let counter = 0;

  const input: AiOrderingPlanInput = {
    config,
    context,
    validation: {
      menu: AI_ORDERING_MENU_FIXTURE,
      cart: AI_ORDERING_CART_FIXTURE,
      participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
    },
    confirmationRequired: true,
    callModel: model.callModel,
    newId: (prefix: string) => `${prefix}-${++counter}`,
    ...overrides,
  };

  return { input, model };
}

const addRice = {
  type: 'add_item',
  summary: '白飯 x1',
  item: { productId: 'prod-rice', quantity: 1 },
};

const addSoldOutChicken = {
  type: 'add_item',
  summary: '香雞排 x1',
  item: { productId: 'prod-fried-chicken', quantity: 1 },
};

const removeOthersItem = {
  type: 'remove_own_item',
  summary: '移除牛肉麵',
  itemId: 'item-other-beef',
};

describe('AI ordering turn planning', () => {
  describe('one model call on the happy path', () => {
    it('does not repair a valid response', async () => {
      const { input, model } = planInput([
        {
          type: 'proposal',
          reply: '幫你加一份白飯。',
          operations: [addRice],
        },
      ]);

      const result = await planAiOrderingTurn(input);

      expect(model.calls).toHaveLength(1);
      expect(result.ok).toBe(true);
      expect(result.quality.repairAttempted).toBe(false);
      expect(result.quality.repairSucceeded).toBeUndefined();
      expect(result.quality.droppedOperationCount).toBe(0);
    });

    it('sends no repair note on the first call', async () => {
      const { input, model } = planInput([
        { type: 'message', reply: '珍珠奶茶是紅茶加鮮奶。' },
      ]);

      await planAiOrderingTurn(input);

      expect(model.calls[0]?.repairNote).toBeUndefined();
    });
  });

  describe('at most one repair', () => {
    it('gives the model one correction when an operation is invalid', async () => {
      const { input, model } = planInput([
        {
          type: 'proposal',
          reply: '幫你加香雞排。',
          operations: [addSoldOutChicken],
        },
        { type: 'proposal', reply: '那改成白飯。', operations: [addRice] },
      ]);

      const result = await planAiOrderingTurn(input);

      expect(model.calls).toHaveLength(2);
      expect(result.quality.repairAttempted).toBe(true);
      expect(result.quality.repairSucceeded).toBe(true);
      expect(result.ok && result.response.type).toBe('proposal');
    });

    it('tells the model which change failed and why', async () => {
      const { input, model } = planInput([
        {
          type: 'proposal',
          reply: '幫你加香雞排。',
          operations: [addRice, addSoldOutChicken],
        },
        { type: 'proposal', reply: '只加白飯。', operations: [addRice] },
      ]);

      await planAiOrderingTurn(input);

      const repairNote = model.calls[1]?.repairNote ?? '';

      expect(repairNote).toContain('change #2');
      expect(repairNote).toContain('sold out');
    });

    it('repairs a reply that called no tool and said nothing', async () => {
      const { input, model } = planInput([
        { toolCalls: [], text: '' },
        { type: 'message', reply: '好的。' },
      ]);

      const result = await planAiOrderingTurn(input);

      // Binding a tool does not force the model to call one, so an empty reply is
      // a real outcome and gets the same single correction a malformed one does.
      expect(model.calls).toHaveLength(2);
      expect(model.calls[1]?.repairNote).toContain('no tool');
      expect(result.quality.repairAttempted).toBe(true);
      expect(result.ok && result.response.type).toBe('message');
    });

    it('never makes a third call when the repair also fails', async () => {
      const { input, model } = planInput([
        {
          type: 'proposal',
          reply: '香雞排。',
          operations: [addSoldOutChicken],
        },
        {
          type: 'proposal',
          reply: '還是香雞排。',
          operations: [addSoldOutChicken],
        },
      ]);

      const result = await planAiOrderingTurn(input);

      // A model that gets it wrong again after an explicit correction has a
      // version defect, not a transient failure. Retrying only makes the guest
      // wait longer for the same answer.
      expect(model.calls).toHaveLength(2);
      expect(result.quality.repairSucceeded).toBe(false);
    });
  });

  describe('degradation', () => {
    it('keeps the valid operations and drops the invalid ones', async () => {
      const { input } = planInput([
        {
          type: 'proposal',
          reply: '兩樣東西。',
          operations: [addRice, addSoldOutChicken],
        },
        {
          type: 'proposal',
          reply: '兩樣東西。',
          operations: [addRice, addSoldOutChicken],
        },
      ]);

      const result = await planAiOrderingTurn(input);

      if (!result.ok || result.response.type !== 'proposal') {
        throw new Error('expected a proposal');
      }

      expect(result.response.operations).toHaveLength(1);
      expect(result.quality.droppedOperationCount).toBe(1);
    });

    it("falls back to the model's own reply when nothing survives", async () => {
      const { input } = planInput([
        {
          type: 'proposal',
          reply: '這個好像賣完了。',
          operations: [addSoldOutChicken],
        },
        {
          type: 'proposal',
          reply: '這個好像賣完了。',
          operations: [addSoldOutChicken],
        },
      ]);

      const result = await planAiOrderingTurn(input);

      if (!result.ok) {
        throw new Error('expected a usable result');
      }

      // The model's wording already matches the guest's language; a
      // backend-authored fallback string would not.
      expect(result.response.type).toBe('message');
      expect(result.response.reply).toBe('這個好像賣完了。');
    });

    it('reports unusable output when nothing parses twice', async () => {
      const { input, model } = planInput([
        { nonsense: true },
        'still not an object',
      ]);

      const result = await planAiOrderingTurn(input);

      expect(model.calls).toHaveLength(2);
      expect(result.ok).toBe(false);
      expect(result.quality.repairAttempted).toBe(true);
    });

    it('keeps a usable first attempt when the repair comes back unparseable', async () => {
      const { input } = planInput([
        {
          type: 'proposal',
          reply: '兩樣東西。',
          operations: [addRice, addSoldOutChicken],
        },
        { garbage: true },
      ]);

      const result = await planAiOrderingTurn(input);

      // Throwing away a usable partial proposal because the correction failed
      // would serve the guest an error instead of the one thing that worked.
      if (!result.ok || result.response.type !== 'proposal') {
        throw new Error('expected the first attempt to be used');
      }

      expect(result.response.operations).toHaveLength(1);
    });

    it('recovers when the first reply did not parse but the repair did', async () => {
      const { input } = planInput([
        {
          toolCalls: [{ name: 'ask_choice', args: { reply: 'hi' } }],
          text: '',
        },
        { type: 'message', reply: '好的。' },
      ]);

      const result = await planAiOrderingTurn(input);

      expect(result.ok).toBe(true);
      expect(result.quality.repairSucceeded).toBe(true);
    });
  });

  describe('version quality signals', () => {
    it('counts ownership violations across both attempts', async () => {
      const { input } = planInput([
        {
          type: 'proposal',
          reply: '移除牛肉麵。',
          operations: [removeOthersItem],
        },
        {
          type: 'proposal',
          reply: '還是移除牛肉麵。',
          operations: [removeOthersItem],
        },
      ]);

      const result = await planAiOrderingTurn(input);

      // A version that reaches for other people's items repeatedly is a worse
      // version, and that only shows up in aggregate.
      expect(result.quality.ownershipViolationCount).toBe(2);
    });

    it('returns a complete quality signal set for the stored turn', async () => {
      const { input } = planInput([{ type: 'message', reply: '好的。' }]);

      const result = await planAiOrderingTurn(input);

      expect(Object.keys(result.quality).sort()).toEqual([
        'droppedOperationCount',
        'ownershipViolationCount',
        'repairAttempted',
      ]);
    });
  });

  describe('confirmation is supplied, never inferred', () => {
    it('stamps the resolved confirmation flag onto the proposal', async () => {
      const { input } = planInput(
        [
          {
            type: 'proposal',
            reply: '幫你加白飯。',
            confirmationRequired: false,
            operations: [addRice],
          },
        ],
        { confirmationRequired: true },
      );

      const result = await planAiOrderingTurn(input);

      if (!result.ok || result.response.type !== 'proposal') {
        throw new Error('expected a proposal');
      }

      expect(result.response.confirmationRequired).toBe(true);
    });
  });
});
