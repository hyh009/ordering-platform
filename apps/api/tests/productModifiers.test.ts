import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

type TestRole = 'org_owner' | 'org_admin' | 'staff';

type TestProductModifierOption = {
  id: string;
  sharedOptionCode?: string;
  name: { en?: string; 'zh-TW'?: string };
  priceAdjustment: number;
  isDefault: boolean;
  isActive: boolean;
  isSoldOut: boolean;
};

type TestProductModifier = {
  id: string;
  organizationId: string;
  storeId: string;
  name: { en?: string; 'zh-TW'?: string };
  selectionType: 'single_choice' | 'multiple_choice';
  minSelect: number;
  maxSelect: number;
  options: TestProductModifierOption[];
  inheritCategoryAvailability: boolean;
  availabilityRules: Array<{
    startDate?: Date;
    endDate?: Date;
    daysOfWeek?: number[];
    timeWindows?: Array<{ start: string; end: string }>;
  }>;
  isActive: boolean;
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
  let productModifiers: TestProductModifier[] = [];
  let productModifierCounter = 1;

  function cloneProductModifier(
    productModifier: TestProductModifier,
  ): TestProductModifier {
    return {
      ...productModifier,
      options: productModifier.options.map((option) => ({ ...option })),
      availabilityRules: productModifier.availabilityRules.map((rule) => ({
        ...rule,
        ...(rule.startDate ? { startDate: new Date(rule.startDate) } : {}),
        ...(rule.endDate ? { endDate: new Date(rule.endDate) } : {}),
        ...(rule.daysOfWeek ? { daysOfWeek: [...rule.daysOfWeek] } : {}),
        ...(rule.timeWindows
          ? { timeWindows: rule.timeWindows.map((window) => ({ ...window })) }
          : {}),
      })),
      createdAt: new Date(productModifier.createdAt),
      updatedAt: new Date(productModifier.updatedAt),
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
    productModifierRepository: {
      async create(input: {
        organizationId: string;
        storeId: string;
        name: TestProductModifier['name'];
        selectionType: TestProductModifier['selectionType'];
        minSelect: number;
        maxSelect: number;
        options: TestProductModifierOption[];
        inheritCategoryAvailability?: boolean;
        availabilityRules?: TestProductModifier['availabilityRules'];
        isActive?: boolean;
      }) {
        const now = new Date();
        const productModifier: TestProductModifier = {
          id: `product-modifier-${productModifierCounter}`,
          organizationId: input.organizationId,
          storeId: input.storeId,
          name: input.name,
          selectionType: input.selectionType,
          minSelect: input.minSelect,
          maxSelect: input.maxSelect,
          options: input.options,
          inheritCategoryAvailability:
            input.inheritCategoryAvailability ?? true,
          availabilityRules: input.availabilityRules ?? [],
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };

        productModifierCounter += 1;
        productModifiers = [...productModifiers, productModifier];
        return cloneProductModifier(productModifier);
      },
      async findById(productModifierId: string) {
        const productModifier = productModifiers.find(
          (item) => item.id === productModifierId,
        );
        return productModifier ? cloneProductModifier(productModifier) : null;
      },
      async listByStore(input: { storeId: string; isActive?: boolean }) {
        return productModifiers
          .filter(
            (productModifier) =>
              productModifier.storeId === input.storeId &&
              (input.isActive === undefined ||
                productModifier.isActive === input.isActive),
          )
          .sort(
            (left, right) =>
              left.createdAt.getTime() - right.createdAt.getTime() ||
              left.id.localeCompare(right.id),
          )
          .map(cloneProductModifier);
      },
      async update(
        productModifierId: string,
        input: Partial<
          Pick<
            TestProductModifier,
            | 'availabilityRules'
            | 'inheritCategoryAvailability'
            | 'isActive'
            | 'maxSelect'
            | 'minSelect'
            | 'name'
            | 'options'
            | 'selectionType'
          >
        >,
      ) {
        const productModifier = productModifiers.find(
          (item) => item.id === productModifierId,
        );
        if (!productModifier) return null;

        const updated: TestProductModifier = {
          ...productModifier,
          updatedAt: new Date(),
        };
        if (input.name !== undefined) updated.name = input.name;
        if (input.selectionType !== undefined) {
          updated.selectionType = input.selectionType;
        }
        if (input.minSelect !== undefined) updated.minSelect = input.minSelect;
        if (input.maxSelect !== undefined) updated.maxSelect = input.maxSelect;
        if (input.options !== undefined) updated.options = input.options;
        if (input.inheritCategoryAvailability !== undefined) {
          updated.inheritCategoryAvailability =
            input.inheritCategoryAvailability;
        }
        if (input.availabilityRules !== undefined) {
          updated.availabilityRules = input.availabilityRules;
        }
        if (input.isActive !== undefined) updated.isActive = input.isActive;

        productModifiers = productModifiers.map((item) =>
          item.id === productModifierId ? updated : item,
        );
        return cloneProductModifier(updated);
      },
    },
    reset() {
      users.clear();
      stores.clear();
      memberships.clear();
      productModifiers = [];
      productModifierCounter = 1;
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

vi.mock('@src/repositories/productModifier/repository', () => ({
  productModifierRepository: mocks.productModifierRepository,
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
}

describe('merchant product modifiers API', () => {
  beforeEach(() => {
    mocks.reset();
  });

  it('lets an org admin create a product modifier with defaults', async () => {
    const app = createApp();
    seedMember('org_admin');

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/product-modifiers')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        name: { 'zh-TW': '加料' },
        selectionType: 'multiple_choice',
        minSelect: 0,
        maxSelect: 2,
        options: [
          {
            name: { 'zh-TW': '珍珠' },
            priceAdjustment: 10,
          },
        ],
      });

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        productModifier: {
          id: 'product-modifier-1',
          storeId: 'store-1',
          name: { 'zh-TW': '加料' },
          selectionType: 'multiple_choice',
          minSelect: 0,
          maxSelect: 2,
          options: [
            {
              id: expect.stringMatching(/^product-modifier-option-/),
              name: { 'zh-TW': '珍珠' },
              priceAdjustment: 10,
              isDefault: false,
              isActive: true,
              isSoldOut: false,
            },
          ],
          inheritCategoryAvailability: true,
          availabilityRules: [],
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
  });

  it('lists store product modifiers in creation order', async () => {
    const app = createApp();
    seedMember('staff');
    await mocks.productModifierRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '第一' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'product-modifier-option-1',
          name: { 'zh-TW': '選項' },
          priceAdjustment: 0,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
        },
      ],
    });
    await mocks.productModifierRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '第二' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'product-modifier-option-1',
          name: { 'zh-TW': '選項' },
          priceAdjustment: 0,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
        },
      ],
    });

    const response = await request(app)
      .get('/api/v1/merchant/stores/store-1/product-modifiers')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      response.body.data.productModifiers.map(
        (productModifier: { name: { 'zh-TW': string } }) =>
          productModifier.name['zh-TW'],
      ),
    ).toEqual(['第一', '第二']);
  });

  it('forbids staff from creating a product modifier', async () => {
    const app = createApp();
    seedMember('staff');

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/product-modifiers')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        name: { 'zh-TW': '加料' },
        selectionType: 'multiple_choice',
        minSelect: 0,
        maxSelect: 2,
        options: [{ name: { 'zh-TW': '珍珠' }, priceAdjustment: 0 }],
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ status: 'error', code: 'FORBIDDEN' });
  });

  it('updates an existing product modifier', async () => {
    const app = createApp();
    seedMember('org_owner');
    await mocks.productModifierRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '加料' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'product-modifier-option-1',
          name: { 'zh-TW': '珍珠' },
          priceAdjustment: 10,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
        },
      ],
    });

    const response = await request(app)
      .patch(
        '/api/v1/merchant/stores/store-1/product-modifiers/product-modifier-1',
      )
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        maxSelect: 3,
        isActive: false,
      });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.productModifier).toMatchObject({
      id: 'product-modifier-1',
      maxSelect: 3,
      isActive: false,
    });
  });

  it('preserves existing option ids and mints ids for new options on update', async () => {
    const app = createApp();
    seedMember('org_owner');
    await mocks.productModifierRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '加料' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'product-modifier-option-existing',
          name: { 'zh-TW': '珍珠' },
          priceAdjustment: 10,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
        },
      ],
    });

    const response = await request(app)
      .patch(
        '/api/v1/merchant/stores/store-1/product-modifiers/product-modifier-1',
      )
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        options: [
          {
            id: 'product-modifier-option-existing',
            name: { 'zh-TW': '珍珠' },
            priceAdjustment: 12,
          },
          {
            name: { 'zh-TW': '椰果' },
            priceAdjustment: 8,
          },
        ],
      });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    const { options } = response.body.data.productModifier;
    expect(options).toHaveLength(2);
    expect(options[0].id).toBe('product-modifier-option-existing');
    expect(options[0].priceAdjustment).toBe(12);
    expect(options[1].id).toMatch(/^product-modifier-option-/);
    expect(options[1].id).not.toBe('product-modifier-option-existing');
  });

  it('rejects updating with an unknown option id', async () => {
    const app = createApp();
    seedMember('org_admin');
    await mocks.productModifierRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '加料' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'product-modifier-option-existing',
          name: { 'zh-TW': '珍珠' },
          priceAdjustment: 10,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
        },
      ],
    });

    const response = await request(app)
      .patch(
        '/api/v1/merchant/stores/store-1/product-modifiers/product-modifier-1',
      )
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        options: [
          {
            id: 'product-modifier-option-missing',
            name: { 'zh-TW': '椰果' },
            priceAdjustment: 8,
          },
        ],
      });

    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'INVALID_FIELD_VALUE',
    });
  });

  it('returns 404 when updating a product modifier from another store', async () => {
    const app = createApp();
    seedMember('org_admin');
    await mocks.productModifierRepository.create({
      organizationId: 'org-1',
      storeId: 'store-other',
      name: { 'zh-TW': '加料' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'product-modifier-option-1',
          name: { 'zh-TW': '珍珠' },
          priceAdjustment: 10,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
        },
      ],
    });

    const response = await request(app)
      .patch(
        '/api/v1/merchant/stores/store-1/product-modifiers/product-modifier-1',
      )
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ isActive: false });

    expect(response.status, JSON.stringify(response.body)).toBe(404);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'PRODUCT_MODIFIER_NOT_FOUND',
    });
  });

  it('rejects creating a product modifier with invalid selection bounds', async () => {
    const app = createApp();
    seedMember('org_admin');

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/product-modifiers')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        name: { 'zh-TW': '尺寸' },
        selectionType: 'single_choice',
        minSelect: 0,
        maxSelect: 2,
        options: [{ name: { 'zh-TW': '大杯' }, priceAdjustment: 0 }],
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects an update whose merged selection bounds are invalid', async () => {
    const app = createApp();
    seedMember('org_admin');
    await mocks.productModifierRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '尺寸' },
      selectionType: 'multiple_choice',
      minSelect: 0,
      maxSelect: 2,
      options: [
        {
          id: 'product-modifier-option-existing',
          name: { 'zh-TW': '大杯' },
          priceAdjustment: 0,
          isDefault: false,
          isActive: true,
          isSoldOut: false,
        },
      ],
    });

    const response = await request(app)
      .patch(
        '/api/v1/merchant/stores/store-1/product-modifiers/product-modifier-1',
      )
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ selectionType: 'single_choice' });

    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'INVALID_FIELD_VALUE',
    });
  });
});
