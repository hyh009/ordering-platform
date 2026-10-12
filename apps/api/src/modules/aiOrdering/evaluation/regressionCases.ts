import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_MENU_FIXTURE,
} from '@src/modules/aiOrdering/evaluation/fixture';

import type { CartDto, PublicMenuDto } from '@repo/shared';
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
/**
 * The fixture menu plus two products sharing a name stem.
 *
 * Nothing else in the fixture has this shape: 珍珠奶茶 and 翠玉奶綠 are merely
 * similar, while "鐵板麵" is the whole name of neither product and the complete
 * name of the dish both of them are. Neither carries a modifier, so the only
 * open question is WHICH product — which is what the case is for.
 *
 * Taken from the live menu, where "我要鐵板麵" put both of them in the cart.
 */
const MENU_WITH_TWO_NOODLE_PLATES: PublicMenuDto = {
  ...AI_ORDERING_MENU_FIXTURE,
  groups: [
    ...AI_ORDERING_MENU_FIXTURE.groups,
    {
      category: {
        id: 'cat-light',
        name: { 'zh-TW': '輕食', en: 'Light meals' },
        displayOrder: 3,
        availabilityRules: [],
      },
      products: [
        {
          id: 'prod-pepper-noodle',
          categoryIds: ['cat-light'],
          name: { 'zh-TW': '黑胡椒鐵板麵', en: 'Black pepper noodle plate' },
          imageUrls: [],
          price: 90,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-mushroom-noodle',
          categoryIds: ['cat-light'],
          name: { 'zh-TW': '蘑菇鐵板麵', en: 'Mushroom noodle plate' },
          imageUrls: [],
          price: 90,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
      ],
    },
  ],
};

/**
 * The fixture menu plus twelve products of one dish.
 *
 * More than the eight options a question may offer, which is the whole point:
 * the shape that used to make the assistant split one question in two. Twelve
 * is what the live store actually has.
 */
const MENU_WITH_TWELVE_EGG_CREPES: PublicMenuDto = {
  ...AI_ORDERING_MENU_FIXTURE,
  groups: [
    ...AI_ORDERING_MENU_FIXTURE.groups,
    {
      category: {
        id: 'cat-crepe',
        name: { 'zh-TW': '蛋餅', en: 'Egg crepes' },
        displayOrder: 4,
        availabilityRules: [],
      },
      products: [
        {
          id: 'prod-crepe-1',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '原味蛋餅', en: '原味 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-2',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '火腿蛋餅', en: '火腿 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-3',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '起士蛋餅', en: '起士 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-4',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '肉鬆蛋餅', en: '肉鬆 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-5',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '培根蛋餅', en: '培根 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-6',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '玉米蛋餅', en: '玉米 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-7',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '蔬菜蛋餅', en: '蔬菜 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-8',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '鮪魚蛋餅', en: '鮪魚 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-9',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '薯餅蛋餅', en: '薯餅 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-10',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '豬肉蛋餅', en: '豬肉 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-11',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '香雞蛋餅', en: '香雞 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
        {
          id: 'prod-crepe-12',
          categoryIds: ['cat-crepe'],
          name: { 'zh-TW': '辣菜圃蛋餅', en: '辣菜圃 egg crepe' },
          imageUrls: [],
          price: 45,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
      ],
    },
  ],
};

/**
 * The fixture menu plus a dish whose add-on is ALSO a product on its own.
 *
 * Taken from the live menu, where "蛋餅加雞塊" put the crepe in the cart with no
 * nugget on it and no nugget beside it. The guest's words name a thing the store
 * sells twice over — as a topping on this product and as a product of its own —
 * and either reading puts a nugget in the cart. Only silence is wrong.
 */
const MENU_WITH_NUGGET_BOTH_WAYS: PublicMenuDto = {
  ...AI_ORDERING_MENU_FIXTURE,
  groups: [
    ...AI_ORDERING_MENU_FIXTURE.groups,
    {
      category: {
        id: 'cat-snack',
        name: { 'zh-TW': '點心', en: 'Snacks' },
        displayOrder: 3,
        availabilityRules: [],
      },
      products: [
        {
          id: 'prod-plain-crepe',
          categoryIds: ['cat-snack'],
          name: { 'zh-TW': '原味蛋餅', en: 'Plain egg crepe' },
          imageUrls: [],
          price: 35,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: ['mod-crepe-topping'],
          isSoldOut: false,
        },
        {
          id: 'prod-nugget',
          categoryIds: ['cat-snack'],
          name: { 'zh-TW': '雞塊', en: 'Chicken nuggets' },
          imageUrls: [],
          price: 40,
          tagIds: [],
          allergenIds: [],
          dietaryMarkerIds: [],
          modifierIds: [],
          isSoldOut: false,
        },
      ],
    },
  ],
  modifiers: [
    ...AI_ORDERING_MENU_FIXTURE.modifiers,
    {
      id: 'mod-crepe-topping',
      name: { 'zh-TW': '加料', en: 'Add-ons' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 3,
      options: [
        {
          id: 'opt-crepe-nugget',
          name: { 'zh-TW': '雞塊', en: 'Chicken nuggets' },
          priceAdjustment: 20,
          isDefault: false,
          isSoldOut: false,
        },
        {
          id: 'opt-crepe-cheese',
          name: { 'zh-TW': '起士', en: 'Cheese' },
          priceAdjustment: 10,
          isDefault: false,
          isSoldOut: false,
        },
        {
          id: 'opt-crepe-ham',
          name: { 'zh-TW': '火腿', en: 'Ham' },
          priceAdjustment: 10,
          isDefault: false,
          isSoldOut: false,
        },
      ],
    },
  ],
};

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

/**
 * The fixture menu with the beef noodles under an English name that is not a
 * translation of the Chinese one.
 *
 * A store's name in another language is whatever the store wrote, and the
 * fixture's own English names are close enough to a literal translation that a
 * model can arrive at them without ever being shown them. This one it cannot
 * guess, so a reply that uses it was read off the menu.
 */
const MENU_WITH_A_NAMED_DISH: PublicMenuDto = {
  ...AI_ORDERING_MENU_FIXTURE,
  groups: AI_ORDERING_MENU_FIXTURE.groups.map((group) => ({
    ...group,
    products: group.products.map((product) =>
      product.id === 'prod-beef-noodle'
        ? {
            ...product,
            name: { 'zh-TW': '牛肉麵', en: 'House Braised Beef Bowl' },
          }
        : product,
    ),
  })),
};

/**
 * A reply names a thing once.
 *
 * On an interface in another language every name is written twice, joined by
 * ` / `, and a reply that copies the pair whole reads as a menu line rather
 * than a sentence.
 */
const namesThingsOnce = (outcome: AiOrderingReplayOutcome) =>
  !(outcome.reply ?? '').includes(' / ');

const hasHan = (text: string) => /\p{Script=Han}/u.test(text);

export const AI_ORDERING_REGRESSION_CASES: AiOrderingRegressionCase[] = [
  {
    // Browsing. What this case has always been for is that NOTHING reaches the
    // cart from a question, and that is still what it pins. Which way the
    // drinks are named is not: a plain reply and a row of product cards are
    // both honest answers, and the card row only became possible with
    // `show_products`. Pinning the reply would have been pinning the absence
    // of a tool.
    message: '有什麼飲料嗎',
    expects: 'named the drinks, as a reply or as cards; proposed nothing',
    check: (outcome) =>
      (outcome.responseType === 'message' ||
        outcome.responseType === 'products') &&
      operations(outcome).length === 0,
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
    // The same question worded backwards, kept because this phrasing once came
    // back as "cannot answer". Any answer that names the drinks counts; the one
    // thing still rejected is a refusal.
    message: '飲料有什麼',
    expects: 'named the drinks somehow, rather than reporting it unanswerable',
    check: (outcome) =>
      outcome.responseType === 'message' ||
      outcome.responseType === 'choices' ||
      outcome.responseType === 'products',
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
  {
    // Twelve products answer the guest's words, more than a question may
    // offer. Observed against the live menu as the assistant splitting one
    // question across two: the guest was asked to answer both, and two answers
    // travelling as one message ordered two egg crepes. The slot that allowed
    // the split is gone, and offering five of the twelve would still hide
    // seven, so the answer is to show all twelve.
    message: '我要蛋餅',
    menu: MENU_WITH_TWELVE_EGG_CREPES,
    expects: 'showed all twelve kinds, proposing nothing',
    check: (outcome) =>
      outcome.responseType === 'products' &&
      outcome.shown?.productIds.length === 12 &&
      operations(outcome).length === 0,
  },
  {
    // Which product, not which option. Two products share the name the guest
    // used, so there is nothing to propose yet. Observed against the live menu
    // as BOTH of them landing in the cart: the proposal tool told the model
    // that an unstated "choice" was no reason to hold a proposal back, and
    // that read as covering which product too.
    message: '我要鐵板麵',
    menu: MENU_WITH_TWO_NOODLE_PLATES,
    expects:
      'asked which of the two noodle plates they meant, or showed both, and nothing proposed',
    // Two candidates fit in a question and fit on a shelf, so both answers are
    // honest and neither is pinned. What is pinned is that nothing reached the
    // cart: the live defect was BOTH of them being added.
    check: (outcome) =>
      (outcome.responseType === 'choices' ||
        outcome.responseType === 'products') &&
      operations(outcome).length === 0,
  },
  {
    // A stated add-on that the store sells both ways: as a topping on the crepe
    // and as a product of its own. Either reading is accepted — what is
    // rejected is the crepe going in alone, with the nugget the guest asked for
    // left as an open choice nobody answered.
    menu: MENU_WITH_NUGGET_BOTH_WAYS,
    message: '我要一份原味蛋餅加雞塊',
    expects:
      "the nugget reaches the cart: as the crepe's add-on, or as a product beside it",
    check: (outcome) =>
      outcome.responseType === 'proposal' && adds(outcome, '雞塊'),
  },
  {
    // Checking out is not a cart change. Live, this turn proposed adding a
    // black tea carrying the note “確認點餐” — the intent written into the one
    // tool that does anything, and from there onto the kitchen's ticket. The
    // cart already holds black tea, which is the product it reached for.
    //
    // Read against that cart for the same reason: a checkout request is only
    // tempting to answer with an operation when there is something to operate
    // on. Nothing about the reply's wording is pinned — only that the cart is
    // left alone.
    cart: CART_WITH_THREE_BLACK_TEAS,
    message: '我要結帳',
    expects:
      'answers in words and proposes nothing: checking out is not a cart change',
    check: (outcome) => operations(outcome).length === 0,
  },
  {
    // An English interface on a store whose menu is Chinese first. Ordering by
    // the English name has to land on the product, and the label the guest
    // reads is in their interface's language.
    interfaceLocale: 'en',
    message: 'One steamed rice please',
    expects: 'proposes the steamed rice, and the reply names nothing twice',
    check: (outcome) =>
      outcome.responseType === 'proposal' &&
      adds(outcome, 'Steamed rice') &&
      namesThingsOnce(outcome),
  },
  {
    // The store's English name, not a translation. Asked as a question so the
    // answer is a sentence: a shelf of cards would name the dish correctly
    // without the model having written anything.
    interfaceLocale: 'en',
    menu: MENU_WITH_A_NAMED_DISH,
    message: 'How much is the beef noodle dish?',
    expects:
      "the reply calls the dish by the store's English name, House Braised Beef Bowl",
    check: (outcome) =>
      (outcome.reply ?? '').toLowerCase().includes('house braised beef bowl') &&
      namesThingsOnce(outcome) &&
      operations(outcome).length === 0,
  },
  {
    // The interface is English and the guest writes Chinese. The reply follows
    // what they wrote, so it names the dish in Chinese; the label follows the
    // interface, so the operation reads in English.
    interfaceLocale: 'en',
    message: '加點一碗白飯',
    expects:
      'proposes the steamed rice, and the reply stays in Chinese without the English name',
    check: (outcome) =>
      outcome.responseType === 'proposal' &&
      adds(outcome, 'Steamed rice') &&
      hasHan(outcome.reply ?? '') &&
      !(outcome.reply ?? '').toLowerCase().includes('steamed rice') &&
      namesThingsOnce(outcome),
  },
];
