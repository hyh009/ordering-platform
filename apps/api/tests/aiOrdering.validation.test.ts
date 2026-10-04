import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_MENU_FIXTURE,
} from './fixtures/aiOrdering.js';
import { validateAiOrderingOperations } from '../src/modules/aiOrdering/validation.js';

import type {
  AiOrderingModelOperation,
  AiOrderingModelResponse,
} from '../src/modules/aiOrdering/modelResponse.js';

const input = {
  menu: AI_ORDERING_MENU_FIXTURE,
  cart: AI_ORDERING_CART_FIXTURE,
  participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
};

function proposal(
  ...operations: AiOrderingModelOperation[]
): AiOrderingModelResponse {
  return { type: 'proposal', reply: 'Here you go.', operations };
}

function validate(...operations: AiOrderingModelOperation[]) {
  return validateAiOrderingOperations(proposal(...operations), input);
}

describe('AI ordering operation validation', () => {
  describe('check 1: the product exists', () => {
    it('rejects a product that is not on this store menu', () => {
      const result = validate({
        type: 'add_item',
        summary: 'Add a phantom',
        item: { productId: 'prod-does-not-exist', quantity: 1 },
      });

      expect(result.operations).toHaveLength(0);
      expect(result.rejections[0]?.code).toBe('product_not_found');
    });
  });

  describe('check 2: the product is available', () => {
    it('rejects a sold-out product', () => {
      const result = validate({
        type: 'add_item',
        summary: 'Add the cutlet',
        item: { productId: 'prod-fried-chicken', quantity: 1 },
      });

      expect(result.operations).toHaveLength(0);
      expect(result.rejections[0]?.code).toBe('product_sold_out');
    });
  });

  describe('check 3: option selections satisfy the product rules', () => {
    it('rejects a required choice that was not made', () => {
      // Beef noodle requires a spice level; omitting it would fail on accept.
      const result = validate({
        type: 'add_item',
        summary: 'Add beef noodles',
        item: { productId: 'prod-beef-noodle', quantity: 1 },
      });

      expect(result.operations).toHaveLength(0);
      expect(result.rejections[0]?.code).toBe('modifier_invalid');
      expect(result.rejections[0]?.detail).toContain('mod-spice');
    });

    it('rejects a sold-out option', () => {
      const result = validate({
        type: 'add_item',
        summary: 'Add hot beef noodles',
        item: {
          productId: 'prod-beef-noodle',
          quantity: 1,
          selectedOptions: [
            { modifierId: 'mod-spice', optionId: 'opt-spice-hot' },
          ],
        },
      });

      expect(result.operations).toHaveLength(0);
      expect(result.rejections[0]?.code).toBe('modifier_invalid');
      expect(result.rejections[0]?.detail).toContain('sold out');
    });

    it('rejects an option that belongs to another product', () => {
      const result = validate({
        type: 'add_item',
        summary: 'Add spicy rice',
        item: {
          productId: 'prod-rice',
          quantity: 1,
          selectedOptions: [
            { modifierId: 'mod-spice', optionId: 'opt-spice-mild' },
          ],
        },
      });

      expect(result.rejections[0]?.code).toBe('modifier_invalid');
    });

    it('rejects more selections than a modifier allows', () => {
      const result = validate({
        type: 'add_item',
        summary: 'Add a very sweet tea',
        item: {
          productId: 'prod-black-tea',
          quantity: 1,
          selectedOptions: [
            { modifierId: 'mod-sugar', optionId: 'opt-sugar-full' },
            { modifierId: 'mod-sugar', optionId: 'opt-sugar-half' },
            { modifierId: 'mod-ice', optionId: 'opt-ice-normal' },
          ],
        },
      });

      expect(result.rejections[0]?.code).toBe('modifier_invalid');
      expect(result.rejections[0]?.detail).toContain('at most');
    });

    it('accepts a product whose optional modifier is simply omitted', () => {
      // Toppings are min 0: not choosing any is valid.
      const result = validate({
        type: 'add_item',
        summary: 'Add a milk tea',
        item: {
          productId: 'prod-milk-tea',
          quantity: 1,
          selectedOptions: [
            { modifierId: 'mod-sugar', optionId: 'opt-sugar-half' },
            { modifierId: 'mod-ice', optionId: 'opt-ice-less' },
          ],
        },
      });

      expect(result.rejections).toHaveLength(0);
      expect(result.operations).toHaveLength(1);
    });

    it('accepts a product with no modifiers at all', () => {
      const result = validate({
        type: 'add_item',
        summary: 'Add rice',
        item: { productId: 'prod-rice', quantity: 1 },
      });

      expect(result.rejections).toHaveLength(0);
      expect(result.operations).toHaveLength(1);
    });
  });

  describe('check 4: the item belongs to this guest', () => {
    it("rejects changing another participant's item", () => {
      const result = validate({
        type: 'update_own_item',
        summary: 'Make the beef noodles two',
        itemId: 'item-other-beef',
        item: { quantity: 2 },
      });

      expect(result.operations).toHaveLength(0);
      expect(result.rejections[0]?.code).toBe('not_owned');
      expect(result.ownershipViolationCount).toBe(1);
    });

    it("rejects removing another participant's item", () => {
      const result = validate({
        type: 'remove_own_item',
        summary: 'Remove the beef noodles',
        itemId: 'item-other-beef',
      });

      expect(result.rejections[0]?.code).toBe('not_owned');
      expect(result.ownershipViolationCount).toBe(1);
    });

    it('rejects an item that is not in the cart at all', () => {
      const result = validate({
        type: 'remove_own_item',
        summary: 'Remove something',
        itemId: 'item-never-existed',
      });

      expect(result.rejections[0]?.code).toBe('not_owned');
    });

    it('accepts changing the guest own item', () => {
      // Three, not two: the fixture item is already at two, and an update to the
      // value an item already holds is rejected as changing nothing.
      const result = validate({
        type: 'update_own_item',
        summary: 'Make it three',
        itemId: 'item-own-rice',
        item: { quantity: 3 },
      });

      expect(result.rejections).toHaveLength(0);
      expect(result.operations).toHaveLength(1);
    });

    it('validates option changes on an owned item too', () => {
      const result = validate({
        type: 'update_own_item',
        summary: 'Make the tea hot',
        itemId: 'item-own-milk-tea',
        item: {
          selectedOptions: [
            { modifierId: 'mod-spice', optionId: 'opt-spice-mild' },
          ],
        },
      });

      expect(result.rejections[0]?.code).toBe('modifier_invalid');
    });
  });

  describe('partial results', () => {
    it('keeps the valid operations and reports only the invalid ones', () => {
      const result = validate(
        {
          type: 'add_item',
          summary: 'Add rice',
          item: { productId: 'prod-rice', quantity: 1 },
        },
        {
          type: 'add_item',
          summary: 'Add the sold-out cutlet',
          item: { productId: 'prod-fried-chicken', quantity: 1 },
        },
      );

      expect(result.operations).toHaveLength(1);
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0]?.index).toBe(1);
    });

    it('counts every ownership violation as a version quality signal', () => {
      const result = validate(
        {
          type: 'remove_own_item',
          summary: 'Remove the beef',
          itemId: 'item-other-beef',
        },
        {
          type: 'update_own_item',
          summary: 'Change the beef',
          itemId: 'item-other-beef',
          item: { quantity: 3 },
        },
      );

      expect(result.ownershipViolationCount).toBe(2);
    });
  });

  it('passes non-proposal responses through untouched', () => {
    const result = validateAiOrderingOperations(
      { type: 'message', reply: 'It is a milk tea.' },
      input,
    );

    expect(result.operations).toHaveLength(0);
    expect(result.rejections).toHaveLength(0);
  });
});

describe('check 5: the operation changes something', () => {
  it('rejects a quantity the item already has', () => {
    // The shape this change came from: valid against the menu, valid against
    // the cart, and completely pointless. It reached the guest as an action and
    // reported success.
    const result = validate({
      type: 'update_own_item',
      itemId: 'item-own-rice',
      item: { quantity: 2 },
    });

    expect(result.operations).toHaveLength(0);
    expect(result.rejections[0]?.code).toBe('no_change');
  });

  it('rejects the same options in a different order', () => {
    const current = AI_ORDERING_CART_FIXTURE.items.find(
      (item) => item.id === 'item-own-milk-tea',
    );

    if (!current) throw new Error('fixture item missing');

    const reversed = [...current.selectedOptions].reverse().map((option) => ({
      modifierId: option.modifierId,
      optionId: option.optionId,
    }));

    // Order carries no meaning in a selection, so reordering is not a change.
    const result = validate({
      type: 'update_own_item',
      itemId: 'item-own-milk-tea',
      item: { selectedOptions: reversed },
    });

    expect(result.rejections[0]?.code).toBe('no_change');
  });

  it('rejects clearing a note on an item that has none', () => {
    const result = validate({
      type: 'update_own_item',
      itemId: 'item-own-rice',
      item: { notes: null },
    });

    expect(result.rejections[0]?.code).toBe('no_change');
  });

  it('keeps an operation that changes one field and repeats another', () => {
    // A redundant field alongside a real change is still a change. The check
    // fires only when EVERY supplied field already matches.
    const result = validate({
      type: 'update_own_item',
      itemId: 'item-own-rice',
      item: { quantity: 2, notes: '少鹽' },
    });

    expect(result.rejections).toHaveLength(0);
    expect(result.operations).toHaveLength(1);
  });

  it('keeps an operation that only adds a note', () => {
    const result = validate({
      type: 'update_own_item',
      itemId: 'item-own-rice',
      item: { notes: '加辣' },
    });

    expect(result.rejections).toHaveLength(0);
    expect(result.operations).toHaveLength(1);
  });

  it('tells the model what was empty rather than only that it was wrong', () => {
    const result = validate({
      type: 'update_own_item',
      itemId: 'item-own-rice',
      item: { quantity: 2 },
    });

    // This detail becomes the repair note. "Try again" without saying what was
    // empty is how a model repeats itself.
    expect(result.rejections[0]?.detail).toContain('changes nothing');
    expect(result.rejections[0]?.detail).toContain('already');
  });

  it('degrades a proposal of only no-ops to a reply, not an empty proposal', () => {
    const result = validate(
      {
        type: 'update_own_item',
        itemId: 'item-own-rice',
        item: { quantity: 2 },
      },
      {
        type: 'update_own_item',
        itemId: 'item-own-rice',
        item: { notes: null },
      },
    );

    // Nothing survives, so there is no proposal to show. What the guest reads
    // instead is the planning middleware's concern, not validation's.
    expect(result.operations).toHaveLength(0);
    expect(result.rejections).toHaveLength(2);
  });
});
