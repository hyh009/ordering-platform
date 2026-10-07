import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_MENU_FIXTURE,
} from './fixtures/aiOrdering.js';
import { hydrateAiOrderingResponse } from '../src/modules/aiOrdering/modelResponse.js';
import {
  describeProposalChoices,
  resolveAiOrderingProposalChoices,
} from '../src/modules/aiOrdering/openChoices.js';

import type { AiOrderingChoiceGroup, AiOrderingOperation } from '@repo/shared';

const describeChoices = (
  productId: string,
  selections: { modifierId: string; optionId: string }[] = [],
) =>
  describeProposalChoices({
    productId,
    selections,
    menu: AI_ORDERING_MENU_FIXTURE,
    locale: 'zh-TW',
  });

describe('the choices a proposed item carries', () => {
  it('lists every choice the product offers', () => {
    const choices = describeChoices('prod-milk-tea');

    expect(choices.map((choice) => choice.modifierId)).toEqual([
      'mod-sugar',
      'mod-ice',
      'mod-topping',
    ]);
    expect(
      choices.every((choice) => choice.selectedOptionIds.length === 0),
    ).toBe(true);
  });

  it('still describes a choice that already has an answer', () => {
    // This used to assert the opposite: an answered choice was left out, because
    // the list only fed the "what is still open" queue. That made a choice the
    // assistant filled in impossible to see or change, so the rule inverted —
    // every choice is described, and the answer travels with it.
    const choices = describeChoices('prod-milk-tea', [
      { modifierId: 'mod-sugar', optionId: 'opt-sugar-half' },
    ]);
    const sugar = choices.find((choice) => choice.modifierId === 'mod-sugar');

    expect(sugar?.selectedOptionIds).toEqual(['opt-sugar-half']);
    // And it is still changeable: the other options come with it.
    expect(sugar?.options.map((option) => option.optionId)).toContain(
      'opt-sugar-free',
    );
    expect(
      choices.find((choice) => choice.modifierId === 'mod-ice')
        ?.selectedOptionIds,
    ).toEqual([]);
  });

  it('reports every option picked for a multi-select choice', () => {
    const choices = describeChoices('prod-milk-tea', [
      { modifierId: 'mod-topping', optionId: 'opt-topping-pearl' },
      { modifierId: 'mod-topping', optionId: 'opt-topping-pudding' },
    ]);
    const topping = choices.find(
      (choice) => choice.modifierId === 'mod-topping',
    );

    expect(topping?.maxSelect).toBeGreaterThan(1);
    expect(topping?.selectedOptionIds).toEqual([
      'opt-topping-pearl',
      'opt-topping-pudding',
    ]);
  });

  it('puts the required choices before the optional ones', () => {
    // The guest answers the open ones one at a time, so what blocks the order
    // is asked first. An optional choice being on the list at all is the point:
    // offering it no longer depends on the model remembering to.
    const choices = describeChoices('prod-milk-tea');
    const optional = choices.findIndex((choice) => !choice.isRequired);

    expect(choices[optional]?.modifierId).toBe('mod-topping');
    expect(optional).toBe(choices.length - 1);
    expect(
      choices.slice(0, optional).every((choice) => choice.isRequired),
    ).toBe(true);
  });

  it('names the choice and its options in the guest language', () => {
    const [sugar] = describeChoices('prod-black-tea');

    // Menu data, and the guest reads it, so the backend writes it — never the
    // model. This is also what keeps an internal id out of an option label.
    expect(sugar?.label).toBe('甜度');
    expect(sugar?.options.map((option) => option.label)).toEqual([
      '全糖',
      '半糖',
      '無糖',
    ]);
  });

  it('does not offer a sold-out option', () => {
    const [spice] = describeChoices('prod-beef-noodle');

    expect(spice?.options.map((option) => option.optionId)).toEqual([
      'opt-spice-none',
      'opt-spice-mild',
    ]);
  });

  it('has nothing to describe for a product with no choices', () => {
    expect(describeChoices('prod-rice')).toEqual([]);
  });
});

describe('folding the guest answers back in', () => {
  const sugarChoice: AiOrderingChoiceGroup = {
    modifierId: 'mod-sugar',
    label: '甜度',
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { optionId: 'opt-sugar-half', label: '半糖', priceAdjustment: 0 },
      { optionId: 'opt-sugar-free', label: '無糖', priceAdjustment: 0 },
    ],
    selectedOptionIds: [],
  };

  const toppingChoice: AiOrderingChoiceGroup = {
    modifierId: 'mod-topping',
    label: '加料',
    isRequired: false,
    minSelect: 0,
    maxSelect: 2,
    options: [
      { optionId: 'opt-topping-pearl', label: '珍珠', priceAdjustment: 10 },
      { optionId: 'opt-topping-pudding', label: '布丁', priceAdjustment: 15 },
      { optionId: 'opt-topping-grass', label: '仙草', priceAdjustment: 10 },
    ],
    selectedOptionIds: [],
  };

  /** An add whose `selectedOptions` agree with what its choices say is selected. */
  const operation = (
    choices?: AiOrderingChoiceGroup[],
  ): AiOrderingOperation => {
    const selectedOptions = (choices ?? []).flatMap((choice) =>
      choice.selectedOptionIds.map((optionId) => ({
        modifierId: choice.modifierId,
        optionId,
      })),
    );

    return {
      type: 'add_item',
      operationId: 'op-1',
      summary: '+ 紅茶 ×1',
      item: {
        productId: 'prod-black-tea',
        quantity: 1,
        ...(selectedOptions.length > 0 ? { selectedOptions } : {}),
      },
      ...(choices ? { choices, summaryWithoutChoices: '+ 紅茶 ×1' } : {}),
    };
  };

  const answer = (modifierId: string, optionIds: string[]) => ({
    operationId: 'op-1',
    modifierId,
    optionIds,
  });

  const selectedOptionsOf = (
    result: ReturnType<typeof resolveAiOrderingProposalChoices>,
  ) => {
    if (!result.ok) return 'refused';

    const [resolved] = result.operations;

    return resolved?.type === 'add_item'
      ? resolved.item.selectedOptions
      : 'not an add';
  };

  it('writes the answer into the operation and drops the choice list', () => {
    const result = resolveAiOrderingProposalChoices(
      [operation([sugarChoice])],
      [answer('mod-sugar', ['opt-sugar-free'])],
    );

    expect(selectedOptionsOf(result)).toEqual([
      { modifierId: 'mod-sugar', optionId: 'opt-sugar-free' },
    ]);

    if (!result.ok) return;

    // What goes on to the cart is the answer, not the list it was picked from.
    expect(result.operations[0] && 'choices' in result.operations[0]).toBe(
      false,
    );
    expect(
      result.operations[0] && 'summaryWithoutChoices' in result.operations[0],
    ).toBe(false);
  });

  it("replaces the assistant's answer with the guest's instead of adding to it", () => {
    // The assistant picked half sugar; the guest corrects it on the card. One
    // choice must leave here with ONE answer — appending would send both.
    const result = resolveAiOrderingProposalChoices(
      [operation([{ ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] }])],
      [answer('mod-sugar', ['opt-sugar-free'])],
    );

    expect(selectedOptionsOf(result)).toEqual([
      { modifierId: 'mod-sugar', optionId: 'opt-sugar-free' },
    ]);
  });

  it('keeps what the assistant set for the choices the guest left alone', () => {
    const result = resolveAiOrderingProposalChoices(
      [
        operation([
          { ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] },
          { ...toppingChoice, selectedOptionIds: ['opt-topping-pearl'] },
        ]),
      ],
      [answer('mod-topping', ['opt-topping-pudding'])],
    );

    expect(selectedOptionsOf(result)).toEqual([
      { modifierId: 'mod-sugar', optionId: 'opt-sugar-half' },
      { modifierId: 'mod-topping', optionId: 'opt-topping-pudding' },
    ]);
  });

  it('leaves an operation nobody answered exactly as it was proposed', () => {
    const result = resolveAiOrderingProposalChoices(
      [operation([{ ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] }])],
      [],
    );

    expect(selectedOptionsOf(result)).toEqual([
      { modifierId: 'mod-sugar', optionId: 'opt-sugar-half' },
    ]);
  });

  it('names the operations the guest left different from what was proposed', () => {
    const result = resolveAiOrderingProposalChoices(
      [operation([{ ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] }])],
      [answer('mod-sugar', ['opt-sugar-free'])],
    );

    // This is what gets recorded beside the proposal: the assistant chose half
    // sugar, the guest did not want it, and that is worth knowing afterwards.
    expect(result.ok && result.adjustedOperationIds).toEqual(['op-1']);
  });

  it('does not count an answer that repeats what was already selected', () => {
    // A card may send back every choice it showed. Reading that as a
    // correction would mark every accepted proposal as one the guest fixed.
    const result = resolveAiOrderingProposalChoices(
      [
        operation([
          { ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] },
          {
            ...toppingChoice,
            selectedOptionIds: ['opt-topping-pearl', 'opt-topping-pudding'],
          },
        ]),
      ],
      [
        answer('mod-sugar', ['opt-sugar-half']),
        // The same two toppings in the other order are the same answer.
        answer('mod-topping', ['opt-topping-pudding', 'opt-topping-pearl']),
      ],
    );

    expect(result.ok && result.adjustedOperationIds).toEqual([]);
  });

  it('counts nothing as changed when the guest answered nothing', () => {
    const result = resolveAiOrderingProposalChoices(
      [operation([{ ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] }])],
      [],
    );

    expect(result.ok && result.adjustedOperationIds).toEqual([]);
  });

  it('counts filling in a choice the assistant left open', () => {
    // Not a correction of a mistake, but still not what was proposed: the
    // record of what reached the cart has to carry the option.
    const result = resolveAiOrderingProposalChoices(
      [operation([sugarChoice])],
      [answer('mod-sugar', ['opt-sugar-free'])],
    );

    expect(result.ok && result.adjustedOperationIds).toEqual(['op-1']);
  });

  it('lets the guest clear an optional choice the assistant filled in', () => {
    // An empty answer is "none", and it replaces like any other answer. This is
    // how a guest declines a topping they never asked for.
    const result = resolveAiOrderingProposalChoices(
      [
        operation([
          { ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] },
          { ...toppingChoice, selectedOptionIds: ['opt-topping-pearl'] },
        ]),
      ],
      [answer('mod-topping', [])],
    );

    expect(selectedOptionsOf(result)).toEqual([
      { modifierId: 'mod-sugar', optionId: 'opt-sugar-half' },
    ]);
  });

  it('refuses an option the server never offered', () => {
    // The guard that keeps "ids only, never operation content" true: an answer
    // may only pick from the server's own list, whether it fills a blank or
    // changes an answer, so an id off that list is refused like an invented
    // operation.
    const result = resolveAiOrderingProposalChoices(
      [operation([{ ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] }])],
      [answer('mod-sugar', ['opt-sugar-full'])],
    );

    expect(result.ok).toBe(false);
  });

  it('refuses a required choice left unanswered', () => {
    // The card blocks the button, but the button is not the guarantee.
    const result = resolveAiOrderingProposalChoices(
      [operation([sugarChoice])],
      [],
    );

    expect(result.ok).toBe(false);
  });

  it('refuses clearing a required choice', () => {
    const result = resolveAiOrderingProposalChoices(
      [operation([{ ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] }])],
      [answer('mod-sugar', [])],
    );

    expect(result.ok).toBe(false);
  });

  it('treats an optional choice left alone as declined', () => {
    const result = resolveAiOrderingProposalChoices(
      [operation([toppingChoice])],
      [],
    );

    expect(result.ok).toBe(true);
  });

  it('takes several answers for a multi-select choice, up to its maximum', () => {
    const two = resolveAiOrderingProposalChoices(
      [operation([toppingChoice])],
      [answer('mod-topping', ['opt-topping-pearl', 'opt-topping-pudding'])],
    );

    expect(selectedOptionsOf(two)).toEqual([
      { modifierId: 'mod-topping', optionId: 'opt-topping-pearl' },
      { modifierId: 'mod-topping', optionId: 'opt-topping-pudding' },
    ]);

    const three = resolveAiOrderingProposalChoices(
      [operation([toppingChoice])],
      [
        answer('mod-topping', [
          'opt-topping-pearl',
          'opt-topping-pudding',
          'opt-topping-grass',
        ]),
      ],
    );

    expect(three.ok).toBe(false);
  });

  it('refuses a multi-select answer below its minimum', () => {
    const pickTwo = { ...toppingChoice, isRequired: true, minSelect: 2 };
    const result = resolveAiOrderingProposalChoices(
      [operation([pickTwo])],
      [answer('mod-topping', ['opt-topping-pearl'])],
    );

    expect(result.ok).toBe(false);
  });

  it('refuses an answer to a choice the operation does not list', () => {
    const result = resolveAiOrderingProposalChoices(
      [operation([sugarChoice])],
      [
        answer('mod-sugar', ['opt-sugar-free']),
        answer('mod-ice', ['opt-ice-less']),
      ],
    );

    expect(result.ok).toBe(false);
    expect(
      resolveAiOrderingProposalChoices(
        [operation()],
        [answer('mod-sugar', ['opt-sugar-free'])],
      ).ok,
    ).toBe(false);
  });

  it('refuses an answer aimed at a removal', () => {
    const result = resolveAiOrderingProposalChoices(
      [
        {
          type: 'remove_own_item',
          operationId: 'op-1',
          summary: '− 紅茶',
          itemId: 'item-1',
        },
      ],
      [answer('mod-sugar', ['opt-sugar-free'])],
    );

    expect(result.ok).toBe(false);
  });

  it('sets the options on an update that had only changed the quantity', () => {
    // The choices describe the item as it will be, so they carry what the cart
    // item already has. Changing one has to send the whole set: an update's
    // `selectedOptions` replaces, it does not merge.
    const result = resolveAiOrderingProposalChoices(
      [
        {
          type: 'update_own_item',
          operationId: 'op-1',
          summary: '紅茶 → ×2',
          summaryWithoutChoices: '紅茶 → ×2',
          itemId: 'item-1',
          item: { quantity: 2 },
          choices: [
            { ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] },
            { ...toppingChoice, selectedOptionIds: ['opt-topping-pearl'] },
          ],
        },
      ],
      [answer('mod-sugar', ['opt-sugar-free'])],
    );

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    const [resolved] = result.operations;

    expect(resolved?.type === 'update_own_item' && resolved.item).toEqual({
      quantity: 2,
      selectedOptions: [
        { modifierId: 'mod-sugar', optionId: 'opt-sugar-free' },
        { modifierId: 'mod-topping', optionId: 'opt-topping-pearl' },
      ],
    });
  });

  it('does not touch the options of an update the guest left alone', () => {
    const result = resolveAiOrderingProposalChoices(
      [
        {
          type: 'update_own_item',
          operationId: 'op-1',
          summary: '紅茶 → ×2',
          summaryWithoutChoices: '紅茶 → ×2',
          itemId: 'item-1',
          item: { quantity: 2 },
          choices: [{ ...sugarChoice, selectedOptionIds: ['opt-sugar-half'] }],
        },
      ],
      [],
    );

    expect(result.ok).toBe(true);

    if (!result.ok) return;

    const [resolved] = result.operations;

    expect(resolved?.type === 'update_own_item' && resolved.item).toEqual({
      quantity: 2,
    });
  });
});

describe('the choices a hydrated proposal carries', () => {
  const hydrate = (
    operations: Extract<
      Parameters<typeof hydrateAiOrderingResponse>[0],
      { type: 'proposal' }
    >['operations'],
  ) => {
    const response = hydrateAiOrderingResponse(
      { type: 'proposal', reply: '好的。', operations },
      {
        confirmationRequired: true,
        newId: (prefix) => `${prefix}-1`,
        label: {
          menu: AI_ORDERING_MENU_FIXTURE,
          cart: AI_ORDERING_CART_FIXTURE,
          locale: 'zh-TW',
        },
      },
    );

    if (response.type !== 'proposal') throw new Error('not a proposal');

    return response.operations;
  };

  const selected = (operation: AiOrderingOperation | undefined) =>
    operation && operation.type !== 'remove_own_item'
      ? Object.fromEntries(
          (operation.choices ?? []).map((choice) => [
            choice.modifierId,
            choice.selectedOptionIds,
          ]),
        )
      : undefined;

  it("carries a choice the assistant answered, with the assistant's answer", () => {
    const [add] = hydrate([
      {
        type: 'add_item',
        item: {
          productId: 'prod-black-tea',
          quantity: 1,
          selectedOptions: [
            { modifierId: 'mod-sugar', optionId: 'opt-sugar-free' },
          ],
        },
      },
    ]);

    expect(selected(add)).toMatchObject({ 'mod-sugar': ['opt-sugar-free'] });
  });

  it('gives a second line without the choices, for the card that shows them', () => {
    const [add] = hydrate([
      {
        type: 'add_item',
        item: {
          productId: 'prod-black-tea',
          quantity: 1,
          selectedOptions: [
            { modifierId: 'mod-sugar', optionId: 'opt-sugar-free' },
          ],
        },
      },
    ]);

    // `summary` keeps naming what the assistant proposed. Beside a choice the
    // guest has since changed it would contradict the card, so the card reads
    // this one instead.
    expect(add?.summary).toBe('+ 紅茶 ×1 · 無糖');
    expect(add?.type === 'add_item' && add.summaryWithoutChoices).toBe(
      '+ 紅茶 ×1',
    );
  });

  it('describes an updated item with what the cart item already has', () => {
    // Only the quantity changes, so the options the item will have are the ones
    // it has now.
    const [update] = hydrate([
      {
        type: 'update_own_item',
        itemId: 'item-own-milk-tea',
        item: { quantity: 2 },
      },
    ]);

    expect(selected(update)).toEqual({
      'mod-sugar': ['opt-sugar-half'],
      'mod-ice': ['opt-ice-less'],
      'mod-topping': [],
    });
  });

  it('describes an updated item with the options the update sets', () => {
    // An update's `selectedOptions` replaces the whole set, so what the cart
    // item had is no longer part of the result.
    const [update] = hydrate([
      {
        type: 'update_own_item',
        itemId: 'item-own-milk-tea',
        item: {
          selectedOptions: [
            { modifierId: 'mod-sugar', optionId: 'opt-sugar-free' },
          ],
        },
      },
    ]);

    expect(selected(update)).toEqual({
      'mod-sugar': ['opt-sugar-free'],
      'mod-ice': [],
      'mod-topping': [],
    });
  });

  it('carries no choices for a removal or a product without any', () => {
    const [remove, rice] = hydrate([
      { type: 'remove_own_item', itemId: 'item-own-milk-tea' },
      { type: 'add_item', item: { productId: 'prod-rice', quantity: 1 } },
    ]);

    expect(remove && 'choices' in remove).toBe(false);
    expect(rice && 'choices' in rice).toBe(false);
    expect(rice && 'summaryWithoutChoices' in rice).toBe(false);
  });
});
