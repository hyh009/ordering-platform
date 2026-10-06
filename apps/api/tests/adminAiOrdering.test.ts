import { sign } from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';

import type { AiOrderingConversationEntity } from '../src/models/aiOrdering/model.js';

const AT = new Date('2026-10-01T03:00:00.000Z');

type TestUser = {
  id: string;
  isSuperAdmin: boolean;
  status: 'active' | 'disabled';
  tokenVersion: number;
};

const mocks = vi.hoisted(() => {
  let users: TestUser[] = [];

  return {
    reset() {
      users = [];
    },
    addUser(user: TestUser) {
      users = [...users, user];
    },
    userRepository: {
      async findById(userId: string) {
        return users.find((user) => user.id === userId) ?? null;
      },
    },
    aiOrderingRepository: {
      listByStore: vi.fn(),
      countByStore: vi.fn(),
      findById: vi.fn(),
      listUnanswered: vi.fn(),
      countUnanswered: vi.fn(),
    },
    /** The membership lookup the MERCHANT route goes through. Never a member here. */
    organizationMembershipRepository: {
      findByUserAndOrganization: vi.fn(async () => null),
    },
    storeRepository: {
      findById: vi.fn(async () => ({ id: 'store-1', organizationId: 'org-1' })),
    },
  };
});

vi.mock('@src/repositories/user/repository', () => ({
  userRepository: mocks.userRepository,
}));

vi.mock('@src/repositories/aiOrdering/repository', () => ({
  aiOrderingRepository: mocks.aiOrderingRepository,
}));

vi.mock('@src/repositories/organizationMembership/repository', () => ({
  organizationMembershipRepository: mocks.organizationMembershipRepository,
}));

vi.mock('@src/repositories/store/repository', () => ({
  storeRepository: mocks.storeRepository,
}));

function createAccessToken(userId: string, isSuperAdmin: boolean) {
  return sign(
    { sub: userId, isSuperAdmin, tokenVersion: 1, type: 'access' },
    process.env.AUTH_ACCESS_TOKEN_SECRET ?? '',
    { expiresIn: '15m' },
  );
}

function conversation(): AiOrderingConversationEntity {
  return {
    id: 'ai-conversation-1',
    organizationId: 'org-1',
    storeId: 'store-1',
    cartId: 'cart-1',
    participantId: 'participant-1',
    turns: [
      {
        id: 'turn-1',
        message: '紅茶有什麼甜度',
        versionId: 'v1-2026-09-30',
        versionFingerprint: 'fingerprint-1',
        provider: 'gemini',
        modelName: 'test-model',
        response: { type: 'message', reply: '全糖到無糖都有。' },
        quality: { repairAttempted: false, droppedOperationCount: 0, ownershipViolationCount: 0 },
        createdAt: AT,
      },
    ],
    promptPreludes: [
      {
        hash: 'abc123def456',
        coreInstructions: 'You are an ordering assistant.',
        tools: '[]',
        storeData: '## Menu',
        createdAt: AT,
      },
    ],
    createdAt: AT,
    updatedAt: AT,
  };
}

describe('admin AI ordering API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reset();
    mocks.organizationMembershipRepository.findByUserAndOrganization.mockResolvedValue(
      null,
    );
    mocks.storeRepository.findById.mockResolvedValue({
      id: 'store-1',
      organizationId: 'org-1',
    });
  });

  it('gives a super admin the prompt behind a conversation', async () => {
    const app = createApp();
    mocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
      status: 'active',
      tokenVersion: 1,
    });
    mocks.aiOrderingRepository.findById.mockResolvedValue(conversation());

    const response = await request(app)
      .get('/api/v1/admin/ai-ordering/stores/store-1/conversations/ai-conversation-1')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.conversation.promptPreludes).toEqual([
      {
        hash: 'abc123def456',
        coreInstructions: 'You are an ordering assistant.',
        tools: '[]',
        storeData: '## Menu',
        createdAt: AT.toISOString(),
      },
    ]);
  });

  it('reaches a store the super admin has no membership in', async () => {
    const app = createApp();
    mocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
      status: 'active',
      tokenVersion: 1,
    });
    mocks.aiOrderingRepository.listByStore.mockResolvedValue([]);
    mocks.aiOrderingRepository.countByStore.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/v1/admin/ai-ordering/stores/store-1/conversations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    // The point of the platform route: the merchant one would refuse this,
    // because it resolves access through an organization membership.
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(
      mocks.organizationMembershipRepository.findByUserAndOrganization,
    ).not.toHaveBeenCalled();
  });

  it('refuses a signed-in user who is not a platform super admin', async () => {
    const app = createApp();
    mocks.addUser({
      id: 'user-staff',
      isSuperAdmin: false,
      status: 'active',
      tokenVersion: 1,
    });

    const response = await request(app)
      .get('/api/v1/admin/ai-ordering/stores/store-1/conversations/ai-conversation-1')
      .set('Authorization', `Bearer ${createAccessToken('user-staff', false)}`);

    expect(response.status).toBe(403);
    expect(mocks.aiOrderingRepository.findById).not.toHaveBeenCalled();
  });

  it('keeps the prompt out of the merchant route', async () => {
    const app = createApp();
    mocks.addUser({
      id: 'user-owner',
      isSuperAdmin: false,
      status: 'active',
      tokenVersion: 1,
    });
    mocks.organizationMembershipRepository.findByUserAndOrganization.mockResolvedValue(
      { id: 'membership-1', role: 'org_owner', status: 'active' },
    );
    mocks.aiOrderingRepository.findById.mockResolvedValue(conversation());

    const response = await request(app)
      .get(
        '/api/v1/merchant/stores/store-1/ai-ordering/conversations/ai-conversation-1',
      )
      .set('Authorization', `Bearer ${createAccessToken('user-owner', false)}`);

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data.conversation).not.toHaveProperty(
      'promptPreludes',
    );
  });
});
