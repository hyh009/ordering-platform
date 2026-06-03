import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

type TestRole = 'org_owner' | 'org_admin' | 'staff';

type TestCategory = {
  id: string;
  organizationId: string;
  storeId: string;
  name: { en?: string; 'zh-TW'?: string };
  description?: { en?: string; 'zh-TW'?: string };
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  availabilityRules: Array<{
    startDate?: Date;
    endDate?: Date;
    daysOfWeek?: number[];
    timeWindows?: Array<{ start: string; end: string }>;
  }>;
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
  let categories: TestCategory[] = [];
  let categoryCounter = 1;

  function cloneCategory(category: TestCategory): TestCategory {
    return {
      ...category,
      availabilityRules: category.availabilityRules.map((rule) => ({
        ...rule,
        ...(rule.startDate ? { startDate: new Date(rule.startDate) } : {}),
        ...(rule.endDate ? { endDate: new Date(rule.endDate) } : {}),
        ...(rule.daysOfWeek ? { daysOfWeek: [...rule.daysOfWeek] } : {}),
        ...(rule.timeWindows
          ? { timeWindows: rule.timeWindows.map((window) => ({ ...window })) }
          : {}),
      })),
      createdAt: new Date(category.createdAt),
      updatedAt: new Date(category.updatedAt),
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
      async create(input: {
        organizationId: string;
        storeId: string;
        name: TestCategory['name'];
        description?: TestCategory['description'];
        imageUrl?: string;
        displayOrder?: number;
        isActive?: boolean;
        availabilityRules?: TestCategory['availabilityRules'];
      }) {
        const now = new Date();
        const category: TestCategory = {
          id: `category-${categoryCounter}`,
          organizationId: input.organizationId,
          storeId: input.storeId,
          name: input.name,
          displayOrder: input.displayOrder ?? 0,
          isActive: input.isActive ?? true,
          availabilityRules: input.availabilityRules ?? [],
          createdAt: now,
          updatedAt: now,
        };
        if (input.description !== undefined) {
          category.description = input.description;
        }
        if (input.imageUrl !== undefined) {
          category.imageUrl = input.imageUrl;
        }

        categoryCounter += 1;
        categories = [...categories, category];
        return cloneCategory(category);
      },
      async findById(categoryId: string) {
        const category = categories.find((item) => item.id === categoryId);
        return category ? cloneCategory(category) : null;
      },
      async listByStore(input: { storeId: string; isActive?: boolean }) {
        return categories
          .filter(
            (category) =>
              category.storeId === input.storeId &&
              (input.isActive === undefined ||
                category.isActive === input.isActive),
          )
          .sort(
            (left, right) =>
              left.displayOrder - right.displayOrder ||
              left.createdAt.getTime() - right.createdAt.getTime() ||
              left.id.localeCompare(right.id),
          )
          .map(cloneCategory);
      },
      async update(
        categoryId: string,
        input: Partial<
          Pick<
            TestCategory,
            | 'availabilityRules'
            | 'description'
            | 'displayOrder'
            | 'imageUrl'
            | 'isActive'
            | 'name'
          >
        >,
      ) {
        const category = categories.find((item) => item.id === categoryId);
        if (!category) return null;

        const updated: TestCategory = { ...category, updatedAt: new Date() };
        if (input.name !== undefined) updated.name = input.name;
        if (input.description !== undefined) {
          updated.description = input.description;
        }
        if (input.imageUrl === null) {
          delete updated.imageUrl;
        } else if (input.imageUrl !== undefined) {
          updated.imageUrl = input.imageUrl;
        }
        if (input.displayOrder !== undefined) {
          updated.displayOrder = input.displayOrder;
        }
        if (input.isActive !== undefined) updated.isActive = input.isActive;
        if (input.availabilityRules !== undefined) {
          updated.availabilityRules = input.availabilityRules;
        }

        categories = categories.map((item) =>
          item.id === categoryId ? updated : item,
        );
        return cloneCategory(updated);
      },
    },
    reset() {
      users.clear();
      stores.clear();
      memberships.clear();
      categories = [];
      categoryCounter = 1;
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

vi.mock('@src/repositories/category/repository', () => ({
  categoryRepository: mocks.categoryRepository,
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

describe('merchant categories API', () => {
  beforeEach(() => {
    mocks.reset();
  });

  it('lets an org admin create a category with defaults', async () => {
    const app = createApp();
    seedMember('org_admin');

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/categories')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        name: { 'zh-TW': '主餐' },
        imageUrl: 'https://example.com/category.jpg',
      });

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        category: {
          id: 'category-1',
          storeId: 'store-1',
          name: { 'zh-TW': '主餐' },
          imageUrl: 'https://example.com/category.jpg',
          displayOrder: 0,
          isActive: true,
          availabilityRules: [],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
  });

  it('lists store categories by display order', async () => {
    const app = createApp();
    seedMember('staff');
    await mocks.categoryRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '第二' },
      displayOrder: 20,
    });
    await mocks.categoryRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '第一' },
      displayOrder: 10,
    });

    const response = await request(app)
      .get('/api/v1/merchant/stores/store-1/categories')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      response.body.data.categories.map(
        (category: { name: { 'zh-TW': string } }) => category.name['zh-TW'],
      ),
    ).toEqual(['第一', '第二']);
  });

  it('forbids staff from creating a category', async () => {
    const app = createApp();
    seedMember('staff');

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/categories')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ name: { 'zh-TW': '主餐' } });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ status: 'error', code: 'FORBIDDEN' });
  });

  it('updates an existing category', async () => {
    const app = createApp();
    seedMember('org_owner');
    await mocks.categoryRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '主餐' },
    });

    const response = await request(app)
      .patch('/api/v1/merchant/stores/store-1/categories/category-1')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({
        displayOrder: 30,
        isActive: false,
      });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.category).toMatchObject({
      id: 'category-1',
      displayOrder: 30,
      isActive: false,
    });
  });

  it('returns 404 when updating a category from another store', async () => {
    const app = createApp();
    seedMember('org_admin');
    await mocks.categoryRepository.create({
      organizationId: 'org-1',
      storeId: 'store-other',
      name: { 'zh-TW': '主餐' },
    });

    const response = await request(app)
      .patch('/api/v1/merchant/stores/store-1/categories/category-1')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ isActive: false });

    expect(response.status, JSON.stringify(response.body)).toBe(404);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'CATEGORY_NOT_FOUND',
    });
  });

  it('clears an existing category image', async () => {
    const app = createApp();
    seedMember('org_admin');
    await mocks.categoryRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '主餐' },
      imageUrl: 'https://example.com/category.jpg',
    });

    const response = await request(app)
      .patch('/api/v1/merchant/stores/store-1/categories/category-1')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ imageUrl: null });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.category).toMatchObject({
      id: 'category-1',
    });
    expect(response.body.data.category.imageUrl).toBeUndefined();
  });

  it('rejects creating a category without a name', async () => {
    const app = createApp();
    seedMember('org_admin');

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/categories')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ displayOrder: 1 });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'VALIDATION_ERROR',
    });
  });
});
