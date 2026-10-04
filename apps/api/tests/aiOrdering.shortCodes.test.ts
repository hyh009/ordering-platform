import { describe, expect, it } from 'vitest';

import {
  buildAiOrderingIdCodec,
  decodeAiOrderingModelResponse,
} from '../src/modules/aiOrdering/shortCodes.js';

const RICE = 'product-1a2b3c4d-0000-4000-8000-000000000001';
const TEA = 'product-9f8e7d6c-0000-4000-8000-000000000002';
const SUGAR = 'product-modifier-aaaa1111-0000-4000-8000-000000000003';
const NO_SUGAR = 'product-modifier-option-bbbb2222-0000-4000-8000-000000000004';
const CART_RICE = 'cart-item-cccc3333-0000-4000-8000-000000000005';

describe('AI ordering short codes', () => {
  it('shortens an id to the first eight digits of its UUID', () => {
    const codec = buildAiOrderingIdCodec([RICE, TEA]);

    expect(codec.encode(RICE)).toBe('1a2b3c4d');
    expect(codec.decode('1a2b3c4d')).toBe(RICE);
  });

  it('gives an id the same code whatever else is on the menu', () => {
    // Derived, not numbered. A numbered code would move when the menu did, and
    // one the model carried over would then name a different product.
    const before = buildAiOrderingIdCodec([RICE]);
    const after = buildAiOrderingIdCodec([TEA, SUGAR, RICE]);

    expect(after.encode(RICE)).toBe(before.encode(RICE));
  });

  it('keeps both full ids when two share their first eight digits', () => {
    const twin = 'product-modifier-1a2b3c4d-9999-4000-8000-000000000009';
    const codec = buildAiOrderingIdCodec([RICE, twin, TEA]);

    expect(codec.encode(RICE)).toBe(RICE);
    expect(codec.encode(twin)).toBe(twin);
    // The code names neither, so it is not quietly resolved to one of them.
    expect(codec.decode('1a2b3c4d')).toBe('1a2b3c4d');
    expect(codec.encode(TEA)).toBe('9f8e7d6c');
  });

  it('leaves an id with no UUID in it alone', () => {
    const codec = buildAiOrderingIdCodec(['prod-rice']);

    expect(codec.encode('prod-rice')).toBe('prod-rice');
    expect(codec.decode('prod-rice')).toBe('prod-rice');
  });

  it('leaves an unknown code as the model wrote it', () => {
    const codec = buildAiOrderingIdCodec([RICE]);

    expect(codec.decode('deadbeef')).toBe('deadbeef');
    // An id from outside this turn's menu and cart is not shortened either.
    expect(codec.encode(TEA)).toBe(TEA);
  });

  it('still accepts a full id', () => {
    expect(buildAiOrderingIdCodec([RICE]).decode(RICE)).toBe(RICE);
  });

  it('rewrites the quoted ids in a validation message', () => {
    const codec = buildAiOrderingIdCodec([RICE]);

    // The repair note is read by a model that only ever saw the code.
    expect(codec.encodeText(`product "${RICE}" is sold out`)).toBe(
      'product "1a2b3c4d" is sold out',
    );
  });

  it('decodes every id an answer can carry', () => {
    const codec = buildAiOrderingIdCodec([RICE, SUGAR, NO_SUGAR, CART_RICE]);

    const decoded = decodeAiOrderingModelResponse(
      {
        type: 'proposal',
        reply: 'ok',
        operations: [
          {
            type: 'add_item',
            item: {
              productId: '1a2b3c4d',
              quantity: 1,
              selectedOptions: [
                { modifierId: 'aaaa1111', optionId: 'bbbb2222' },
              ],
            },
          },
          {
            type: 'update_own_item',
            itemId: 'cccc3333',
            item: {
              selectedOptions: [
                { modifierId: 'aaaa1111', optionId: 'bbbb2222' },
              ],
            },
          },
          { type: 'remove_own_item', itemId: 'cccc3333' },
        ],
      },
      codec,
    );

    expect(decoded).toMatchObject({
      operations: [
        {
          item: {
            productId: RICE,
            selectedOptions: [{ modifierId: SUGAR, optionId: NO_SUGAR }],
          },
        },
        {
          itemId: CART_RICE,
          item: {
            selectedOptions: [{ modifierId: SUGAR, optionId: NO_SUGAR }],
          },
        },
        { itemId: CART_RICE },
      ],
    });
  });

  it('decodes the product an unanswerable question was about', () => {
    const codec = buildAiOrderingIdCodec([RICE]);

    expect(
      decodeAiOrderingModelResponse(
        {
          type: 'unanswered',
          reply: 'not sure',
          reason: 'missing_product_info',
          productId: '1a2b3c4d',
        },
        codec,
      ),
    ).toMatchObject({ productId: RICE });
  });
});
