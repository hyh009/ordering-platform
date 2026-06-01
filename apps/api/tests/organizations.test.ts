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
  slug: string;
  status: 'active' | 'disabled';
  reviewStatus: 'pending' | 'approved' | 'rejected';
  contactEmail: string;
  contactPhone: {
    countryCode: 'TW';
    e164: string;
    nationalNumber: string;
    type: 'mobile' | 'landline' | 'toll_free';
    extension?: string;
  };
  address: {
    countryCode: 'TW';
    schemaVersion: 1;
    formatted: string;
    tw: {
      postalCode?: string;
      city: string;
      district: string;
      streetAddress: string;
    };
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

  function toTestSlug(value: string) {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'organization'
    );
  }

  function createTestTaiwanPhone(
    nationalNumber = '0912345678',
  ): TestOrganization['contactPhone'] {
    return {
      countryCode: 'TW',
      e164: `+886${nationalNumber.slice(1)}`,
      nationalNumber,
      type: nationalNumber.startsWith('09') ? 'mobile' : 'landline',
    };
  }

  function createTestTaiwanAddress(
    streetAddress = '忠孝西路一段1號',
  ): TestOrganization['address'] {
    return {
      countryCode: 'TW',
      schemaVersion: 1,
      formatted: `100台北市中正區${streetAddress}`,
      tw: {
        postalCode: '100',
        city: '台北市',
        district: '中正區',
        streetAddress,
      },
    };
  }

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
        sortBy?: 'name' | 'createdAt' | 'updatedAt';
        sortDirection?: 'asc' | 'desc';
      }) {
        let filtered = [...organizations];

        if (input.keyword) {
          const k = input.keyword.toLowerCase();
          filtered = filtered.filter(
            (o) =>
              o.name.toLowerCase().includes(k) ||
              o.slug?.toLowerCase().includes(k),
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
        slug: string;
        contactEmail: string;
        contactPhone: TestOrganization['contactPhone'];
        address: TestOrganization['address'];
      }) {
        const now = new Date();
        const organization: TestOrganization = {
          id: `org-${organizationIdCounter}`,
          name: input.name.trim(),
          slug: input.slug.trim().toLowerCase(),
          status: 'active',
          reviewStatus: 'pending',
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          address: input.address,
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
            | 'slug'
            | 'status'
            | 'reviewStatus'
            | 'contactEmail'
            | 'contactPhone'
            | 'address'
          >
        > & {
          contactEmail?: string | null;
          contactPhone?: TestOrganization['contactPhone'] | null;
          address?: TestOrganization['address'] | null;
        },
      ) {
        const organization = organizations.find(
          (item) => item.id === organizationId,
        );

        if (!organization) {
          return null;
        }

        const updatedOrganization: TestOrganization = {
          ...organization,
          updatedAt: new Date(),
        };

        if (input.name !== undefined) updatedOrganization.name = input.name;
        if (input.slug !== undefined) updatedOrganization.slug = input.slug;
        if (input.status !== undefined)
          updatedOrganization.status = input.status;
        if (input.reviewStatus !== undefined) {
          updatedOrganization.reviewStatus = input.reviewStatus;
        }
        if (input.contactEmail === null) {
          delete updatedOrganization.contactEmail;
        } else if (input.contactEmail !== undefined) {
          updatedOrganization.contactEmail = input.contactEmail;
        }
        if (input.contactPhone === null) {
          delete updatedOrganization.contactPhone;
        } else if (input.contactPhone !== undefined) {
          updatedOrganization.contactPhone = input.contactPhone;
        }
        if (input.address === null) {
          delete updatedOrganization.address;
        } else if (input.address !== undefined) {
          updatedOrganization.address = input.address;
        }

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
      slug?: string;
      status?: 'active' | 'disabled';
      reviewStatus?: 'pending' | 'approved' | 'rejected';
      contactEmail?: string;
      contactPhone?: TestOrganization['contactPhone'];
      address?: TestOrganization['address'];
      createdAt?: Date;
    }) {
      const now = input.createdAt ?? new Date();
      organizations = [
        ...organizations,
        {
          id: input.id,
          name: input.name,
          slug: input.slug ?? toTestSlug(input.name),
          status: input.status ?? 'active',
          reviewStatus: input.reviewStatus ?? 'pending',
          contactEmail: input.contactEmail ?? 'ops@example.com',
          contactPhone: input.contactPhone ?? createTestTaiwanPhone(),
          address: input.address ?? createTestTaiwanAddress(),
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

function createTaiwanPhone(
  nationalNumber = '0912345678',
): NonNullable<TestOrganization['contactPhone']> {
  return {
    countryCode: 'TW',
    e164: `+886${nationalNumber.slice(1)}`,
    nationalNumber,
    type: nationalNumber.startsWith('09') ? 'mobile' : 'landline',
  };
}

function createTaiwanAddress(
  streetAddress = '忠孝西路一段1號',
): NonNullable<TestOrganization['address']> {
  return {
    countryCode: 'TW',
    schemaVersion: 1,
    formatted: `100台北市中正區${streetAddress}`,
    tw: {
      postalCode: '100',
      city: '台北市',
      district: '中正區',
      streetAddress,
    },
  };
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
      contactPhone: createTaiwanPhone(),
      address: createTaiwanAddress(),
    });
    repositoryMocks.addOrganization({
      id: 'org-2',
      name: 'Night Market Tea',
      status: 'disabled',
    });

    const response = await request(app)
      .get('/api/v1/admin/organizations')
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
            slug: 'main-street-cafe',
            status: 'active',
            reviewStatus: 'pending',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
          {
            id: 'org-2',
            name: 'Night Market Tea',
            slug: 'night-market-tea',
            status: 'disabled',
            reviewStatus: 'pending',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
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
      .get('/api/v1/admin/organizations?offset=1&limit=1')
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
            slug: 'night-market-tea',
            status: 'active',
            reviewStatus: 'pending',
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
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

  it('allows a super admin to search organizations by name or slug', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addOrganization({
      id: 'org-1',
      name: 'Main Street Cafe',
      slug: 'main-street',
    });
    repositoryMocks.addOrganization({
      id: 'org-2',
      name: 'Night Market Tea',
      slug: 'night-market',
    });
    repositoryMocks.addOrganization({
      id: 'org-3',
      name: 'Station Bento',
      slug: 'station',
    });

    // Search by name
    const response1 = await request(app)
      .get('/api/v1/admin/organizations?keyword=Cafe')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response1.status).toBe(200);
    expect(response1.body.data.organizations).toHaveLength(1);
    expect(response1.body.data.organizations[0].name).toBe('Main Street Cafe');

    // Search by slug
    const response2 = await request(app)
      .get('/api/v1/admin/organizations?keyword=night-market')
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
      .get('/api/v1/admin/organizations?status=disabled')
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
      .get('/api/v1/admin/organizations?sortBy=name&sortDirection=asc')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      );

    expect(response1.status).toBe(200);
    expect(response1.body.data.organizations[0].name).toBe('A Organization');

    // Sort by createdAt desc
    const response2 = await request(app)
      .get('/api/v1/admin/organizations?sortBy=createdAt&sortDirection=desc')
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
      contactPhone: createTaiwanPhone(),
      address: createTaiwanAddress(),
    });

    const response = await request(app)
      .get('/api/v1/admin/organizations/org-1')
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
          slug: 'main-street-cafe',
          status: 'active',
          reviewStatus: 'pending',
          contactEmail: 'ops@example.com',
          contactPhone: createTaiwanPhone(),
          address: createTaiwanAddress(),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
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
      .patch('/api/v1/admin/organizations/org-1')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Updated Cafe',
        status: 'disabled',
        reviewStatus: 'approved',
        contactEmail: 'OPS@Example.COM',
        contactPhone: createTaiwanPhone('0223456789'),
        address: createTaiwanAddress('更新路1號'),
      });

    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        organization: {
          id: 'org-1',
          name: 'Updated Cafe',
          slug: 'main-street-cafe',
          status: 'disabled',
          reviewStatus: 'approved',
          contactEmail: 'ops@example.com',
          contactPhone: createTaiwanPhone('0223456789'),
          address: createTaiwanAddress('更新路1號'),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
  });

  it('rejects clearing required organization contact fields', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addOrganization({
      id: 'org-1',
      name: 'Main Street Cafe',
      contactEmail: 'ops@example.com',
      contactPhone: createTaiwanPhone(),
      address: createTaiwanAddress(),
    });

    const response = await request(app)
      .patch('/api/v1/admin/organizations/org-1')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        contactEmail: null,
        contactPhone: null,
        address: null,
      });

    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
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
      .post('/api/v1/admin/organizations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Main Street Cafe',
        slug: 'main-street',
        ownerUserId: 'user-owner',
        contactEmail: 'ops@example.com',
        contactPhone: createTaiwanPhone(),
        address: createTaiwanAddress(),
      });

    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      data: {
        organization: {
          id: 'org-1',
          name: 'Main Street Cafe',
          slug: 'main-street',
          status: 'active',
          reviewStatus: 'pending',
          contactEmail: 'ops@example.com',
          contactPhone: createTaiwanPhone(),
          address: createTaiwanAddress(),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        ownerMembership: {
          id: 'org-membership-1',
          organizationId: 'org-1',
          userId: 'user-owner',
          role: 'org_owner',
          status: 'active',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      },
    });
  });

  it('rejects an organization phone when E.164 does not match the national number', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addUser({ id: 'user-owner' });

    const response = await request(app)
      .post('/api/v1/admin/organizations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Main Street Cafe',
        ownerUserId: 'user-owner',
        contactPhone: {
          ...createTaiwanPhone(),
          e164: '+886987654321',
        },
      });

    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'contactPhone.e164',
        }),
      ]),
    );
  });

  it('rejects an organization address when formatted does not match the address fields', async () => {
    const app = createApp();
    repositoryMocks.addUser({
      id: 'user-super-admin',
      isSuperAdmin: true,
    });
    repositoryMocks.addUser({ id: 'user-owner' });

    const response = await request(app)
      .post('/api/v1/admin/organizations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Main Street Cafe',
        ownerUserId: 'user-owner',
        address: {
          ...createTaiwanAddress(),
          formatted: '台北市中正區不同地址',
        },
      });

    expect(response.status, JSON.stringify(response.body)).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
    });
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'address.formatted',
        }),
      ]),
    );
  });

  it('rejects organization creation without a super admin role', async () => {
    const app = createApp();
    repositoryMocks.addUser({ id: 'user-admin' });

    const response = await request(app)
      .post('/api/v1/admin/organizations')
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
      .post('/api/v1/admin/organizations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Main Street Cafe',
        slug: 'main-street',
        ownerUserId: 'user-missing',
        contactEmail: 'ops@example.com',
        contactPhone: createTaiwanPhone(),
        address: createTaiwanAddress(),
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
      .post('/api/v1/admin/organizations')
      .set(
        'Authorization',
        `Bearer ${createAccessToken('user-super-admin', true)}`,
      )
      .send({
        name: 'Main Street Cafe',
        slug: 'main-street',
        ownerUserId: 'user-owner',
        contactEmail: 'ops@example.com',
        contactPhone: createTaiwanPhone(),
        address: createTaiwanAddress(),
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
      .get('/api/v1/admin/organizations/org-missing')
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
