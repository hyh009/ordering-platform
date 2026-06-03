import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

type TestRole = 'org_owner' | 'org_admin' | 'staff';

type TestTag = {
  id: string;
  organizationId: string;
  storeId: string;
  name: { en?: string; 'zh-TW'?: string };
  color?: string;
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
  let tags: TestTag[] = [];
  let tagCounter = 1;

  function cloneTag(tag: TestTag): TestTag {
    return {
      ...tag,
      createdAt: new Date(tag.createdAt),
      updatedAt: new Date(tag.updatedAt),
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
    tagRepository: {
      async create(input: {
        organizationId: string;
        storeId: string;
        name: TestTag['name'];
        color?: string;
        isActive?: boolean;
      }) {
        const now = new Date();
        const tag: TestTag = {
          id: `tag-${tagCounter}`,
          organizationId: input.organizationId,
          storeId: input.storeId,
          name: input.name,
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };
        if (input.color !== undefined) tag.color = input.color;

        tagCounter += 1;
        tags = [...tags, tag];
        return cloneTag(tag);
      },
      async findById(tagId: string) {
        const tag = tags.find((item) => item.id === tagId);
        return tag ? cloneTag(tag) : null;
      },
      async listByStore(input: { storeId: string; isActive?: boolean }) {
        // Mirrors the repository: store-scoped, creation order (insertion order).
        return tags
          .filter(
            (tag) =>
              tag.storeId === input.storeId &&
              (input.isActive === undefined || tag.isActive === input.isActive),
          )
          .map(cloneTag);
      },
      async update(
        tagId: string,
        input: Partial<Pick<TestTag, 'name' | 'color' | 'isActive'>>,
      ) {
        const tag = tags.find((item) => item.id === tagId);
        if (!tag) return null;

        const updated: TestTag = { ...tag, updatedAt: new Date() };
        if (input.name !== undefined) updated.name = input.name;
        if (input.color !== undefined) updated.color = input.color;
        if (input.isActive !== undefined) updated.isActive = input.isActive;

        tags = tags.map((item) => (item.id === tagId ? updated : item));
        return cloneTag(updated);
      },
    },
    reset() {
      users.clear();
      stores.clear();
      memberships.clear();
      tags = [];
      tagCounter = 1;
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

vi.mock('@src/repositories/tag/repository', () => ({
  tagRepository: mocks.tagRepository,
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

describe('merchant tags API', () => {
  beforeEach(() => {
    mocks.reset();
  });

  it('lets an org admin create a tag with defaults', async () => {
    const app = createApp();
    seedMember('org_admin');

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/tags')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ name: { 'zh-TW': '推薦' }, color: '#1A2B3C' });

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        tag: {
          id: 'tag-1',
          storeId: 'store-1',
          name: { 'zh-TW': '推薦' },
          color: '#1A2B3C',
          isActive: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
  });

  it('lists store tags in creation order', async () => {
    const app = createApp();
    seedMember('staff');
    await mocks.tagRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '第一' },
    });
    await mocks.tagRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '第二' },
    });

    const response = await request(app)
      .get('/api/v1/merchant/stores/store-1/tags')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      response.body.data.tags.map(
        (tag: { name: { 'zh-TW': string } }) => tag.name['zh-TW'],
      ),
    ).toEqual(['第一', '第二']);
  });

  it('forbids staff from creating a tag', async () => {
    const app = createApp();
    seedMember('staff');

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/tags')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ name: { 'zh-TW': '推薦' } });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ status: 'error', code: 'FORBIDDEN' });
  });

  it('updates an existing tag', async () => {
    const app = createApp();
    seedMember('org_owner');
    await mocks.tagRepository.create({
      organizationId: 'org-1',
      storeId: 'store-1',
      name: { 'zh-TW': '推薦' },
    });

    const response = await request(app)
      .patch('/api/v1/merchant/stores/store-1/tags/tag-1')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ isActive: false, color: '#ABCDEF' });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.tag).toMatchObject({
      id: 'tag-1',
      isActive: false,
      color: '#ABCDEF',
    });
  });

  it('returns 404 when updating a tag from another store', async () => {
    const app = createApp();
    seedMember('org_admin');
    await mocks.tagRepository.create({
      organizationId: 'org-1',
      storeId: 'store-other',
      name: { 'zh-TW': '推薦' },
    });

    const response = await request(app)
      .patch('/api/v1/merchant/stores/store-1/tags/tag-1')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ isActive: false });

    expect(response.status, JSON.stringify(response.body)).toBe(404);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'TAG_NOT_FOUND',
    });
  });

  it('rejects creating a tag without a name', async () => {
    const app = createApp();
    seedMember('org_admin');

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/tags')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .send({ color: '#1A2B3C' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      code: 'VALIDATION_ERROR',
    });
  });
});
