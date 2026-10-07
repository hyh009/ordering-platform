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

const ICE_LABELS = ['正常冰', '少冰', '去冰'];
const SUGAR_LABELS = ['全糖', '半糖', '無糖'];
const TOPPING_LABELS = ['珍珠', '布丁', '仙草'];

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
    message: '加點一杯紅茶',
    expects: 'asks for sugar and ice at once; proposes nothing',
    check: (outcome) =>
      outcome.responseType === 'choices' || outcome.responseType === 'message',
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
      !choseAnyOption(outcome, TOPPING_LABELS),
  },
  {
    message: '加點一碗牛肉麵',
    expects: 'asks for the spice level',
    check: (outcome) =>
      outcome.responseType === 'choices' || outcome.responseType === 'message',
  },
  {
    message: '加點一杯紅茶，半糖少冰，再加點一碗牛肉麵不辣',
    expects: 'one proposal holding both items',
    check: (outcome) =>
      operations(outcome).length === 2 &&
      adds(outcome, '紅茶') &&
      adds(outcome, '牛肉麵'),
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
];
