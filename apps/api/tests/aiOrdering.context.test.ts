import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_PARTICIPANT_OTHER,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_MENU_FIXTURE,
} from './fixtures/aiOrdering.js';
import {
  buildAiOrderingCartContext,
  buildAiOrderingContext,
} from '../src/modules/aiOrdering/context.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type { AiOrderingContextInput } from '../src/modules/aiOrdering/types.js';

function contextInput(
  overrides: Partial<AiOrderingContextInput> = {},
): AiOrderingContextInput {
  return {
    config: AI_ORDERING_V1_2026_09_30,
    locale: 'zh-TW',
    storeName: '測試小館',
    menu: AI_ORDERING_MENU_FIXTURE,
    cart: AI_ORDERING_CART_FIXTURE,
    participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
    message: '幫我加一份白飯',
    history: [],
    ...overrides,
  };
}

function blockText(
  context: ReturnType<typeof buildAiOrderingContext>,
  kind: string,
): string {
  const block = context.blocks.find((candidate) => candidate.kind === kind);

  if (!block) {
    throw new Error(`missing ${kind} block`);
  }

  return block.text;
}

describe('AI ordering context assembly', () => {
  describe('ordered by volatility, most static first', () => {
    it('orders the blocks core instructions, store data, history, current turn', () => {
      const context = buildAiOrderingContext(contextInput());

      expect(context.blocks.map((block) => block.kind)).toEqual([
        'core_instructions',
        'store_data',
        'history',
        'current_turn',
      ]);
    });

    it('sends the core instructions as a system block, verbatim', () => {
      const context = buildAiOrderingContext(contextInput());

      // Interpolating anything into this block would break the shared prefix and
      // make the released version non-reproducible.
      expect(blockText(context, 'core_instructions')).toBe(
        AI_ORDERING_V1_2026_09_30.coreInstructions,
      );
      expect(context.blocks[0]?.role).toBe('system');
    });

    it('puts the cart snapshot in the last block and nowhere earlier', () => {
      const context = buildAiOrderingContext(contextInput());

      // The cart is the most volatile input. Placing it before the history —
      // which reads more naturally — would invalidate the prefix cache on every
      // single turn.
      expect(blockText(context, 'current_turn')).toContain('item-own-milk-tea');
      expect(blockText(context, 'store_data')).not.toContain(
        'item-own-milk-tea',
      );
      expect(blockText(context, 'history')).not.toContain('item-own-milk-tea');
      expect(context.blocks.at(-1)?.kind).toBe('current_turn');
    });

    it('ends the current turn block with the guest message', () => {
      const context = buildAiOrderingContext(contextInput());

      expect(blockText(context, 'current_turn').trimEnd()).toMatch(
        /幫我加一份白飯$/,
      );
    });

    it('marks the store data block as platform-supplied rather than guest input', () => {
      const context = buildAiOrderingContext(contextInput());

      expect(blockText(context, 'store_data')).toContain(
        'supplied by the ordering platform',
      );
    });
  });

  describe('store data block', () => {
    it('gives the model product ids, not just names', () => {
      const storeData = blockText(
        buildAiOrderingContext(contextInput()),
        'store_data',
      );

      expect(storeData).toContain('prod-milk-tea');
      expect(storeData).toContain('prod-rice');
    });

    it('marks sold-out products and sold-out options', () => {
      const storeData = blockText(
        buildAiOrderingContext(contextInput()),
        'store_data',
      );

      // A model that can see availability mostly will not propose the
      // unavailable thing, which keeps the repair path rare.
      expect(storeData).toMatch(/prod-fried-chicken.*SOLD OUT/);
      expect(storeData).toMatch(/opt-spice-hot.*SOLD OUT/);
    });

    it('states which choices are required and how many may be picked', () => {
      const storeData = blockText(
        buildAiOrderingContext(contextInput()),
        'store_data',
      );

      expect(storeData).toMatch(/mod-sugar.*required.*pick 1-1/);
      expect(storeData).toMatch(/mod-topping.*optional.*pick 0-3/);
    });
  });

  describe('shared cart: readable in full, changeable in part', () => {
    it('separates the guest own items from other participants items', () => {
      const cartContext = buildAiOrderingCartContext(
        AI_ORDERING_CART_FIXTURE,
        AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
        'zh-TW',
      );

      expect(cartContext.modifiableItems.map((item) => item.itemId)).toEqual([
        'item-own-milk-tea',
        'item-own-rice',
      ]);
      expect(cartContext.readOnlyItems.map((item) => item.itemId)).toEqual([
        'item-other-beef',
      ]);
    });

    it('flips the split when the other participant is the one asking', () => {
      const cartContext = buildAiOrderingCartContext(
        AI_ORDERING_CART_FIXTURE,
        AI_ORDERING_FIXTURE_PARTICIPANT_OTHER,
        'zh-TW',
      );

      expect(cartContext.modifiableItems.map((item) => item.itemId)).toEqual([
        'item-other-beef',
      ]);
      expect(cartContext.readOnlyItems).toHaveLength(2);
    });

    it('renders the two lists under separate headings', () => {
      const currentTurn = blockText(
        buildAiOrderingContext(contextInput()),
        'current_turn',
      );

      // The rule is carried by the shape of the data, not only by a sentence in
      // the prompt that the model has to remember.
      expect(currentTurn).toContain('Items you may change');
      expect(currentTurn).toContain('Items you may NOT change');

      const changeableSection = currentTurn.slice(
        currentTurn.indexOf('Items you may change'),
        currentTurn.indexOf('Items you may NOT change'),
      );

      expect(changeableSection).toContain('item-own-milk-tea');
      expect(changeableSection).not.toContain('item-other-beef');
    });

    it('still lets the model read the whole cart', () => {
      const currentTurn = blockText(
        buildAiOrderingContext(contextInput()),
        'current_turn',
      );

      // Answering "have we ordered enough?" needs everyone's items.
      expect(currentTurn).toContain('item-other-beef');
    });
  });

  describe('history block', () => {
    it('says so plainly when there are no earlier turns', () => {
      const history = blockText(
        buildAiOrderingContext(contextInput()),
        'history',
      );

      expect(history).toContain('No earlier turns.');
    });

    it('includes the rolling summary ahead of the recent turns', () => {
      const history = blockText(
        buildAiOrderingContext(
          contextInput({
            summary: 'The guest ordered drinks for two people.',
            history: [
              {
                message: '有什麼推薦',
                reply: '珍珠奶茶很受歡迎。',
                responseType: 'message',
              },
            ],
          }),
        ),
        'history',
      );

      expect(history.indexOf('summarised')).toBeLessThan(
        history.indexOf('有什麼推薦'),
      );
    });
  });

  describe('previous proposal outcomes', () => {
    it('describes a dismissal and an abandonment differently', () => {
      const rejected = blockText(
        buildAiOrderingContext(
          contextInput({
            reportedOutcomes: [{ operationId: 'op-1', outcome: 'rejected' }],
          }),
        ),
        'current_turn',
      );
      const noAction = blockText(
        buildAiOrderingContext(
          contextInput({
            reportedOutcomes: [{ operationId: 'op-1', outcome: 'superseded' }],
          }),
        ),
        'current_turn',
      );

      // "You removed the tea" and "you moved on" must not read the same, or the
      // next reply will be wrong in one of the two cases.
      expect(rejected).not.toBe(noAction);
      expect(rejected).toContain('dismissed');
      // The abandonment line has to say what the CART did, not only what the
      // guest did: a model that reads "they moved on" and still believes its own
      // last reply will invent a cart item id for an item never added.
      expect(noAction).toContain('never answered');
      expect(noAction).toContain('did NOT change');
    });

    it('tells the model the outcomes outrank its own last reply', () => {
      const text = blockText(
        buildAiOrderingContext(
          contextInput({
            reportedOutcomes: [{ operationId: 'op-1', outcome: 'superseded' }],
          }),
        ),
        'current_turn',
      );

      // The failure this exists for: the history still holds "I added the milk
      // tea for you", and without this the model trusts that over the cart.
      expect(text).toContain('this is right and your reply was not');
    });

    it('passes a failure code through when one was reported', () => {
      const failed = blockText(
        buildAiOrderingContext(
          contextInput({
            reportedOutcomes: [
              {
                operationId: 'op-1',
                outcome: 'failed',
                failureCode: 'PRODUCT_SOLD_OUT',
              },
            ],
          }),
        ),
        'current_turn',
      );

      expect(failed).toContain('PRODUCT_SOLD_OUT');
    });

    it('says what each operation proposed, not only its id', () => {
      const text = blockText(
        buildAiOrderingContext(
          contextInput({
            reportedOutcomes: [
              { operationId: 'op-1', outcome: 'superseded' },
              { operationId: 'op-2', outcome: 'rejected' },
              { operationId: 'op-3', outcome: 'accepted' },
            ],
            lastProposalOperations: [
              {
                type: 'add_item',
                operationId: 'op-1',
                summary: '+ 鮮奶茶 ×2',
                item: {
                  productId: 'prod-milk-tea',
                  quantity: 2,
                  selectedOptions: [
                    { modifierId: 'mod-sugar', optionId: 'opt-no-sugar' },
                  ],
                  notes: '去冰',
                },
              },
              {
                type: 'update_own_item',
                operationId: 'op-2',
                summary: '白飯 → — note removed',
                itemId: 'item-rice',
                item: { notes: null },
              },
              {
                type: 'remove_own_item',
                operationId: 'op-3',
                summary: '− 紅茶',
                itemId: 'item-black-tea',
              },
            ],
          }),
        ),
        'current_turn',
      );

      // "op-1 was never answered" tells the model nothing it can act on. With
      // the ids it proposed, it can offer the same change again instead of
      // guessing at what its own reply meant.
      expect(text).toContain(
        '- op-1 | add_item | product prod-milk-tea | x2 | choices: mod-sugar=opt-no-sugar | note: 去冰: the guest never answered',
      );
      // An update lists only what it changed, so it reads as the operation
      // rather than as the item.
      expect(text).toContain(
        '- op-2 | update_own_item | item item-rice | note removed: the guest dismissed',
      );
      expect(text).toContain(
        '- op-3 | remove_own_item | item item-black-tea: the guest accepted',
      );
    });

    it('falls back to the bare id for an outcome with no matching operation', () => {
      const text = blockText(
        buildAiOrderingContext(
          contextInput({
            reportedOutcomes: [{ operationId: 'op-9', outcome: 'rejected' }],
            lastProposalOperations: [],
          }),
        ),
        'current_turn',
      );

      expect(text).toContain('- op-9: the guest dismissed');
    });

    it('keeps the proposed operations out of the history block', () => {
      const context = buildAiOrderingContext(
        contextInput({
          history: [
            {
              message: '我要鮮奶茶',
              reply: '好的，為您加上鮮奶茶。',
              responseType: 'proposal',
            },
          ],
          reportedOutcomes: [{ operationId: 'op-1', outcome: 'superseded' }],
          lastProposalOperations: [
            {
              type: 'add_item',
              operationId: 'op-1',
              summary: '+ 鮮奶茶 ×1',
              item: { productId: 'prod-milk-tea', quantity: 1 },
            },
          ],
        }),
      );

      // The history block is append-only so its prefix stays cacheable. Marking
      // one turn as the latest proposal would rewrite it when the next one came.
      expect(blockText(context, 'history')).not.toContain('op-1');
    });

    it('omits the section entirely when nothing was reported', () => {
      const currentTurn = blockText(
        buildAiOrderingContext(contextInput()),
        'current_turn',
      );

      expect(currentTurn).not.toContain('What happened to your last proposal');
    });
  });

  describe('answering a choice question', () => {
    it('shows the chosen option label and the question that offered it', () => {
      const currentTurn = blockText(
        buildAiOrderingContext(
          contextInput({
            resolvedPrompt: {
              promptId: 'prompt-1',
              question: '要什麼甜度？',
              selectedOption: { id: 'opt-sugar-half', label: '半糖' },
            },
          }),
        ),
        'current_turn',
      );

      // A bare option id means nothing to the model on its own.
      expect(currentTurn).toContain('要什麼甜度？');
      expect(currentTurn).toContain('半糖');
    });

    it('says when the guest typed instead of choosing', () => {
      const currentTurn = blockText(
        buildAiOrderingContext(
          contextInput({
            resolvedPrompt: {
              promptId: 'prompt-1',
              question: '要什麼甜度？',
            },
          }),
        ),
        'current_turn',
      );

      expect(currentTurn).toContain('did not pick any of the options');
    });
  });
});
