import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

type TestUser = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  isSuperAdmin: boolean;
  status: 'active' | 'disabled';
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
};

type TestLocalizedString = Partial<Record<'en' | 'zh-TW', string>>;

type TestAllergen = {
  id: string;
  key: string;
  name: TestLocalizedString;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type TestDietaryMarker = {
  id: string;
  key: string;
  name: TestLocalizedString;
  icon?: string;
  type: 'dietary' | 'regulatory';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const repositoryMocks = vi.hoisted(() => {
  let users: TestUser[] = [];
  let allergens: TestAllergen[] = [];
  let dietaryMarkers: TestDietaryMarker[] = [];
  let allergenIdCounter = 1;
  let dietaryMarkerIdCounter = 1;

  function cloneUser(user: TestUser): TestUser {
    return {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }

  function cloneAllergen(allergen: TestAllergen): TestAllergen {
    return {
      ...allergen,
      name: { ...allergen.name },
      createdAt: new Date(allergen.createdAt),
      updatedAt: new Date(allergen.updatedAt),
    };
  }

  function cloneDietaryMarker(
    dietaryMarker: TestDietaryMarker,
  ): TestDietaryMarker {
    return {
      ...dietaryMarker,
      name: { ...dietaryMarker.name },
      createdAt: new Date(dietaryMarker.createdAt),
      updatedAt: new Date(dietaryMarker.updatedAt),
    };
  }

  return {
    userRepository: {
      async findById(userId: string) {
        const user = users.find((item) => item.id === userId);

        return user ? cloneUser(user) : null;
      },
      async findByEmail() {
        return null;
      },
      async create() {
        throw new Error('Unexpected user create');
      },
    },
    allergenRepository: {
      async list(filter: { isActive?: boolean }) {
        return allergens
          .filter((item) =>
            typeof filter.isActive === 'boolean'
              ? item.isActive === filter.isActive
              : true,
          )
          .map(cloneAllergen);
      },
      async create(input: {
        key: string;
        name: TestLocalizedString;
        icon?: string;
        isActive?: boolean;
      }) {
        if (allergens.some((item) => item.key === input.key)) {
          throw Object.assign(new Error('Duplicate allergen key'), {
            code: 11000,
          });
        }

        const now = new Date();
        const allergen: TestAllergen = {
          id: `allergen-${allergenIdCounter}`,
          key: input.key,
          name: input.name,
          ...(input.icon ? { icon: input.icon } : {}),
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };

        allergenIdCounter += 1;
        allergens = [...allergens, allergen];

        return cloneAllergen(allergen);
      },
      async update(
        allergenId: string,
        input: Partial<Pick<TestAllergen, 'name' | 'icon' | 'isActive'>> & {
          icon?: string | null;
        },
      ) {
        const allergen = allergens.find((item) => item.id === allergenId);

        if (!allergen) {
          return null;
        }

        const updatedAllergen: TestAllergen = {
          ...allergen,
          ...(input.name ? { name: input.name } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: new Date(),
        };

        if (input.icon === null) {
          delete updatedAllergen.icon;
        } else if (input.icon !== undefined) {
          updatedAllergen.icon = input.icon;
        }

        allergens = allergens.map((item) =>
          item.id === allergenId ? updatedAllergen : item,
        );

        return cloneAllergen(updatedAllergen);
      },
    },
    dietaryMarkerRepository: {
      async list(filter: { isActive?: boolean }) {
        return dietaryMarkers
          .filter((item) =>
            typeof filter.isActive === 'boolean'
              ? item.isActive === filter.isActive
              : true,
          )
          .map(cloneDietaryMarker);
      },
      async create(input: {
        key: string;
        name: TestLocalizedString;
        icon?: string;
        type: 'dietary' | 'regulatory';
        isActive?: boolean;
      }) {
        if (dietaryMarkers.some((item) => item.key === input.key)) {
          throw Object.assign(new Error('Duplicate dietary marker key'), {
            code: 11000,
          });
        }

        const now = new Date();
        const dietaryMarker: TestDietaryMarker = {
          id: `dietary-marker-${dietaryMarkerIdCounter}`,
          key: input.key,
          name: input.name,
          ...(input.icon ? { icon: input.icon } : {}),
          type: input.type,
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };

        dietaryMarkerIdCounter += 1;
        dietaryMarkers = [...dietaryMarkers, dietaryMarker];

        return cloneDietaryMarker(dietaryMarker);
      },
      async update(
        dietaryMarkerId: string,
        input: Partial<
          Pick<TestDietaryMarker, 'name' | 'icon' | 'type' | 'isActive'>
        > & { icon?: string | null },
      ) {
        const dietaryMarker = dietaryMarkers.find(
          (item) => item.id === dietaryMarkerId,
        );

        if (!dietaryMarker) {
          return null;
        }

        const updatedDietaryMarker: TestDietaryMarker = {
          ...dietaryMarker,
          ...(input.name ? { name: input.name } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedAt: new Date(),
        };

        if (input.icon === null) {
          delete updatedDietaryMarker.icon;
        } else if (input.icon !== undefined) {
          updatedDietaryMarker.icon = input.icon;
        }

        dietaryMarkers = dietaryMarkers.map((item) =>
          item.id === dietaryMarkerId ? updatedDietaryMarker : item,
        );

        return cloneDietaryMarker(updatedDietaryMarker);
      },
    },
    reset() {
      users = [];
      allergens = [];
      dietaryMarkers = [];
      allergenIdCounter = 1;
      dietaryMarkerIdCounter = 1;
    },
    addUser(input: {
      id: string;
      isSuperAdmin?: boolean;
      status?: 'active' | 'disabled';
    }) {
      const now = new Date();
      users = [
        ...users,
        {
          id: input.id,
          email: `${input.id}@example.com`,
          username: input.id,
          passwordHash: 'hash',
          isSuperAdmin: input.isSuperAdmin ?? false,
          status: input.status ?? 'active',
          tokenVersion: 1,
          createdAt: now,
          updatedAt: now,
        },
      ];
    },
    addAllergen(input: {
      id: string;
      key: string;
      name: TestLocalizedString;
      icon?: string;
      isActive?: boolean;
    }) {
      const now = new Date();
      allergens = [
        ...allergens,
        {
          id: input.id,
          key: input.key,
          name: input.name,
          ...(input.icon ? { icon: input.icon } : {}),
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        },
      ];
    },
    addDietaryMarker(input: {
      id: string;
      key: string;
      name: TestLocalizedString;
      icon?: string;
      type?: 'dietary' | 'regulatory';
      isActive?: boolean;
    }) {
      const now = new Date();
      dietaryMarkers = [
        ...dietaryMarkers,
        {
          id: input.id,
          key: input.key,
          name: input.name,
          ...(input.icon ? { icon: input.icon } : {}),
          type: input.type ?? 'dietary',
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        },
      ];
    },
  };
});

vi.mock('@src/repositories/user/repository', () => ({
  userRepository: repositoryMocks.userRepository,
}));

vi.mock('@src/repositories/allergen/repository', () => ({
  allergenRepository: repositoryMocks.allergenRepository,
}));

vi.mock('@src/repositories/dietaryMarker/repository', () => ({
  dietaryMarkerRepository: repositoryMocks.dietaryMarkerRepository,
}));

function createAccessToken(userId: string, isSuperAdmin = false) {
  return sign(
    {
      sub: userId,
      isSuperAdmin,
      tokenVersion: 1,
      type: 'access',
    },
    process.env.AUTH_ACCESS_TOKEN_SECRET ?? '',
    {
      expiresIn: '15m',
    },
  );
}

describe('metadata API', () => {
  beforeEach(() => {
    repositoryMocks.reset();
  });

  it('lists only active allergens by default', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addAllergen({
      id: 'allergen-1',
      key: 'peanut',
      name: { 'zh-TW': '花生' },
    });
    repositoryMocks.addAllergen({
      id: 'allergen-2',
      key: 'milk',
      name: { 'zh-TW': '牛奶' },
      isActive: false,
    });

    const response = await request(app)
      .get('/api/v1/admin/allergens')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.allergens).toEqual([
      {
        id: 'allergen-1',
        key: 'peanut',
        name: { 'zh-TW': '花生' },
        isActive: true,
      },
    ]);
  });

  it('allows a super admin to create an allergen with a create-only key', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });

    const response = await request(app)
      .post('/api/v1/admin/allergens')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        key: 'tree-nut',
        name: {
          en: 'Tree Nut',
          'zh-TW': '堅果',
        },
        icon: 'nut',
      });

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        allergen: {
          id: 'allergen-1',
          key: 'tree-nut',
          name: {
            en: 'Tree Nut',
            'zh-TW': '堅果',
          },
          icon: 'nut',
          isActive: true,
        },
      },
    });
  });

  it('rejects allergen creation without a Chinese name', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });

    const response = await request(app)
      .post('/api/v1/admin/allergens')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        key: 'peanut',
        name: {
          en: 'Peanut',
        },
      });

    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
  });

  it('does not allow updating an allergen key through patch', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addAllergen({
      id: 'allergen-1',
      key: 'peanut',
      name: { 'zh-TW': '花生' },
    });

    const response = await request(app)
      .patch('/api/v1/admin/allergens/allergen-1')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        key: 'milk',
        name: {
          'zh-TW': '牛奶',
        },
      });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.allergen).toMatchObject({
      id: 'allergen-1',
      key: 'peanut',
      name: {
        'zh-TW': '牛奶',
      },
    });
  });

  it('lists inactive dietary markers when requested', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addDietaryMarker({
      id: 'dietary-marker-1',
      key: 'vegetarian',
      name: { 'zh-TW': '素食' },
    });
    repositoryMocks.addDietaryMarker({
      id: 'dietary-marker-2',
      key: 'old-label',
      name: { 'zh-TW': '舊標籤' },
      isActive: false,
    });

    const response = await request(app)
      .get('/api/v1/admin/dietary-markers?isActive=false')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.dietaryMarkers).toEqual([
      {
        id: 'dietary-marker-2',
        key: 'old-label',
        name: { 'zh-TW': '舊標籤' },
        type: 'dietary',
        isActive: false,
      },
    ]);
  });

  it('allows a super admin to create and update a dietary marker', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });

    const createResponse = await request(app)
      .post('/api/v1/admin/dietary-markers')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        key: 'vegan',
        name: {
          en: 'Vegan',
          'zh-TW': '純素',
        },
        type: 'dietary',
      });

    expect(createResponse.status, JSON.stringify(createResponse.body)).toBe(
      201,
    );

    const updateResponse = await request(app)
      .patch('/api/v1/admin/dietary-markers/dietary-marker-1')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        icon: 'leaf',
        type: 'regulatory',
        isActive: false,
      });

    expect(updateResponse.status, JSON.stringify(updateResponse.body)).toBe(
      200,
    );
    expect(updateResponse.body.data.dietaryMarker).toEqual({
      id: 'dietary-marker-1',
      key: 'vegan',
      name: {
        en: 'Vegan',
        'zh-TW': '純素',
      },
      icon: 'leaf',
      type: 'regulatory',
      isActive: false,
    });
  });

  it('rejects metadata routes without a super admin role', async () => {
    const app = createApp();
    repositoryMocks.addUser({ id: 'user-admin' });

    const response = await request(app)
      .get('/api/v1/admin/allergens')
      .set('Authorization', `Bearer ${createAccessToken('user-admin')}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient platform permissions',
    });
  });

  it('returns not found when updating a missing dietary marker', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });

    const response = await request(app)
      .patch('/api/v1/admin/dietary-markers/dietary-marker-missing')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        isActive: false,
      });

    expect(response.status, JSON.stringify(response.body)).toBe(404);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 404,
      code: 'DIETARY_MARKER_NOT_FOUND',
      message: 'Dietary marker not found',
    });
  });
});
