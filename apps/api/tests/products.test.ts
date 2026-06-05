import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

type TestRole = 'org_owner' | 'org_admin' | 'staff';

type TestProduct = {
  id: string;
  organizationId: string;
  storeId: string;
  categoryIds: string[];
  name: { en?: string; 'zh-TW'?: string };
  description?: { en?: string; 'zh-TW'?: string };
  imageUrl?: string;
  price: number;
  tagIds: string[];
  allergenIds: string[];
  dietaryMarkerIds: string[];
  modifierIds: string[];
  isActive: boolean;
  isSoldOut: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const mocks = vi.hoisted(() => {
  const users = new Map<
    string,
    {
      id: string;
      email: string;
      username: string;
      isSuperAdmin: boolean;
      status: 'active' | 'disabled';
      tokenVersion: number;
    }
  >();
  const stores = new Map<string, { id: string; organizationId: string }>();
  const memberships = new Map<string, { role: TestRole; status: 'active' }>();
  let products: TestProduct[] = [];
  let productCounter = 1;
  const activeCategories = new Set<string>();
  const activeTags = new Set<string>();
  const activeModifiers = new Set<string>();
  const activeAllergens = new Set<string>();
  const activeDietaryMarkers = new Set<string>();

  function cloneProduct(product: TestProduct): TestProduct {
    return {
      ...product,
      categoryIds: [...product.categoryIds],
      description:
        product.description !== undefined
          ? { ...product.description }
          : undefined,
      tagIds: [...product.tagIds],
      allergenIds: [...product.allergenIds],
      dietaryMarkerIds: [...product.dietaryMarkerIds],
      modifierIds: [...product.modifierIds],
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
    };
  }

  return {
    userRepository: {
      async findById(userId: string) {
        const user = users.get(userId);
        return user ? { ...user } : null;
      },
    },
    storeRepository: {
      async findById(storeId: string) {
        const store = stores.get(storeId);
        return store ? { ...store } : null;
      },
    },
    organizationMembershipRepository: {
      async findByUserAndOrganization(userId: string, organizationId: string) {
        const membership = memberships.get(`${userId}:${organizationId}`);
        return membership ? { ...membership } : null;
      },
    },
    categoryRepository: {
      async listByStore(input: { storeId: string; isActive?: boolean }) {
        return [...activeCategories].map((id) => ({
          id,
          organizationId: 'org-1',
          storeId: input.storeId,
          name: { 'zh-TW': id },
          displayOrder: 0,
          isActive: true,
          availabilityRules: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      },
    },
    tagRepository: {
      async listByStore(input: { storeId: string; isActive?: boolean }) {
        return [...activeTags].map((id) => ({
          id,
          organizationId: 'org-1',
          storeId: input.storeId,
          name: { 'zh-TW': id },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      },
    },
    productModifierRepository: {
      async listByStore(input: { storeId: string; isActive?: boolean }) {
        return [...activeModifiers].map((id) => ({
          id,
          organizationId: 'org-1',
          storeId: input.storeId,
          name: { 'zh-TW': id },
          selectionType: 'single_choice',
          minSelect: 0,
          maxSelect: 1,
          options: [],
          inheritCategoryAvailability: true,
          availabilityRules: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      },
    },
    allergenRepository: {
      async list() {
        return [...activeAllergens].map((id) => ({
          id,
          key: id,
          name: { 'zh-TW': id },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      },
    },
    dietaryMarkerRepository: {
      async list() {
        return [...activeDietaryMarkers].map((id) => ({
          id,
          key: id,
          name: { 'zh-TW': id },
          type: 'dietary',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      },
    },
    productRepository: {
      async create(input: {
        organizationId: string;
        storeId: string;
        categoryIds: string[];
        name: TestProduct['name'];
        description?: TestProduct['description'];
        imageUrl?: string;
        price: number;
        tagIds?: string[];
        allergenIds?: string[];
        dietaryMarkerIds?: string[];
        modifierIds?: string[];
        isActive?: boolean;
      }) {
        const now = new Date();
        const product: TestProduct = {
          id: `product-${productCounter}`,
          organizationId: input.organizationId,
          storeId: input.storeId,
          categoryIds: input.categoryIds,
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          price: input.price,
          tagIds: input.tagIds ?? [],
          allergenIds: input.allergenIds ?? [],
          dietaryMarkerIds: input.dietaryMarkerIds ?? [],
          modifierIds: input.modifierIds ?? [],
          isActive: input.isActive ?? true,
          isSoldOut: false,
          createdAt: now,
          updatedAt: now,
        };

        productCounter += 1;
        products = [...products, product];
        return cloneProduct(product);
      },
      async findById(productId: string) {
        const product = products.find((item) => item.id === productId);
        return product ? cloneProduct(product) : null;
      },
      async listByStore(input: { storeId: string; isActive?: boolean }) {
        return products
          .filter(
            (product) =>
              product.storeId === input.storeId &&
              (input.isActive === undefined ||
                product.isActive === input.isActive),
          )
          .map(cloneProduct);
      },
      async update(
        productId: string,
        input: Partial<
          Pick<
            TestProduct,
            | 'allergenIds'
            | 'categoryIds'
            | 'description'
            | 'dietaryMarkerIds'
            | 'imageUrl'
            | 'isActive'
            | 'isSoldOut'
            | 'modifierIds'
            | 'name'
            | 'price'
            | 'tagIds'
          >
        > & { imageUrl?: string | null },
      ) {
        const product = products.find((item) => item.id === productId);
        if (!product) return null;

        const updated: TestProduct = {
          ...product,
          updatedAt: new Date(),
        };
        if (input.categoryIds !== undefined)
          updated.categoryIds = input.categoryIds;
        if (input.name !== undefined) updated.name = input.name;
        if (input.description !== undefined)
          updated.description = input.description;
        if (input.imageUrl === null) {
          delete updated.imageUrl;
        } else if (input.imageUrl !== undefined) {
          updated.imageUrl = input.imageUrl;
        }
        if (input.price !== undefined) updated.price = input.price;
        if (input.tagIds !== undefined) updated.tagIds = input.tagIds;
        if (input.allergenIds !== undefined)
          updated.allergenIds = input.allergenIds;
        if (input.dietaryMarkerIds !== undefined) {
          updated.dietaryMarkerIds = input.dietaryMarkerIds;
        }
        if (input.modifierIds !== undefined)
          updated.modifierIds = input.modifierIds;
        if (input.isActive !== undefined) updated.isActive = input.isActive;
        if (input.isSoldOut !== undefined) updated.isSoldOut = input.isSoldOut;

        products = products.map((item) =>
          item.id === productId ? updated : item,
        );
        return cloneProduct(updated);
      },
    },
    reset() {
      users.clear();
      stores.clear();
      memberships.clear();
      products = [];
      productCounter = 1;
      activeCategories.clear();
      activeTags.clear();
      activeModifiers.clear();
      activeAllergens.clear();
      activeDietaryMarkers.clear();
    },
    addUser(id: string) {
      users.set(id, {
        id,
        email: `${id}@example.com`,
        username: id,
        isSuperAdmin: false,
        status: 'active',
        tokenVersion: 1,
      });
    },
    addStore(id: string, organizationId: string) {
      stores.set(id, { id, organizationId });
    },
    setMembership(userId: string, organizationId: string, role: TestRole) {
      memberships.set(`${userId}:${organizationId}`, {
        role,
        status: 'active',
      });
    },
    addActiveReference(kind: string, id: string) {
      if (kind === 'category') activeCategories.add(id);
      if (kind === 'tag') activeTags.add(id);
      if (kind === 'modifier') activeModifiers.add(id);
      if (kind === 'allergen') activeAllergens.add(id);
      if (kind === 'dietaryMarker') activeDietaryMarkers.add(id);
    },
  };
});

vi.mock('@src/repositories/user/repository', () => ({
  userRepository: mocks.userRepository,
}));

vi.mock('@src/repositories/store/repository', () => ({
  storeRepository: mocks.storeRepository,
}));

vi.mock('@src/repositories/organizationMembership/repository', () => ({
  organizationMembershipRepository: mocks.organizationMembershipRepository,
}));

vi.mock('@src/repositories/product/repository', () => ({
  productRepository: mocks.productRepository,
}));

vi.mock('@src/repositories/category/repository', () => ({
  categoryRepository: mocks.categoryRepository,
}));

vi.mock('@src/repositories/tag/repository', () => ({
  tagRepository: mocks.tagRepository,
}));

vi.mock('@src/repositories/productModifier/repository', () => ({
  productModifierRepository: mocks.productModifierRepository,
}));

vi.mock('@src/repositories/allergen/repository', () => ({
  allergenRepository: mocks.allergenRepository,
}));

vi.mock('@src/repositories/dietaryMarker/repository', () => ({
  dietaryMarkerRepository: mocks.dietaryMarkerRepository,
}));

function createAccessToken(userId: string) {
  return sign(
    { sub: userId, isSuperAdmin: false, tokenVersion: 1, type: 'access' },
    process.env.AUTH_ACCESS_TOKEN_SECRET ?? '',
    { expiresIn: '15m' },
  );
}

function seedMember(role: TestRole) {
  mocks.addUser('user-1');
  mocks.addStore('store-1', 'org-1');
  mocks.setMembership('user-1', 'org-1', role);
  mocks.addActiveReference('category', 'category-1');
  mocks.addActiveReference('tag', 'tag-1');
  mocks.addActiveReference('modifier', 'product-modifier-1');
  mocks.addActiveReference('allergen', 'allergen-1');
  mocks.addActiveReference('dietaryMarker', 'dietary-marker-1');
}

describe('merchant products API', () => {
  beforeEach(() => {
    mocks.reset();
  });

  it('lets managers create and list store products', async () => {
    seedMember('org_owner');
    const app = createApp();
    const token = createAccessToken('user-1');

    const createResponse = await request(app)
      .post('/api/v1/merchant/stores/store-1/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: { 'zh-TW': '拿鐵' },
        description: { en: 'Latte' },
        imageUrl: 'https://example.com/latte.png',
        price: 120,
        tagIds: ['tag-1'],
        allergenIds: ['allergen-1'],
        dietaryMarkerIds: ['dietary-marker-1'],
        modifierIds: ['product-modifier-1'],
      })
      .expect(201);

    expect(createResponse.body.data.product).toMatchObject({
      id: 'product-1',
      storeId: 'store-1',
      categoryIds: [],
      price: 120,
      isSoldOut: false,
    });

    const listResponse = await request(app)
      .get('/api/v1/merchant/stores/store-1/products')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listResponse.body.data.products).toHaveLength(1);
  });

  it('rejects unknown references', async () => {
    seedMember('org_admin');
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/products')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        categoryIds: ['category-1'],
        name: { 'zh-TW': '拿鐵' },
        price: 120,
        modifierIds: ['product-modifier-missing'],
      })
      .expect(400);

    expect(response.body).toMatchObject({
      status: 'error',
      code: 'INVALID_FIELD_VALUE',
    });
  });

  it('keeps staff read-only for general product edits', async () => {
    seedMember('staff');
    const app = createApp();

    await request(app)
      .post('/api/v1/merchant/stores/store-1/products')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        categoryIds: ['category-1'],
        name: { 'zh-TW': '拿鐵' },
        price: 120,
      })
      .expect(403);
  });

  it('lets staff toggle product sold-out state', async () => {
    seedMember('org_owner');
    const app = createApp();

    await request(app)
      .post('/api/v1/merchant/stores/store-1/products')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        categoryIds: ['category-1'],
        name: { 'zh-TW': '拿鐵' },
        price: 120,
      })
      .expect(201);

    mocks.setMembership('user-1', 'org-1', 'staff');

    const response = await request(app)
      .patch('/api/v1/merchant/stores/store-1/products/product-1/sold-out')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ isSoldOut: true })
      .expect(200);

    expect(response.body.data.product).toMatchObject({
      id: 'product-1',
      isSoldOut: true,
    });
  });
});
