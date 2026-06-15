import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

import type { UploadImageInput } from '../src/services/asset.service.js';

type TestRole = 'org_owner' | 'org_admin' | 'staff';

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
  const uploadImage = vi.fn();

  return {
    uploadImage,
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
    assetService: { uploadImage },
    addUser(userId: string) {
      users.set(userId, {
        id: userId,
        email: `${userId}@example.com`,
        username: userId,
        isSuperAdmin: false,
        status: 'active',
        tokenVersion: 1,
      });
    },
    addStore(storeId: string, organizationId: string) {
      stores.set(storeId, { id: storeId, organizationId });
    },
    setMembership(userId: string, organizationId: string, role: TestRole) {
      memberships.set(`${userId}:${organizationId}`, {
        role,
        status: 'active',
      });
    },
    reset() {
      users.clear();
      stores.clear();
      memberships.clear();
      uploadImage.mockReset();
      uploadImage.mockResolvedValue({
        provider: 'cloudinary',
        publicId: 'stores/store-1/menu-products/uploaded',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/uploaded.png',
        width: 800,
        height: 600,
        format: 'png',
        bytes: 2048,
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

vi.mock('@src/services/asset.service', () => ({
  assetService: mocks.assetService,
  maxImageSizeBytes: 5 * 1024 * 1024,
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

const pngBytes = Buffer.from('fake-png-bytes');

describe('merchant image upload API', () => {
  beforeEach(() => {
    mocks.reset();
  });

  it('uploads a product image and returns its hosted url', async () => {
    seedMember('org_owner');
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/merchant/stores/store-1/products/images')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .attach('file', pngBytes, 'latte.png')
      .expect(201);

    expect(response.body.data.image).toMatchObject({
      url: 'https://res.cloudinary.com/demo/image/upload/uploaded.png',
      width: 800,
      height: 600,
    });

    const [input] = mocks.uploadImage.mock.calls[0] as [UploadImageInput];
    expect(input.folder).toBe('stores/store-1/menu-products');
    expect(input.mimeType).toBe('image/png');
  });

  it('rejects product image upload for staff', async () => {
    seedMember('staff');
    const app = createApp();

    await request(app)
      .post('/api/v1/merchant/stores/store-1/products/images')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .attach('file', pngBytes, 'latte.png')
      .expect(403);

    expect(mocks.uploadImage).not.toHaveBeenCalled();
  });

  it('returns 400 when no product image file is provided', async () => {
    seedMember('org_owner');
    const app = createApp();

    await request(app)
      .post('/api/v1/merchant/stores/store-1/products/images')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .expect(400);

    expect(mocks.uploadImage).not.toHaveBeenCalled();
  });

  it('uploads a store logo to a stable, overwriting public id', async () => {
    seedMember('org_admin');
    const app = createApp();

    await request(app)
      .post('/api/v1/merchant/stores/store-1/images')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .field('kind', 'logo')
      .attach('file', pngBytes, 'logo.png')
      .expect(201);

    const [input] = mocks.uploadImage.mock.calls[0] as [UploadImageInput];
    expect(input).toMatchObject({
      folder: 'stores/store-1/branding',
      publicId: 'logo',
      overwrite: true,
    });
  });

  it('rejects a store image upload with an invalid kind', async () => {
    seedMember('org_owner');
    const app = createApp();

    await request(app)
      .post('/api/v1/merchant/stores/store-1/images')
      .set('Authorization', `Bearer ${createAccessToken('user-1')}`)
      .field('kind', 'avatar')
      .attach('file', pngBytes, 'logo.png')
      .expect(400);

    expect(mocks.uploadImage).not.toHaveBeenCalled();
  });
});
