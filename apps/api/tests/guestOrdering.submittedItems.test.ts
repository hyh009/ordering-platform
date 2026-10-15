import { describe, expect, it } from 'vitest';

import {
  CartRepricedError,
  checkSubmittedItems,
  hasSameSelection,
} from '../src/modules/guestOrdering/submittedItems.js';

import type { CartItemSnapshot } from '../src/models/cart/model.js';
import type { ProductEntity } from '../src/models/product/model.js';
import type { ProductModifierEntity } from '../src/models/productModifier/model.js';
import type { CartDto } from '@repo/shared';

const now = new Date();

function product(overrides: Partial<ProductEntity> = {}): ProductEntity {
  return {
    id: 'product-1',
    organizationId: 'org-1',
    storeId: 'store-1',
    categoryIds: [],
    name: { en: 'Beef Curry Rice' },
    imageUrls: [],
    price: 180,
    tagIds: [],
    allergenIds: [],
    dietaryMarkerIds: [],
    modifierIds: ['modifier-1'],
    status: 'published',
    isActive: true,
    isSoldOut: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as ProductEntity;
}

function modifier(priceAdjustment = 20): ProductModifierEntity {
  return {
    id: 'modifier-1',
    storeId: 'store-1',
    name: { en: 'Size' },
    selectionType: 'single_choice',
    minSelect: 1,
    maxSelect: 1,
    options: [
      {
        id: 'option-large',
        name: { en: 'Large' },
        priceAdjustment,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
      },
    ],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  } as ProductModifierEntity;
}

// A line carted at product 180 + large 20.
function line(overrides: Partial<CartItemSnapshot> = {}): CartItemSnapshot {
  return {
    id: 'item-1',
    productId: 'product-1',
    productName: { en: 'Beef Curry Rice' },
    quantity: 2,
    unitPrice: 200,
    selectedOptions: [
      {
        modifierId: 'modifier-1',
        modifierName: { en: 'Size' },
        optionId: 'option-large',
        optionName: { en: 'Large' },
        priceAdjustment: 20,
      },
    ],
    totalItemPrice: 400,
    createdAt: now,
    ...overrides,
  };
}

function check(
  items: CartItemSnapshot[],
  products: ProductEntity[],
  modifiers: ProductModifierEntity[],
) {
  return checkSubmittedItems(
    items,
    new Map(products.map((entry) => [entry.id, entry])),
    new Map(modifiers.map((entry) => [entry.id, entry])),
  );
}

describe('checkSubmittedItems', () => {
  it('reports nothing when every line still costs what it stored', () => {
    expect(check([line()], [product()], [modifier()])).toEqual({
      unavailable: [],
      repriced: [],
    });
  });

  it('reports a product price that rose', () => {
    const result = check([line()], [product({ price: 190 })], [modifier()]);

    expect(result.repriced).toEqual([
      {
        previousUnitPrice: 200,
        item: expect.objectContaining({ id: 'item-1', unitPrice: 210 }),
      },
    ]);
  });

  it('reports a product price that fell, the same as a rise', () => {
    const result = check([line()], [product({ price: 150 })], [modifier()]);

    expect(result.repriced).toEqual([
      {
        previousUnitPrice: 200,
        item: expect.objectContaining({ unitPrice: 170 }),
      },
    ]);
  });

  it('reprices a changed option adjustment, the total and the option', () => {
    const result = check([line()], [product()], [modifier(30)]);

    expect(result.repriced).toEqual([
      {
        previousUnitPrice: 200,
        item: expect.objectContaining({
          unitPrice: 210,
          totalItemPrice: 420,
          selectedOptions: [expect.objectContaining({ priceAdjustment: 30 })],
        }),
      },
    ]);
  });

  it('lists only the lines that changed', () => {
    const unchanged = line({
      id: 'item-2',
      productId: 'product-2',
      selectedOptions: [],
      unitPrice: 90,
    });
    const result = check(
      [line(), unchanged],
      [
        product({ price: 190 }),
        product({ id: 'product-2', price: 90, modifierIds: [] }),
      ],
      [modifier()],
    );

    expect(result.repriced.map(({ item }) => item.id)).toEqual(['item-1']);
  });

  it('does not price a line that is unavailable', () => {
    const result = check(
      [line()],
      [product({ price: 190, isSoldOut: true })],
      [modifier()],
    );

    expect(result.unavailable).toEqual([
      { itemId: 'item-1', productId: 'product-1', reason: 'product_sold_out' },
    ]);
    expect(result.repriced).toEqual([]);
  });
});

describe('hasSameSelection', () => {
  const small = {
    modifierId: 'modifier-2',
    modifierName: { en: 'Ice' },
    optionId: 'option-less',
    optionName: { en: 'Less ice' },
    priceAdjustment: 0,
  };

  it('ignores the order options were selected in', () => {
    const a = line({ selectedOptions: [...line().selectedOptions, small] });
    const b = line({ selectedOptions: [small, ...line().selectedOptions] });

    expect(hasSameSelection(a, b)).toBe(true);
  });

  it('tells apart a line whose options were edited', () => {
    expect(hasSameSelection(line(), line({ selectedOptions: [small] }))).toBe(
      false,
    );
  });
});

describe('CartRepricedError', () => {
  it('reports each changed line with its previous and current price', () => {
    const [repriced] = check(
      [line()],
      [product({ price: 190 })],
      [modifier()],
    ).repriced;
    const error = new CartRepricedError([repriced!], {} as CartDto);

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('PRICE_CHANGED');
    expect(error.details).toEqual({
      changedItems: [
        {
          itemId: 'item-1',
          productId: 'product-1',
          previousUnitPrice: 200,
          currentUnitPrice: 210,
        },
      ],
    });
  });
});
