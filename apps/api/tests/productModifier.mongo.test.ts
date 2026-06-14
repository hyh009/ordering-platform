import { describe, expect, it } from 'vitest';

import { ProductModifierMongoModel } from '../src/models/productModifier/mongo.js';

const base = {
  id: 'product-modifier-1',
  organizationId: 'org-1',
  storeId: 'store-1',
  name: { 'zh-TW': '尺寸' },
  selectionType: 'multiple_choice',
  minSelect: 0,
  maxSelect: 2,
  options: [{ id: 'opt-1', name: { 'zh-TW': '大' }, priceAdjustment: 0 }],
};

// These cross-field rules only run in document context (.save()/validateSync).
// The point of the RMW conversion is that update goes through save, so they are
// enforced on update — these tests lock that in.
describe('ProductModifierMongoModel cross-field validation', () => {
  it('accepts a valid modifier', () => {
    const doc = new ProductModifierMongoModel(base);
    expect(doc.validateSync()).toBeUndefined();
  });

  it('rejects maxSelect below minSelect', () => {
    const doc = new ProductModifierMongoModel({
      ...base,
      minSelect: 3,
      maxSelect: 2,
    });
    expect(doc.validateSync()?.errors.maxSelect?.message).toBe(
      'maxSelect must be greater than or equal to minSelect',
    );
  });

  it('rejects single_choice with maxSelect != 1', () => {
    const doc = new ProductModifierMongoModel({
      ...base,
      selectionType: 'single_choice',
      maxSelect: 2,
    });
    expect(doc.validateSync()?.errors.selectionType?.message).toBe(
      'single_choice modifiers must have maxSelect equal to 1',
    );
  });
});
