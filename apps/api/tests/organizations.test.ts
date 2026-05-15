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

type TestOrganization = {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
};

type TestOrganizationMembership = {
  id: string;
  organizationId: string;
  userId: string;
  role: 'org_owner' | 'org_admin' | 'staff';
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
};

const repositoryMocks = vi.hoisted(() => {
  let users: TestUser[] = [];
  let organizations: TestOrganization[] = [];
  let memberships: TestOrganizationMembership[] = [];
  let organizationIdCounter = 1;
  let membershipIdCounter = 1;

  function cloneUser(user: TestUser): TestUser {
    return {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }

  function cloneOrganization(organization: TestOrganization): TestOrganization {
    return {
      ...organization,
      createdAt: new Date(organization.createdAt),
      updatedAt: new Date(organization.updatedAt),
    };
  }

  function cloneMembership(
    membership: TestOrganizationMembership,
  ): TestOrganizationMembership {
    return {
      ...membership,
      createdAt: new Date(membership.createdAt),
      updatedAt: new Date(membership.updatedAt),
    };
  }

  return {
    userRepository: {
      async findById(userId: string) {
        const user = users.find((item) => item.id === userId);

        return user ? cloneUser(user) : null;
      },
    },
    organizationRepository: {
      async create(input: { name: string }) {
        const now = new Date();
        const organization: TestOrganization = {
          id: `org-${organizationIdCounter}`,
          name: input.name.trim(),
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };

        organizationIdCounter += 1;
        organizations = [...organizations, organization];

        return cloneOrganization(organization);
      },
    },
    organizationMembershipRepository: {
      async create(input: {
        organizationId: string;
        userId: string;
        role: 'org_owner' | 'org_admin' | 'staff';
      }) {
        const now = new Date();
        const membership: TestOrganizationMembership = {
          id: `org-membership-${membershipIdCounter}`,
          organizationId: input.organizationId,
          userId: input.userId,
          role: input.role,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };

        membershipIdCounter += 1;
        memberships = [...memberships, membership];

        return cloneMembership(membership);
      },
    },
    reset() {
      users = [];
      organizations = [];
      memberships = [];
      organizationIdCounter = 1;
      membershipIdCounter = 1;
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
  };
});

vi.mock('@src/repositories/user/repository', () => ({
  userRepository: repositoryMocks.userRepository,
}));

vi.mock('@src/repositories/organization/repository', () => ({
  organizationRepository: repositoryMocks.organizationRepository,
}));

vi.mock('@src/repositories/organizationMembership/repository', () => ({
  organizationMembershipRepository:
    repositoryMocks.organizationMembershipRepository,
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

describe('organizations API', () => {
  beforeEach(() => {
    repositoryMocks.reset();
  });

  it('allows a super admin to create an organization and assign an owner', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addUser({ id: 'user-owner' });

    const response = await request(app)
      .post('/api/v1/organizations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Main Street Cafe',
        ownerUserId: 'user-owner',
      });

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        organization: {
          id: 'org-1',
          name: 'Main Street Cafe',
          status: 'active',
        },
        ownerMembership: {
          id: 'org-membership-1',
          organizationId: 'org-1',
          userId: 'user-owner',
          role: 'org_owner',
          status: 'active',
        },
      },
    });
  });

  it('rejects organization creation without a super admin role', async () => {
    const app = createApp();
    repositoryMocks.addUser({ id: 'user-admin' });

    const response = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${createAccessToken('user-admin')}`)
      .send({
        name: 'Main Street Cafe',
        ownerUserId: 'user-owner',
      });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Insufficient platform permissions',
    });
  });

  it('rejects organization creation when the owner user does not exist', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });

    const response = await request(app)
      .post('/api/v1/organizations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Main Street Cafe',
        ownerUserId: 'user-missing',
      });

    expect(response.status, JSON.stringify(response.body)).toBe(404);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    });
  });

  it('rejects organization creation when the owner user is disabled', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addUser({
      id: 'user-owner',
      status: 'disabled',
    });

    const response = await request(app)
      .post('/api/v1/organizations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Main Street Cafe',
        ownerUserId: 'user-owner',
      });

    expect(response.status, JSON.stringify(response.body)).toBe(403);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 403,
      code: 'USER_DISABLED',
      message: 'User is disabled',
    });
  });
});
