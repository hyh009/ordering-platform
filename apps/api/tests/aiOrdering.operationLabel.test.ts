import { describe, expect, it } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_MENU_FIXTURE,
} from './fixtures/aiOrdering.js';
import { buildAiOrderingOperationLabel } from '../src/modules/aiOrdering/operationLabel.js';

import type { AiOrderingOperation } from '@repo/shared';

const context = {
  menu: AI_ORDERING_MENU_FIXTURE,
  cart: AI_ORDERING_CART_FIXTURE,
  locale: 'zh-TW' as const,
};

function label(operation: AiOrderingOperation): string {
  return buildAiOrderingOperationLabel(operation, context);
}

describe('AI ordering operation labels', () => {
  it('names the product and the quantity on an add', () => {
    expect(
      label({
        type: 'add_item',
        operationId: 'op-1',
        summary: '',
        item: { productId: 'prod-rice', quantity: 2 },
      }),
    ).toBe('+ 白飯 ×2');
  });

  it('names the chosen options on an add', () => {
    expect(
      label({
        type: 'add_item',
        operationId: 'op-1',
        summary: '',
        item: {
          productId: 'prod-milk-tea',
          quantity: 1,
          selectedOptions: [
            { modifierId: 'mod-sugar', optionId: 'opt-sugar-half' },
          ],
        },
      }),
    ).toContain('半糖');
  });

  it('carries a note, because that is what the model kept failing to specify', () => {
    expect(
      label({
        type: 'add_item',
        operationId: 'op-1',
        summary: '',
        item: { productId: 'prod-rice', quantity: 1, notes: '加辣' },
      }),
    ).toBe('+ 白飯 ×1 · “加辣”');
  });

  it('names only what an update changes', () => {
    // The label describes the OPERATION, not the item. Listing the untouched
    // parts is how a label starts claiming more than the operation does.
    expect(
      label({
        type: 'update_own_item',
        operationId: 'op-1',
        summary: '',
        itemId: 'item-own-milk-tea',
        item: { quantity: 3 },
      }),
    ).toBe('珍珠奶茶 → ×3');
  });

  it('names a note-only update without mentioning the quantity', () => {
    const result = label({
      type: 'update_own_item',
      operationId: 'op-1',
      summary: '',
      itemId: 'item-own-milk-tea',
      item: { notes: '加辣' },
    });

    expect(result).toBe('珍珠奶茶 → “加辣”');
    expect(result).not.toContain('×');
  });

  it('names a quantity and options change together', () => {
    const result = label({
      type: 'update_own_item',
      operationId: 'op-1',
      summary: '',
      itemId: 'item-own-milk-tea',
      item: {
        quantity: 2,
        selectedOptions: [
          { modifierId: 'mod-sugar', optionId: 'opt-sugar-free' },
        ],
      },
    });

    expect(result).toContain('×2');
    expect(result).toContain('無糖');
  });

  it('says a note was removed rather than showing an empty one', () => {
    expect(
      label({
        type: 'update_own_item',
        operationId: 'op-1',
        summary: '',
        itemId: 'item-own-milk-tea',
        item: { notes: null },
      }),
    ).toContain('移除備註');
  });

  it('writes the label in the locale it is given', () => {
    const english = { ...context, locale: 'en' as const };

    expect(
      buildAiOrderingOperationLabel(
        {
          type: 'add_item',
          operationId: 'op-1',
          summary: '',
          item: { productId: 'prod-rice', quantity: 2 },
        },
        english,
      ),
    ).toBe('+ Steamed rice ×2');
    expect(
      buildAiOrderingOperationLabel(
        {
          type: 'update_own_item',
          operationId: 'op-1',
          summary: '',
          itemId: 'item-own-milk-tea',
          item: { notes: null },
        },
        english,
      ),
    ).toContain('note removed');
  });

  it('uses a name the menu does carry when it has none in that locale', () => {
    // A store that never translated a product still has a name for it, and an
    // id is not something a guest can read.
    const untranslated = {
      ...context,
      locale: 'en' as const,
      menu: {
        ...AI_ORDERING_MENU_FIXTURE,
        groups: AI_ORDERING_MENU_FIXTURE.groups.map((group) => ({
          ...group,
          products: group.products.map((product) =>
            product.id === 'prod-rice'
              ? { ...product, name: { 'zh-TW': '白飯' } }
              : product,
          ),
        })),
      },
    };

    expect(
      buildAiOrderingOperationLabel(
        {
          type: 'add_item',
          operationId: 'op-1',
          summary: '',
          item: { productId: 'prod-rice', quantity: 1 },
        },
        untranslated,
      ),
    ).toBe('+ 白飯 ×1');
  });

  it('names the item on a removal', () => {
    expect(
      label({
        type: 'remove_own_item',
        operationId: 'op-1',
        summary: '',
        itemId: 'item-own-milk-tea',
      }),
    ).toBe('− 珍珠奶茶');
  });

  it('falls back to the id rather than inventing a name', () => {
    // Validation rejects an unknown product before this runs, so reaching the
    // fallback means something upstream changed; an id is debuggable, a guessed
    // name is not.
    expect(
      label({
        type: 'add_item',
        operationId: 'op-1',
        summary: '',
        item: { productId: 'prod-not-on-the-menu', quantity: 1 },
      }),
    ).toContain('prod-not-on-the-menu');
  });
});
