import { describe, expect, it } from 'vitest';

import {
  buildInitialSelection,
  orderModifiersRequiredFirst,
} from '@/features/storeFront/components/useProductConfig';

import { canEditCartItem, resolveCartItemEdit } from './cartItemEdit';

import type { CartItem } from '@/models/cart';
import type { PublicMenu, PublicModifier } from '@/models/storeFrontMenu';

function modifier(
  id: string,
  overrides: Partial<PublicModifier> = {},
): PublicModifier {
  return {
    id,
    name: { en: id },
    selectionType: 'single_choice',
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: `${id}-a`, name: { en: 'A' }, priceAdjustment: 0 },
      { id: `${id}-b`, name: { en: 'B' }, priceAdjustment: 10 },
    ],
    ...overrides,
  } as unknown as PublicModifier;
}

const sugar = modifier('sugar');
const ice = modifier('ice');
const toppings = modifier('toppings', {
  selectionType: 'multiple_choice',
  minSelect: 0,
  maxSelect: 2,
});

const menu = {
  groups: [
    {
      category: null,
      products: [
        {
          id: 'tea',
          name: { en: 'Black tea' },
          price: 30,
          modifierIds: ['toppings', 'sugar', 'ice', 'not-on-menu'],
          isSoldOut: false,
        },
      ],
    },
  ],
  modifiers: [sugar, ice, toppings],
} as unknown as PublicMenu;

function cartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'line-1',
    productId: 'tea',
    productName: { en: 'Black tea' },
    quantity: 2,
    unitPrice: 30,
    selectedOptions: [
      {
        modifierId: 'sugar',
        modifierName: { en: 'sugar' },
        optionId: 'sugar-b',
        optionName: { en: 'B' },
        priceAdjustment: 10,
      },
    ],
    addedByParticipantId: 'me',
    totalItemPrice: 60,
    createdAt: '2026-10-07T00:00:00.000Z',
    ...overrides,
  };
}

describe('who may edit a cart item', () => {
  it('lets a guest edit an item they added', () => {
    expect(canEditCartItem(cartItem(), 'me')).toBe(true);
  });

  it("does not let a guest edit another guest's item", () => {
    expect(canEditCartItem(cartItem(), 'someone-else')).toBe(false);
  });

  it('does not let a session with no participant edit anything', () => {
    expect(canEditCartItem(cartItem(), null)).toBe(false);
    expect(
      canEditCartItem(cartItem({ addedByParticipantId: undefined }), null),
    ).toBe(false);
  });
});

describe('resolveCartItemEdit', () => {
  it("opens the picker on a guest's own item, seeded with what it holds", () => {
    const resolution = resolveCartItemEdit({
      item: cartItem({ notes: 'less ice' }),
      participantId: 'me',
      menu,
    });

    expect(resolution.status).toBe('editable');
    if (resolution.status !== 'editable') return;

    expect(resolution.target.product.id).toBe('tea');
    // The product's modifiers, in the product's order; one the menu no longer
    // has is left out rather than offered empty.
    expect(resolution.target.modifiers.map((entry) => entry.id)).toEqual([
      'toppings',
      'sugar',
      'ice',
    ]);
    expect(resolution.target.initial).toEqual({
      quantity: 2,
      notes: 'less ice',
      selectedOptions: [{ modifierId: 'sugar', optionId: 'sugar-b' }],
    });
  });

  it("refuses another guest's item", () => {
    expect(
      resolveCartItemEdit({ item: cartItem(), participantId: 'other', menu }),
    ).toEqual({ status: 'not-owner' });
  });

  it('reports an item whose product has left the menu', () => {
    expect(
      resolveCartItemEdit({
        item: cartItem({ productId: 'discontinued' }),
        participantId: 'me',
        menu,
      }),
    ).toEqual({ status: 'unavailable' });
  });
});

describe('what the picker opens on', () => {
  const modifiers = [toppings, sugar, ice];

  it('asks required choices before optional ones', () => {
    expect(
      orderModifiersRequiredFirst(modifiers).map((entry) => entry.id),
    ).toEqual(['sugar', 'ice', 'toppings']);
  });

  it("uses the item's own selection, not the menu's defaults", () => {
    const withDefault = modifier('sugar', {
      options: [
        {
          id: 'sugar-a',
          name: { en: 'A' },
          priceAdjustment: 0,
          isDefault: true,
        },
        { id: 'sugar-b', name: { en: 'B' }, priceAdjustment: 0 },
      ],
    } as Partial<PublicModifier>);

    expect(
      buildInitialSelection([withDefault], {
        quantity: 1,
        selectedOptions: [{ modifierId: 'sugar', optionId: 'sugar-b' }],
      }),
    ).toEqual({ sugar: ['sugar-b'] });
    // Adding still starts from the defaults.
    expect(buildInitialSelection([withDefault])).toEqual({
      sugar: ['sugar-a'],
    });
  });

  it('leaves a choice empty when the option the item held has sold out', () => {
    const soldOut = modifier('sugar', {
      options: [
        { id: 'sugar-a', name: { en: 'A' }, priceAdjustment: 0 },
        {
          id: 'sugar-b',
          name: { en: 'B' },
          priceAdjustment: 0,
          isSoldOut: true,
        },
      ],
    } as Partial<PublicModifier>);

    expect(
      buildInitialSelection([soldOut, ice], {
        quantity: 1,
        selectedOptions: [
          { modifierId: 'sugar', optionId: 'sugar-b' },
          { modifierId: 'ice', optionId: 'ice-a' },
          { modifierId: 'gone', optionId: 'gone-a' },
        ],
      }),
    ).toEqual({ sugar: [], ice: ['ice-a'] });
  });
});
