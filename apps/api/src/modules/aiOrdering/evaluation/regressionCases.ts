import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
} from '@src/modules/aiOrdering/evaluation/fixture';

import type { CartDto } from '@repo/shared';
import type {
  AiOrderingReplayCase,
  AiOrderingReplayOutcome,
} from '@src/modules/aiOrdering/evaluation/replay';

/**
 * Guest messages whose right answer is known, replayed as one set.
 *
 * A prompt edit that fixes one behavior has repeatedly broken another, and one
 * hand-picked message cannot show that. Every case here is a behavior that went
 * wrong at least once against a real model. Run the whole set before and after
 * an edit and compare the totals, rather than judging by the message the edit
 * was written for.
 *
 * Everything is read against the replay fixture: the guest's cart already holds
 * a pearl milk tea (half sugar, less ice) and two rice, another guest's beef
 * noodle soup is in the cart too, black tea needs sugar and ice, beef noodle
 * soup needs a spice level, rice needs nothing, and nothing on the menu is an
 * egg.
 *
 * A check is deliberately loose about wording and strict about the cart: what a
 * reply says may vary, what a proposal would do to the cart may not. The model
 * is not deterministic, so one failure is a signal to rerun, not a verdict.
 */
export type AiOrderingRegressionCase = AiOrderingReplayCase & {
  /** What a correct answer looks like, for the person reading a failure. */
  expects: string;
  check: (outcome: AiOrderingReplayOutcome) => boolean;
};

const operations = (outcome: AiOrderingReplayOutcome) =>
  outcome.operationSummaries;

/** A note is rendered in curly quotes at the end of an operation's summary. */
const hasNote = (summary: string) => summary.includes('“');

const adds = (outcome: AiOrderingReplayOutcome, productName: string) =>
  operations(outcome).some((summary) => summary.includes(productName));

/**
 * Whether any proposed operation CHOSE one of these options.
 *
 * Used to assert the absence of a choice the guest never made. The assistant is
 * asked only for the choices they stated: everything else is computed into the
 * proposal's open choices and answered on the cart card, so an unstated option
 * appearing here means the model picked it for them.
 *
 * Matched against the summary's option fields — `buildAiOrderingOperationLabel`
 * joins them with ` · ` — and never against the whole line, because an option
 * name can be part of a product name: 珍珠 is a topping AND half of 珍珠奶茶, so
 * a substring test over the line can never be false for that drink.
 */
const choseAnyOption = (
  outcome: AiOrderingReplayOutcome,
  optionLabels: string[],
) =>
  operations(outcome).some((summary) =>
    summary
      .split(' · ')
      // The first field is the product and the quantity, never a choice.
      .slice(1)
      .some((field) => optionLabels.includes(field)),
  );

/**
 * Each proposed operation reduced to the quantity and the choices it names.
 *
 * Splitting a line has two correct shapes: the line can keep the part that
 * stays while the rest is added, or the line can become the changed part while
 * the remainder is added. The guest's cart is the same either way, so a check
 * that pins one shape fails a right answer. These checks assert the cart the
 * two operations would produce, and only that one is an update and one an add.
 *
 * An update names only what it CHANGES, so an operation that leaves the choices
 * alone reports none — which is why a carried choice is asserted only on a side
 * that had to restate the set anyway.
 */
const splitParts = (outcome: AiOrderingReplayOutcome) =>
  operations(outcome).map((summary) => {
    const fields = summary.split(' · ');
    const head = fields[0] ?? '';

    return {
      isAdd: head.startsWith('+'),
      quantity: Number(/×(\d+)/.exec(head)?.[1] ?? '0'),
      options: fields.slice(1),
    };
  });

/** Whether one side of a split stands at this quantity with these choices. */
const splitSide = (
  parts: ReturnType<typeof splitParts>,
  quantity: number,
  options: string[],
) =>
  parts.some(
    (part) =>
      part.quantity === quantity &&
      options.every((option) => part.options.includes(option)),
  );

/** One update and one add: the two halves a split is made of. */
const isOneUpdateAndOneAdd = (parts: ReturnType<typeof splitParts>) =>
  parts.length === 2 && parts.filter((part) => part.isAdd).length === 1;

const ICE_LABELS = ['正常冰', '少冰', '去冰'];
const SUGAR_LABELS = ['全糖', '半糖', '無糖'];
const TOPPING_LABELS = ['珍珠', '布丁', '仙草'];
const SPICE_LABELS = ['不辣', '小辣', '大辣'];

/**
 * The fixture cart with the guest's own black teas standing as ONE line of
 * three, which is what the cart does with three identical adds.
 *
 * Needed as its own cart because the shape is the whole point: a line at more
 * than one is the only way to ask for part of a line to change, and putting
 * such a line in the shared fixture would move every other case's prompt.
 */
const CART_WITH_THREE_BLACK_TEAS: CartDto = {
  ...AI_ORDERING_CART_FIXTURE,
  items: [
    ...AI_ORDERING_CART_FIXTURE.items,
    {
      id: 'item-own-black-tea-x3',
      productId: 'prod-black-tea',
      productName: { 'zh-TW': '紅茶', en: 'Black tea' },
      quantity: 3,
      unitPrice: 35,
      selectedOptions: [
        {
          modifierId: 'mod-sugar',
          modifierName: { 'zh-TW': '甜度', en: 'Sweetness' },
          optionId: 'opt-sugar-full',
          optionName: { 'zh-TW': '全糖', en: 'Full sugar' },
          priceAdjustment: 0,
        },
        {
          modifierId: 'mod-ice',
          modifierName: { 'zh-TW': '冰塊', en: 'Ice' },
          optionId: 'opt-ice-normal',
          optionName: { 'zh-TW': '正常冰', en: 'Regular ice' },
          priceAdjustment: 0,
        },
      ],
      addedByParticipantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
      participantDisplayName: 'Ana',
      totalItemPrice: 105,
      createdAt: AI_ORDERING_CART_FIXTURE.items[0]?.createdAt ?? '',
    },
  ],
};

export const AI_ORDERING_REGRESSION_CASES: AiOrderingRegressionCase[] = [
  {
    message: '有什麼飲料嗎',
    expects: 'lists the drinks as a plain reply; proposes nothing',
    check: (outcome) =>
      outcome.responseType === 'message' && operations(outcome).length === 0,
  },
  {
    message: '紅茶跟奶茶差在哪',
    expects: 'answers the comparison; proposes nothing and asks nothing',
    check: (outcome) =>
      outcome.responseType === 'message' && operations(outcome).length === 0,
  },
  {
    // The guest stated no choice at all. This used to expect the assistant to
    // ask for the sugar and the ice together. It must now propose with both
    // left empty: the cart card asks for them from the store's own option list,
    // which costs the guest a tap instead of a turn. Asking is the failure here,
    // and so is filling either one in.
    message: '加點一杯紅茶',
    expects:
      'proposes the tea with no choice of its own; neither sugar nor ice is picked',
    check: (outcome) =>
      outcome.responseType === 'proposal' &&
      operations(outcome).length === 1 &&
      adds(outcome, '紅茶') &&
      !choseAnyOption(outcome, [...SUGAR_LABELS, ...ICE_LABELS]),
  },
  {
    // The guest stated the sugar and nothing else. Two wrong answers are
    // possible and this rejects both: picking an ice level for them, and asking
    // again for the sugar they just gave. Proposing with only the sugar set is
    // right — the ice is an open choice the cart card asks for, which costs the
    // guest a tap instead of another turn.
    message: '加點一杯無糖的紅茶',
    expects:
      'proposes the tea with the stated sugar only; never picks an ice level, never re-asks the sugar',
    check: (outcome) => {
      if (outcome.responseType === 'proposal') {
        return (
          adds(outcome, '紅茶') &&
          adds(outcome, '無糖') &&
          !choseAnyOption(outcome, ICE_LABELS)
        );
      }

      // Asking is wasteful rather than wrong, as long as it asks for the ice and
      // not for the sugar.
      return (
        outcome.responseType === 'choices' &&
        (outcome.asked ?? []).every(
          (asked) =>
            !SUGAR_LABELS.some((label) => asked.optionLabels.includes(label)),
        )
      );
    },
  },
  {
    // 珍珠奶茶 carries the optional 加料; 紅茶 does not, so only this product can
    // test what happens to an optional choice. It used to assert that the
    // assistant OFFERS the topping in the same turn. It no longer should: every
    // choice the guest did not state, optional ones included, is computed into
    // the proposal and asked on the cart card, so offering it here would be a
    // turn spent on something a tap already covers. What stays forbidden is
    // choosing a topping for them.
    message: '加點一杯珍珠奶茶，半糖少冰',
    expects:
      'proposes the drink with both stated choices and no topping it chose itself',
    check: (outcome) =>
      outcome.responseType === 'proposal' &&
      operations(outcome).length === 1 &&
      adds(outcome, '珍珠奶茶') &&
      adds(outcome, '半糖') &&
      adds(outcome, '少冰') &&
      !choseAnyOption(outcome, TOPPING_LABELS) &&
      // The guest asked for nothing a note could carry, so any note here is
      // invented. Caught live: the assistant copied their whole message into
      // the note, which would have reached the store as a preparation request.
      !operations(outcome).some(hasNote),
  },
  {
    // 辣度 is a REQUIRED modifier, which makes this the sharp version of the
    // case above: a required choice no longer holds a proposal back, and
    // validation no longer rejects one that is missing it. The guest answers it
    // on the card, and cannot apply the proposal until they have. What stays
    // forbidden is the assistant answering it for them — 不辣 is the plausible
    // guess, and a guess on a required choice is the one this asserts against.
    message: '加點一碗牛肉麵',
    expects:
      'proposes the noodles with the required spice level left unanswered',
    check: (outcome) =>
      outcome.responseType === 'proposal' &&
      operations(outcome).length === 1 &&
      adds(outcome, '牛肉麵') &&
      !choseAnyOption(outcome, SPICE_LABELS),
  },
  {
    message: '加點一杯紅茶，半糖少冰，再加點一碗牛肉麵不辣',
    expects:
      'one proposal holding both items, with every choice as a choice and no note',
    check: (outcome) =>
      operations(outcome).length === 2 &&
      adds(outcome, '紅茶') &&
      adds(outcome, '牛肉麵') &&
      // Every choice here is one the products offer, so a note has nothing to
      // carry. This went unasserted and the assistant wrote “半糖少冰” and
      // “不辣” into notes beside the choices it had already made correctly —
      // which is a preparation instruction to the kitchen, not a duplicate.
      !operations(outcome).some(hasNote),
  },
  {
    message: '加點一碗牛肉麵不辣，加飯',
    expects: 'rice as its own product, never as a note on the noodles',
    check: (outcome) =>
      adds(outcome, '牛肉麵') &&
      adds(outcome, '白飯') &&
      !operations(outcome).some(hasNote),
  },
  {
    message: '加點一碗牛肉麵不辣，加蛋',
    expects:
      'no egg on the menu: says so, never writes it as a note, and never offers one',
    check: (outcome) =>
      outcome.responseType !== null &&
      !operations(outcome).some(hasNote) &&
      // Inventing an "add egg" option is the same fault as writing it in a
      // note: the store does not sell it either way.
      !operations(outcome).some((summary) => summary.includes('蛋')) &&
      !(outcome.asked ?? []).some(
        (asked) =>
          asked.question.includes('蛋') ||
          asked.optionLabels.some((label) => label.includes('蛋')),
      ),
  },
  {
    message: '加點一碗牛肉麵小辣，不要蔥',
    expects: 'one item, with the omission as its note',
    check: (outcome) =>
      operations(outcome).length === 1 &&
      operations(outcome).some(
        (summary) => hasNote(summary) && summary.includes('蔥'),
      ),
  },
  {
    message: '再加點一杯紅茶，無糖去冰',
    history: [
      {
        turnNumber: 1,
        message: '我要一杯珍珠奶茶，半糖少冰',
        responseType: 'proposal',
        reply: '這是半糖少冰的珍珠奶茶，請確認。',
      },
    ],
    expects:
      'only the black tea: the milk tea from the earlier turn is already in the cart',
    check: (outcome) =>
      operations(outcome).length === 1 &&
      adds(outcome, '紅茶') &&
      !adds(outcome, '珍珠奶茶'),
  },
  {
    // The conversation that ordered a dish twice: an accepted proposal two
    // turns back, then an unanswered one, then a correction to the unanswered
    // one. Only the correction belongs in the new proposal.
    // Names the tea: the fixture cart's milk tea has an ice level too, so a bare
    // "less ice" would rightly be met with "which one?".
    message: '紅茶我要少冰',
    history: [
      {
        turnNumber: 1,
        message: '我要一杯珍珠奶茶，半糖少冰',
        responseType: 'proposal',
        reply: '為您將珍珠奶茶加入購物車，請確認是否加入。',
      },
      {
        turnNumber: 2,
        message: '有無糖紅茶嗎',
        responseType: 'proposal',
        reply: '有的，為您加入無糖紅茶，請確認。',
      },
    ],
    proposalLog: [
      {
        turnNumber: 1,
        operations: [
          {
            type: 'add_item',
            operationId: 'op-1',
            summary: '+ 珍珠奶茶 ×1 · 半糖 · 少冰',
            item: {
              productId: 'prod-milk-tea',
              quantity: 1,
              selectedOptions: [
                { modifierId: 'mod-sugar', optionId: 'opt-sugar-half' },
                { modifierId: 'mod-ice', optionId: 'opt-ice-less' },
              ],
            },
          },
        ],
        results: [{ operationId: 'op-1', outcome: 'accepted' }],
      },
      {
        turnNumber: 2,
        operations: [
          {
            type: 'add_item',
            operationId: 'op-1',
            summary: '+ 紅茶 ×1 · 無糖 · 正常冰',
            item: {
              productId: 'prod-black-tea',
              quantity: 1,
              selectedOptions: [
                { modifierId: 'mod-sugar', optionId: 'opt-sugar-free' },
                { modifierId: 'mod-ice', optionId: 'opt-ice-normal' },
              ],
            },
          },
        ],
        results: [{ operationId: 'op-1', outcome: 'superseded' }],
      },
    ],
    expects:
      'only the black tea, now with less ice: the milk tea was accepted two turns ago',
    check: (outcome) =>
      operations(outcome).length === 1 &&
      adds(outcome, '紅茶') &&
      adds(outcome, '少冰') &&
      !adds(outcome, '珍珠奶茶'),
  },
  {
    message: '飲料有什麼',
    expects: 'a plain answer listing the drinks, not a "cannot answer"',
    check: (outcome) =>
      outcome.responseType === 'message' || outcome.responseType === 'choices',
  },
  {
    message: '你們有停車場嗎',
    expects: 'reported as unanswerable: the store data says nothing about it',
    check: (outcome) => outcome.responseType === 'unanswered',
  },
  {
    // Part of a line, not all of it. An operation applies to a whole line, so
    // the only correct answer is two of them: the line drops to two, and the
    // changed cup is added as its own. Observed against the real assistant as
    // a request it could not carry out at all.
    message: '三杯紅茶其中一杯改半糖',
    cart: CART_WITH_THREE_BLACK_TEAS,
    expects:
      'two operations: the black tea line down to 2, and one half-sugar black tea added',
    check: (outcome) => {
      const parts = splitParts(outcome);

      return (
        outcome.responseType === 'proposal' &&
        isOneUpdateAndOneAdd(parts) &&
        // The sugar is a choice, so it belongs in the choices. A note repeating
        // it — or worse, repeating the whole message — reaches the kitchen
        // ticket as a preparation instruction nobody asked for.
        !operations(outcome).some(hasNote) &&
        // One cup is half sugar, two are not.
        splitSide(parts, 1, ['半糖']) &&
        splitSide(parts, 2, []) &&
        !parts.some(
          (part) => part.quantity === 2 && part.options.includes('半糖'),
        )
      );
    },
  },
  {
    // The same split, but the part that moves has to KEEP the choices it is not
    // changing. Taken from a real conversation ("我要兩杯小的一杯大的") where the
    // line's choices were shown by name only, so restating them meant matching
    // each name back through the menu to recover its id.
    // The product is named because the fixture cart holds a milk tea as well,
    // which makes a bare "two of these" genuinely ambiguous — a different
    // behavior, and not the one this case is for.
    message: '購物車那三杯紅茶，我要兩杯去冰一杯正常冰',
    cart: CART_WITH_THREE_BLACK_TEAS,
    expects:
      'the line drops to 1, and two black teas are added with no ice — still full sugar, which the guest never changed',
    check: (outcome) => {
      const parts = splitParts(outcome);

      // Both sides change the ice, so both have to restate the whole set of
      // choices — which is where full sugar is either carried or dropped.
      return (
        outcome.responseType === 'proposal' &&
        isOneUpdateAndOneAdd(parts) &&
        !operations(outcome).some(hasNote) &&
        splitSide(parts, 2, ['去冰', '全糖']) &&
        splitSide(parts, 1, ['正常冰', '全糖'])
      );
    },
  },
];
