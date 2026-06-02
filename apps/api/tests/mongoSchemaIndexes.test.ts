import { describe, expect, it } from 'vitest';

import { AllergenMongoModel } from '../src/models/allergen/mongo.js';
import { AuthSessionMongoModel } from '../src/models/authSession/mongo.js';
import { CartMongoModel } from '../src/models/cart/mongo.js';
import { CategoryMongoModel } from '../src/models/category/mongo.js';
import { DietaryMarkerMongoModel } from '../src/models/dietaryMarker/mongo.js';
import { OrderMongoModel } from '../src/models/order/mongo.js';
import { OrganizationMongoModel } from '../src/models/organization/mongo.js';
import { OrganizationMembershipMongoModel } from '../src/models/organizationMembership/mongo.js';
import { ProductMongoModel } from '../src/models/product/mongo.js';
import { ProductModifierMongoModel } from '../src/models/productModifier/mongo.js';
import { PromotionMongoModel } from '../src/models/promotion/mongo.js';
import { StoreMongoModel } from '../src/models/store/mongo.js';
import { TagMongoModel } from '../src/models/tag/mongo.js';
import { UserMongoModel } from '../src/models/user/mongo.js';

import type { Model } from 'mongoose';

const modelsWithPublicId = [
  AllergenMongoModel,
  AuthSessionMongoModel,
  CartMongoModel,
  CategoryMongoModel,
  DietaryMarkerMongoModel,
  OrderMongoModel,
  OrganizationMongoModel,
  OrganizationMembershipMongoModel,
  ProductMongoModel,
  ProductModifierMongoModel,
  PromotionMongoModel,
  StoreMongoModel,
  TagMongoModel,
  UserMongoModel,
] as const satisfies readonly Model<unknown>[];

function hasUniqueIndex(model: Model<unknown>, fields: Record<string, 1>) {
  return model.schema.indexes().some(([indexFields, options]) => {
    return (
      options?.unique === true &&
      JSON.stringify(indexFields) === JSON.stringify(fields)
    );
  });
}

describe('Mongo schema indexes', () => {
  it('requires unique public ids for top-level documents', () => {
    for (const mongoModel of modelsWithPublicId) {
      expect(
        hasUniqueIndex(mongoModel, { id: 1 }),
        `${mongoModel.modelName} should define a unique id index`,
      ).toBe(true);
    }
  });

  it('requires unique organization slugs', () => {
    expect(hasUniqueIndex(OrganizationMongoModel, { slug: 1 })).toBe(true);
  });
});
