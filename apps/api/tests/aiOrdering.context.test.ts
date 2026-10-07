import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_PARTICIPANT_OTHER,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_MENU_FIXTURE,
} from './fixtures/aiOrdering.js';
import { readAiOrderingAppliedOperations } from '../src/models/aiOrdering/model.js';
import {
  buildAiOrderingCartContext,
  buildAiOrderingContext,
} from '../src/modules/aiOrdering/context.js';
import {
  readAiOrderingEarlierProposals,
  readAiOrderingLastProposal,
} from '../src/modules/aiOrdering/promptResolution.js';
import { AI_ORDERING_V1_2026_09_30 } from '../src/modules/aiOrdering/versions/index.js';

import type {
  AiOrderingConversationEntity,
  AiOrderingTurnSnapshot,
} from '../src/models/aiOrdering/model.js';
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

  describe('short codes', () => {
    const RICE_ID = 'product-1a2b3c4d-0000-4000-8000-000000000001';
    const menu = JSON.parse(
      JSON.stringify(AI_ORDERING_MENU_FIXTURE).replaceAll('prod-rice', RICE_ID),
    ) as typeof AI_ORDERING_MENU_FIXTURE;

    it('shows the model a short code in place of a UUID id', () => {
      const storeData = blockText(
        buildAiOrderingContext(contextInput({ menu })),
        'store_data',
      );

      // The id is copied by the model into every operation. Eight characters
      // cost less and go wrong less than thirty-six.
      expect(storeData).toContain('- 1a2b3c4d | ');
      expect(storeData).not.toContain(RICE_ID);
    });

    it('uses the same code for a lapsed proposal as for the menu', () => {
      const text = blockText(
        buildAiOrderingContext(
          contextInput({
            menu,
            proposalLog: [
              {
                turnNumber: 1,
                operations: [
                  {
                    type: 'add_item',
                    operationId: 'op-1',
                    summary: '+ 白飯 ×1',
                    item: { productId: RICE_ID, quantity: 1 },
                  },
                ],
                results: [{ operationId: 'op-1', outcome: 'superseded' }],
              },
            ],
          }),
        ),
        'current_turn',
      );

      expect(text).toContain('(op-1 | add_item | product 1a2b3c4d | x1)');
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
      expect(currentTurn).toContain('### Items you may change');
      expect(currentTurn).toContain('### Items you may NOT change');
      // The heading alone left "is this the cart, or a list of changes?" to be
      // inferred; it is the one block that is a snapshot rather than a log.
      expect(currentTurn).toContain('## The cart right now');
      expect(currentTurn).toContain(
        'Everything this cart holds at this moment',
      );

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
                turnNumber: 1,
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

  describe('the proposal log', () => {
    const logEntry = (
      turnNumber: number,
      operations: NonNullable<
        AiOrderingContextInput['proposalLog']
      >[number]['operations'],
      results: NonNullable<
        AiOrderingContextInput['proposalLog']
      >[number]['results'],
    ) => ({ turnNumber, operations, results });

    const riceOperation = (operationId: string) =>
      ({
        type: 'add_item',
        operationId,
        summary: '+ 白飯 ×1',
        item: { productId: 'prod-rice', quantity: 1 },
      }) as const;

    it('describes a refusal and an abandonment differently', () => {
      const rejected = blockText(
        buildAiOrderingContext(
          contextInput({
            proposalLog: [
              logEntry(
                1,
                [riceOperation('op-1')],
                [{ operationId: 'op-1', outcome: 'rejected' }],
              ),
            ],
          }),
        ),
        'current_turn',
      );
      const abandoned = blockText(
        buildAiOrderingContext(
          contextInput({
            proposalLog: [
              logEntry(
                1,
                [riceOperation('op-1')],
                [{ operationId: 'op-1', outcome: 'superseded' }],
              ),
            ],
          }),
        ),
        'current_turn',
      );

      // "You removed the tea" and "you moved on" must not read the same, or the
      // next reply will be wrong in one of the two cases.
      expect(rejected).not.toBe(abandoned);
      expect(rejected).toContain('the guest refused it');
      // Both have to say what the CART did, not only what the guest did: a
      // model that reads "they moved on" and still believes its own last reply
      // will invent a cart item id for an item never added.
      expect(rejected).toContain('not in the cart');
      expect(abandoned).toContain('the guest ignored it — not in the cart');
    });

    it('tells the model the outcomes outrank its own last reply', () => {
      const text = blockText(
        buildAiOrderingContext(
          contextInput({
            proposalLog: [
              logEntry(
                1,
                [riceOperation('op-1')],
                [{ operationId: 'op-1', outcome: 'superseded' }],
              ),
            ],
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
            proposalLog: [
              logEntry(
                1,
                [riceOperation('op-1')],
                [
                  {
                    operationId: 'op-1',
                    outcome: 'failed',
                    failureCode: 'PRODUCT_SOLD_OUT',
                  },
                ],
              ),
            ],
          }),
        ),
        'current_turn',
      );

      expect(failed).toContain('PRODUCT_SOLD_OUT');
    });

    it('numbers every change by the turn that proposed it', () => {
      const text = blockText(
        buildAiOrderingContext(
          contextInput({
            history: [
              {
                turnNumber: 1,
                message: '我要珍珠奶茶',
                reply: '好的，請確認。',
                responseType: 'proposal',
              },
              {
                turnNumber: 2,
                message: '再來一碗白飯',
                reply: '好的，請確認。',
                responseType: 'proposal',
              },
            ],
            proposalLog: [
              logEntry(
                1,
                [
                  {
                    type: 'add_item',
                    operationId: 'op-1',
                    summary: '+ 珍珠奶茶 ×1',
                    item: { productId: 'prod-milk-tea', quantity: 1 },
                  },
                ],
                [{ operationId: 'op-1', outcome: 'accepted' }],
              ),
              logEntry(
                2,
                [riceOperation('op-2')],
                [{ operationId: 'op-2', outcome: 'superseded' }],
              ),
            ],
          }),
        ),
        'current_turn',
      );

      // The number is the whole point of the log living outside the history: it
      // is how the model tells a change made two turns ago from one made last
      // turn, which is what it has to know to decide whether to offer it again.
      expect(text).toContain(
        '- [Turn 1] + 珍珠奶茶 ×1: the guest accepted it — it is in the cart',
      );
      expect(text).toContain('- [Turn 2] + 白飯 ×1');
      expect(text).toContain('# This turn — Turn 3');
    });

    it('spells out the ids of the most recent proposal only', () => {
      const text = blockText(
        buildAiOrderingContext(
          contextInput({
            proposalLog: [
              logEntry(
                1,
                [riceOperation('op-1')],
                [{ operationId: 'op-1', outcome: 'accepted' }],
              ),
              logEntry(
                2,
                [
                  {
                    type: 'add_item',
                    operationId: 'op-2',
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
                    operationId: 'op-3',
                    summary: '白飯 → — note removed',
                    itemId: 'item-rice',
                    item: { notes: null },
                  },
                  {
                    type: 'remove_own_item',
                    operationId: 'op-4',
                    summary: '− 紅茶',
                    itemId: 'item-black-tea',
                  },
                ],
                [
                  { operationId: 'op-2', outcome: 'superseded' },
                  { operationId: 'op-3', outcome: 'rejected' },
                  { operationId: 'op-4', outcome: 'accepted' },
                ],
              ),
            ],
          }),
        ),
        'current_turn',
      );

      // Ids are what proposing the same change again has to send, and only the
      // newest proposal may be proposed again — so only it pays for them.
      expect(text).toContain(
        '(op-2 | add_item | product prod-milk-tea | x2 | choices: mod-sugar=opt-no-sugar | note: 去冰)',
      );
      // An update lists only what it changed, so it reads as the operation
      // rather than as the item.
      expect(text).toContain(
        '(op-3 | update_own_item | item item-rice | note removed)',
      );
      expect(text).toContain('(op-4 | remove_own_item | item item-black-tea)');
      expect(text).toContain('- [Turn 1] + 白飯 ×1: the guest accepted');
      expect(text).not.toContain('op-1 | add_item');
    });

    describe('a proposal the guest changed before accepting', () => {
      const teaOperation = (sugarOptionId: string, sugarLabel: string) =>
        ({
          type: 'add_item',
          operationId: 'op-tea',
          summary: `+ 紅茶 ×1 · ${sugarLabel} · 正常冰`,
          item: {
            productId: 'prod-black-tea',
            quantity: 1,
            selectedOptions: [
              { modifierId: 'mod-sugar', optionId: sugarOptionId },
              { modifierId: 'mod-ice', optionId: 'opt-ice-normal' },
            ],
          },
        }) as const;

      const turnWith = (
        index: number,
        proposal: NonNullable<AiOrderingTurnSnapshot['proposal']>,
      ): AiOrderingTurnSnapshot => ({
        id: `turn-${index}`,
        message: '來一杯紅茶',
        versionId: AI_ORDERING_V1_2026_09_30.versionId,
        versionFingerprint: 'test-fingerprint',
        provider: 'gemini',
        modelName: 'test-model',
        response: {
          type: 'proposal',
          reply: '幫你加紅茶。',
          proposalId: proposal.proposalId,
          confirmationRequired: true,
          operations: proposal.operations,
        },
        proposal,
        quality: {
          repairAttempted: false,
          droppedOperationCount: 0,
          ownershipViolationCount: 0,
        },
        createdAt: new Date('2026-09-30T00:00:00.000Z'),
      });

      const conversationOf = (
        turns: AiOrderingTurnSnapshot[],
      ): AiOrderingConversationEntity => ({
        id: 'ai-conversation-1',
        organizationId: 'org-1',
        storeId: 'store-1',
        cartId: 'cart-1',
        participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
        turns,
        createdAt: new Date('2026-09-30T00:00:00.000Z'),
        updatedAt: new Date('2026-09-30T00:00:00.000Z'),
      });

      /** The log the service builds: earlier proposals, then the last one. */
      const logOf = (conversation: AiOrderingConversationEntity) => {
        const last = readAiOrderingLastProposal(conversation);

        return blockText(
          buildAiOrderingContext(
            contextInput({
              proposalLog: [
                ...readAiOrderingEarlierProposals(conversation),
                ...(last
                  ? [
                      {
                        turnNumber: last.turnNumber,
                        ...readAiOrderingAppliedOperations(last.proposal),
                        results: last.proposal.decision?.results ?? [],
                      },
                    ]
                  : []),
              ],
            }),
          ),
          'current_turn',
        );
      };

      const accepted = [
        { operationId: 'op-tea', outcome: 'accepted' as const },
      ];

      it('shows the option that was applied, not the one that was proposed', () => {
        // The assistant proposed no sugar; the guest switched it to half sugar
        // on the card and accepted. The log states what is in the cart, so it
        // has to state half sugar — the proposed line would be a false fact
        // about the cart, with the ids to propose it again attached.
        const text = logOf(
          conversationOf([
            turnWith(1, {
              proposalId: 'proposal-1',
              operations: [teaOperation('opt-sugar-free', '無糖')],
              decision: {
                decidedAt: new Date('2026-09-30T00:00:00.000Z'),
                results: accepted,
                appliedOperations: [teaOperation('opt-sugar-half', '半糖')],
              },
            }),
          ]),
        );

        expect(text).toContain('- [Turn 1] + 紅茶 ×1 · 半糖 · 正常冰');
        expect(text).toContain('mod-sugar=opt-sugar-half');
        expect(text).not.toContain('無糖');
        expect(text).not.toContain('opt-sugar-free');
        // Not only the right option: the model is told it was corrected, since
        // otherwise it reads its own mistake back as something it got right.
        expect(text).toContain(
          'the guest changed the choices you proposed, then accepted it',
        );
      });

      it('shows it on an earlier turn as well as on the last one', () => {
        const text = logOf(
          conversationOf([
            turnWith(1, {
              proposalId: 'proposal-1',
              operations: [teaOperation('opt-sugar-free', '無糖')],
              decision: {
                decidedAt: new Date('2026-09-30T00:00:00.000Z'),
                results: accepted,
                appliedOperations: [teaOperation('opt-sugar-half', '半糖')],
              },
            }),
            turnWith(2, {
              proposalId: 'proposal-2',
              operations: [riceOperation('op-rice')],
              decision: {
                decidedAt: new Date('2026-09-30T00:00:00.000Z'),
                results: [{ operationId: 'op-rice', outcome: 'accepted' }],
              },
            }),
          ]),
        );

        expect(text).toContain(
          '- [Turn 1] + 紅茶 ×1 · 半糖 · 正常冰: the guest changed the choices you proposed',
        );
        expect(text).not.toContain('無糖');
        expect(text).toContain(
          '- [Turn 2] + 白飯 ×1 (op-rice | add_item | product prod-rice | x1): the guest accepted it — it is in the cart',
        );
      });

      it('reads a decision stored before this was recorded as applied as proposed', () => {
        // No `appliedOperations` on it, as on every decision written before the
        // field existed. It still renders, and what was proposed is what stands.
        const text = logOf(
          conversationOf([
            turnWith(1, {
              proposalId: 'proposal-1',
              operations: [teaOperation('opt-sugar-free', '無糖')],
              decision: {
                decidedAt: new Date('2026-09-30T00:00:00.000Z'),
                results: accepted,
              },
            }),
          ]),
        );

        expect(text).toContain(
          '- [Turn 1] + 紅茶 ×1 · 無糖 · 正常冰 (op-tea | add_item | product prod-black-tea | x1 | choices: mod-sugar=opt-sugar-free, mod-ice=opt-ice-normal): the guest accepted it — it is in the cart',
        );
      });
    });

    it('reads an operation with no recorded outcome as not in the cart', () => {
      const text = blockText(
        buildAiOrderingContext(
          contextInput({
            proposalLog: [logEntry(1, [riceOperation('op-1')], [])],
          }),
        ),
        'current_turn',
      );

      // Only a data fault produces this. Silence must never read as done.
      expect(text).toContain('- [Turn 1] + 白飯 ×1');
      expect(text).toContain('no recorded outcome — not in the cart');
    });

    it('keeps the proposed operations out of the history block', () => {
      const context = buildAiOrderingContext(
        contextInput({
          history: [
            {
              turnNumber: 1,
              message: '我要鮮奶茶',
              reply: '好的，為您加上鮮奶茶。',
              responseType: 'proposal',
            },
          ],
          proposalLog: [
            logEntry(
              1,
              [
                {
                  type: 'add_item',
                  operationId: 'op-1',
                  summary: '+ 鮮奶茶 ×1',
                  item: { productId: 'prod-milk-tea', quantity: 1 },
                },
              ],
              [{ operationId: 'op-1', outcome: 'superseded' }],
            ),
          ],
        }),
      );

      // The history block is append-only so its prefix stays cacheable. Writing
      // an outcome into the turn that proposed it would rewrite that text when
      // the outcome arrived, which is a turn later than the reply.
      expect(blockText(context, 'history')).not.toContain('op-1');
      expect(blockText(context, 'current_turn')).toContain('[Turn 1]');
    });

    it('omits the section entirely when nothing has been proposed', () => {
      const currentTurn = blockText(
        buildAiOrderingContext(contextInput()),
        'current_turn',
      );

      expect(currentTurn).not.toContain('Every change you proposed');
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

  it('names each choice on the product line that requires it', () => {
    const { blocks } = buildAiOrderingContext(contextInput());
    const storeData = blocks.find((block) => block.kind === 'store_data');
    const line = storeData?.text
      .split('\n')
      .find((candidate) => candidate.includes('珍珠奶茶'));

    // A bare list of ids made the model carry three codes to `## Choices` and
    // back; naming them where the product is removes that errand.
    expect(line).toContain('(甜度)');
    expect(line).toMatch(/choices: \S+ \(甜度\)/);
  });

  it('does not tell the model which option the menu page preselects', () => {
    const { blocks } = buildAiOrderingContext(contextInput());
    const storeData = blocks.find((block) => block.kind === 'store_data');

    // A required choice is the guest's to make; a visible default reads as the
    // answer and the model proposes it without asking.
    expect(storeData?.text).toContain('required');
    expect(storeData?.text).not.toContain('default');
  });

  it('numbers every line of the conversation so far', () => {
    const history = blockText(
      buildAiOrderingContext(
        contextInput({
          history: [
            {
              turnNumber: 4,
              message: '有什麼喝的嗎',
              reply: '我們有紅茶、奶茶和豆漿。',
              responseType: 'message',
            },
            {
              turnNumber: 5,
              message: '我想要無糖紅茶',
              reply: '為您加入無糖紅茶。',
              responseType: 'proposal',
            },
          ],
        }),
      ),
      'history',
    );

    // Numbered from the conversation and not from the window, so a turn keeps
    // the number the proposal log refers to it by even once older turns have
    // aged out into the summary.
    expect(history).toContain('[Turn 4] Guest: 有什麼喝的嗎');
    expect(history).toContain('[Turn 5] You (proposal): 為您加入無糖紅茶。');
  });
});
