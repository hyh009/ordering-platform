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
  domain?: string;
  status: 'active' | 'disabled';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  contactEmail?: string;
  contactPhone?: string;
  address?: {
    country?: string;
    postalCode?: string;
    city?: string;
    district?: string;
    line1?: string;
    line2?: string;
  };
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
      async list(input: {
        offset: number;
        limit: number;
        keyword?: string;
        status?: string;
        sortBy?: 'name' | 'createdAt';
        sortDirection?: 'asc' | 'desc';
      }) {
        let filtered = [...organizations];

        if (input.keyword) {
          const k = input.keyword.toLowerCase();
          filtered = filtered.filter(
            (o) =>
              o.name.toLowerCase().includes(k) ||
              o.domain?.toLowerCase().includes(k),
          );
        }

        if (input.status) {
          filtered = filtered.filter((o) => o.status === input.status);
        }

        if (input.sortBy) {
          const direction = input.sortDirection === 'desc' ? -1 : 1;
          filtered.sort((a, b) => {
            const valA = a[input.sortBy!];
            const valB = b[input.sortBy!];
            if (valA! < valB!) return -1 * direction;
            if (valA! > valB!) return 1 * direction;
            return 0;
          });
        }

        return {
          organizations: filtered
            .slice(input.offset, input.offset + input.limit)
            .map(cloneOrganization),
          total: filtered.length,
        };
      },
      async findById(organizationId: string) {
        const organization = organizations.find(
          (item) => item.id === organizationId,
        );

        return organization ? cloneOrganization(organization) : null;
      },
      async create(input: {
        name: string;
        domain?: string;
        contactEmail?: string;
        contactPhone?: string;
        address?: TestOrganization['address'];
      }) {
        const now = new Date();
        const organization: TestOrganization = {
          id: `org-${organizationIdCounter}`,
          name: input.name.trim(),
          domain: input.domain?.trim().toLowerCase(),
          status: 'active',
          reviewStatus: 'pending',
          ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
          ...(input.contactPhone ? { contactPhone: input.contactPhone } : {}),
          ...(input.address ? { address: input.address } : {}),
          createdAt: now,
          updatedAt: now,
        };

        organizationIdCounter += 1;
        organizations = [...organizations, organization];

        return cloneOrganization(organization);
      },
      async update(
        organizationId: string,
        input: Partial<
          Pick<
            TestOrganization,
            | 'name'
            | 'domain'
            | 'status'
            | 'reviewStatus'
            | 'contactEmail'
            | 'contactPhone'
            | 'address'
          >
        >,
      ) {
        const organization = organizations.find(
          (item) => item.id === organizationId,
        );

        if (!organization) {
          return null;
        }

        const updatedOrganization = {
          ...organization,
          ...input,
          updatedAt: new Date(),
        };

        organizations = organizations.map((item) =>
          item.id === organizationId ? updatedOrganization : item,
        );

        return cloneOrganization(updatedOrganization);
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
    addOrganization(input: {
      id: string;
      name: string;
      domain?: string;
      status?: 'active' | 'disabled';
      reviewStatus?: 'pending' | 'approved' | 'rejected';
      contactEmail?: string;
      contactPhone?: string;
      address?: TestOrganization['address'];
      createdAt?: Date;
    }) {
      const now = input.createdAt ?? new Date();
      organizations = [
        ...organizations,
        {
          id: input.id,
          name: input.name,
          domain: input.domain,
          status: input.status ?? 'active',
          reviewStatus: input.reviewStatus ?? 'pending',
          ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
          ...(input.contactPhone ? { contactPhone: input.contactPhone } : {}),
          ...(input.address ? { address: input.address } : {}),
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

  it('allows a super admin to list organizations', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addOrganization({
      id: 'org-1',
      name: 'Main Street Cafe',
      contactEmail: 'ops@example.com',
      contactPhone: '+886-2-1234-5678',
      address: {
        country: 'Taiwan',
        postalCode: '100',
        city: 'Taipei',
        district: 'Zhongzheng',
        line1: 'No. 1, Zhongxiao W. Rd.',
        line2: '2F',
      },
    });
    repositoryMocks.addOrganization({
      id: 'org-2',
      name: 'Night Market Tea',
      status: 'disabled',
    });

    const response = await request(app)
      .get('/api/v1/organizations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        organizations: [
          {
            id: 'org-1',
            name: 'Main Street Cafe',
            status: 'active',
            reviewStatus: 'pending',
            contactEmail: 'ops@example.com',
            contactPhone: '+886-2-1234-5678',
            address: {
              country: 'Taiwan',
              postalCode: '100',
              city: 'Taipei',
              district: 'Zhongzheng',
              line1: 'No. 1, Zhongxiao W. Rd.',
              line2: '2F',
            },
          },
          {
            id: 'org-2',
            name: 'Night Market Tea',
            status: 'disabled',
            reviewStatus: 'pending',
          },
        ],
        pagination: {
          offset: 0,
          limit: 20,
          total: 2,
        },
      },
    });
  });

  it('allows a super admin to list organizations with offset pagination', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addOrganization({
      id: 'org-1',
      name: 'Main Street Cafe',
    });
    repositoryMocks.addOrganization({
      id: 'org-2',
      name: 'Night Market Tea',
    });
    repositoryMocks.addOrganization({
      id: 'org-3',
      name: 'Station Bento',
    });

    const response = await request(app)
      .get('/api/v1/organizations?offset=1&limit=1')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        organizations: [
          {
            id: 'org-2',
            name: 'Night Market Tea',
            status: 'active',
            reviewStatus: 'pending',
          },
        ],
        pagination: {
          offset: 1,
          limit: 1,
          total: 3,
        },
      },
    });
  });

  it('allows a super admin to search organizations by name or domain', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addOrganization({
      id: 'org-1',
      name: 'Main Street Cafe',
      domain: 'mainstreet.com',
    });
    repositoryMocks.addOrganization({
      id: 'org-2',
      name: 'Night Market Tea',
      domain: 'nightmarket.com',
    });
    repositoryMocks.addOrganization({
      id: 'org-3',
      name: 'Station Bento',
      domain: 'station.com',
    });

    // Search by name
    const response1 = await request(app)
      .get('/api/v1/organizations?keyword=Cafe')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response1.status).toBe(200);
    expect(response1.body.data.organizations).toHaveLength(1);
    expect(response1.body.data.organizations[0].name).toBe('Main Street Cafe');

    // Search by domain
    const response2 = await request(app)
      .get('/api/v1/organizations?keyword=nightmarket')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response2.status).toBe(200);
    expect(response2.body.data.organizations).toHaveLength(1);
    expect(response2.body.data.organizations[0].name).toBe('Night Market Tea');
  });

  it('allows a super admin to filter organizations by status', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addOrganization({
      id: 'org-1',
      name: 'Org Active',
      status: 'active',
    });
    repositoryMocks.addOrganization({
      id: 'org-2',
      name: 'Org Disabled',
      status: 'disabled',
    });

    const response = await request(app)
      .get('/api/v1/organizations?status=disabled')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response.status).toBe(200);
    expect(response.body.data.organizations).toHaveLength(1);
    expect(response.body.data.organizations[0].name).toBe('Org Disabled');
  });

  it('allows a super admin to sort organizations', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addOrganization({
      id: 'org-1',
      name: 'B Organization',
      createdAt: new Date('2023-01-01'),
    });
    repositoryMocks.addOrganization({
      id: 'org-2',
      name: 'A Organization',
      createdAt: new Date('2023-01-02'),
    });

    // Sort by name asc
    const response1 = await request(app)
      .get('/api/v1/organizations?sortBy=name&sortDirection=asc')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response1.status).toBe(200);
    expect(response1.body.data.organizations[0].name).toBe('A Organization');

    // Sort by createdAt desc
    const response2 = await request(app)
      .get('/api/v1/organizations?sortBy=createdAt&sortDirection=desc')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response2.status).toBe(200);
    expect(response2.body.data.organizations[0].name).toBe('A Organization');
  });

  it('allows a super admin to get an organization', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addOrganization({
      id: 'org-1',
      name: 'Main Street Cafe',
      contactEmail: 'ops@example.com',
      contactPhone: '+886-2-1234-5678',
      address: {
        country: 'Taiwan',
        postalCode: '100',
        city: 'Taipei',
        district: 'Zhongzheng',
        line1: 'No. 1, Zhongxiao W. Rd.',
        line2: '2F',
      },
    });

    const response = await request(app)
      .get('/api/v1/organizations/org-1')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        organization: {
          id: 'org-1',
          name: 'Main Street Cafe',
          status: 'active',
          reviewStatus: 'pending',
          contactEmail: 'ops@example.com',
          contactPhone: '+886-2-1234-5678',
          address: {
            country: 'Taiwan',
            postalCode: '100',
            city: 'Taipei',
            district: 'Zhongzheng',
            line1: 'No. 1, Zhongxiao W. Rd.',
            line2: '2F',
          },
        },
      },
    });
  });

  it('allows a super admin to update organization core fields and contact details', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addOrganization({
      id: 'org-1',
      name: 'Main Street Cafe',
    });

    const response = await request(app)
      .patch('/api/v1/organizations/org-1')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Updated Cafe',
        status: 'disabled',
        reviewStatus: 'approved',
        contactEmail: 'OPS@Example.COM',
        contactPhone: '+886-2-8765-4321',
        address: {
          country: 'Taiwan',
          city: 'Taipei',
          line1: 'Updated Address',
        },
      });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        organization: {
          id: 'org-1',
          name: 'Updated Cafe',
          status: 'disabled',
          reviewStatus: 'approved',
          contactEmail: 'ops@example.com',
          contactPhone: '+886-2-8765-4321',
          address: {
            country: 'Taiwan',
            city: 'Taipei',
            line1: 'Updated Address',
          },
        },
      },
    });
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
        domain: 'mainstreet.com',
        ownerUserId: 'user-owner',
        contactEmail: 'ops@example.com',
        contactPhone: '+886-2-1234-5678',
        address: {
          country: 'Taiwan',
          city: 'Taipei',
          line1: 'No. 1, Zhongxiao W. Rd.',
        },
      });

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        organization: {
          id: 'org-1',
          name: 'Main Street Cafe',
          domain: 'mainstreet.com',
          status: 'active',
          reviewStatus: 'pending',
          contactEmail: 'ops@example.com',
          contactPhone: '+886-2-1234-5678',
          address: {
            country: 'Taiwan',
            city: 'Taipei',
            line1: 'No. 1, Zhongxiao W. Rd.',
          },
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

  it('returns not found for a missing organization detail', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });

    const response = await request(app)
      .get('/api/v1/organizations/org-missing')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response.status, JSON.stringify(response.body)).toBe(404);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 404,
      code: 'ORGANIZATION_NOT_FOUND',
      message: 'Organization not found',
    });
  });
});
