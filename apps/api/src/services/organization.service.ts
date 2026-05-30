import { authConfig } from '@src/config/auth';
import {
  toOrganizationDto,
  toOrganizationListItemDto,
} from '@src/models/organization/mapper';
import {
  toOrganizationMembershipDto,
  toOrganizationMembershipWithUserDto,
} from '@src/models/organizationMembership/mapper';
import { organizationRepository } from '@src/repositories/organization/repository';
import { organizationMembershipRepository } from '@src/repositories/organizationMembership/repository';
import { userRepository } from '@src/repositories/user/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@src/utils/errors';
import { logger } from '@src/utils/logger';
import { isMongoDuplicateKeyError } from '@src/utils/mongoError';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import type {
  ListOrganizationMembershipsQuery,
  ListOrganizationsQuery,
  ListOrganizationsSuccessResponse,
  OrganizationDto,
  OrganizationMembershipDto,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
  OrganizationMembershipWithUserDto,
} from '@repo/shared';
import type { OrganizationEntity } from '@src/models/organization/model';

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  ownerUserId: string;
  contactEmail: string;
  contactPhone: OrganizationEntity['contactPhone'];
  address: OrganizationEntity['address'];
};

export type CreateOrganizationResult = {
  organization: OrganizationDto;
  ownerMembership: OrganizationMembershipDto;
};

export type UpdateOrganizationInput = {
  name?: string | undefined;
  slug?: string | undefined;
  status?: OrganizationEntity['status'] | undefined;
  reviewStatus?: OrganizationEntity['reviewStatus'] | undefined;
  contactEmail?: string | undefined;
  contactPhone?: OrganizationEntity['contactPhone'] | undefined;
  address?: OrganizationEntity['address'] | undefined;
};

export type ListOrganizationsResult = ListOrganizationsSuccessResponse['data'];

export type ListOrganizationMembershipsResult = {
  memberships: OrganizationMembershipWithUserDto[];
  pagination: { offset: number; limit: number; total: number };
};

export type AddOrganizationMemberInput = {
  email: string;
  username: string;
  temporaryPassword: string;
  role: OrganizationMembershipRole;
};

export type UpdateOrganizationMembershipInput = {
  role?: OrganizationMembershipRole | undefined;
  status?: OrganizationMembershipStatus | undefined;
};

export class OrganizationService {
  public async listOrganizations(
    query: ListOrganizationsQuery,
  ): Promise<ListOrganizationsResult> {
    const result = await organizationRepository.list(query);

    return {
      organizations: result.organizations.map(toOrganizationListItemDto),
      pagination: {
        offset: query.offset,
        limit: query.limit,
        total: result.total,
      },
    };
  }

  public async getOrganization(
    organizationId: string,
  ): Promise<OrganizationDto> {
    const organization = await organizationRepository.findById(organizationId);

    if (!organization) {
      throw new NotFoundError(
        'Organization not found',
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
      );
    }

    return toOrganizationDto(organization);
  }

  public async createOrganization(
    input: CreateOrganizationInput,
  ): Promise<CreateOrganizationResult> {
    const owner = await userRepository.findById(input.ownerUserId);

    if (!owner) {
      throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    if (owner.status !== 'active') {
      throw new ForbiddenError('User is disabled', ERROR_CODES.USER_DISABLED);
    }

    const organization = await organizationRepository.create({
      name: input.name,
      slug: input.slug,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      address: input.address,
    });

    const ownerMembership = await this.createOwnerMembership(
      organization,
      owner.id,
    );

    return {
      organization: toOrganizationDto(organization),
      ownerMembership: toOrganizationMembershipDto(ownerMembership),
    };
  }

  public async updateOrganization(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationDto> {
    const organization = await organizationRepository.update(
      organizationId,
      input,
    );

    if (!organization) {
      throw new NotFoundError(
        'Organization not found',
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
      );
    }

    return toOrganizationDto(organization);
  }

  public async listOrganizationMemberships(
    organizationId: string,
    query: ListOrganizationMembershipsQuery,
  ): Promise<ListOrganizationMembershipsResult> {
    const org = await organizationRepository.findById(organizationId);

    if (!org) {
      throw new NotFoundError(
        'Organization not found',
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
      );
    }

    const { memberships, total } =
      await organizationMembershipRepository.listByOrganization({
        organizationId,
        offset: query.offset,
        limit: query.limit,
      });

    const users =
      memberships.length > 0
        ? await userRepository.findByIds(memberships.map((m) => m.userId))
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      memberships: memberships.map((m) => {
        const user = userMap.get(m.userId);
        if (!user) {
          logger.warn(
            { membershipId: m.id, userId: m.userId },
            'Membership references non-existent user',
          );
        }
        return toOrganizationMembershipWithUserDto(m, {
          email: user?.email ?? '',
          username: user?.username ?? '',
        });
      }),
      pagination: { offset: query.offset, limit: query.limit, total },
    };
  }

  public async addOrganizationMember(
    organizationId: string,
    input: AddOrganizationMemberInput,
  ): Promise<OrganizationMembershipWithUserDto> {
    const org = await organizationRepository.findById(organizationId);

    if (!org) {
      throw new NotFoundError(
        'Organization not found',
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
      );
    }

    const existingUser = await userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new ConflictError(
        'User already exists',
        ERROR_CODES.USER_ALREADY_EXISTS,
      );
    }

    const passwordHash = await bcrypt.hash(
      input.temporaryPassword,
      authConfig.passwordHashRounds,
    );

    const session = await mongoose.connection.startSession();

    try {
      const { user, membership } = await session.withTransaction(async () => {
        const user = await userRepository
          .create(
            { email: input.email, username: input.username, passwordHash },
            session,
          )
          .catch((error: unknown) => {
            if (isMongoDuplicateKeyError(error)) {
              throw new ConflictError(
                'User already exists',
                ERROR_CODES.USER_ALREADY_EXISTS,
              );
            }
            throw error;
          });

        const membership = await organizationMembershipRepository
          .create(
            { organizationId, userId: user.id, role: input.role },
            session,
          )
          .catch((error: unknown) => {
            if (isMongoDuplicateKeyError(error)) {
              throw new ConflictError(
                'Organization membership already exists',
                ERROR_CODES.ORGANIZATION_MEMBERSHIP_ALREADY_EXISTS,
              );
            }
            throw error;
          });

        return { user, membership };
      });

      return toOrganizationMembershipWithUserDto(membership, {
        email: user.email,
        username: user.username,
      });
    } finally {
      await session.endSession();
    }
  }

  public async updateOrganizationMembership(
    organizationId: string,
    membershipId: string,
    input: UpdateOrganizationMembershipInput,
  ): Promise<OrganizationMembershipWithUserDto> {
    const org = await organizationRepository.findById(organizationId);

    if (!org) {
      throw new NotFoundError(
        'Organization not found',
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
      );
    }

    const existing =
      await organizationMembershipRepository.findById(membershipId);

    if (!existing || existing.organizationId !== organizationId) {
      throw new NotFoundError(
        'Organization membership not found',
        ERROR_CODES.ORGANIZATION_MEMBERSHIP_NOT_FOUND,
      );
    }

    const updated = await organizationMembershipRepository.update(
      membershipId,
      input,
    );

    if (!updated) {
      throw new NotFoundError(
        'Organization membership not found',
        ERROR_CODES.ORGANIZATION_MEMBERSHIP_NOT_FOUND,
      );
    }

    const user = await userRepository.findById(existing.userId);
    if (!user) {
      logger.warn(
        { membershipId: membershipId, userId: existing.userId },
        'Membership references non-existent user',
      );
    }

    return toOrganizationMembershipWithUserDto(updated, {
      email: user?.email ?? '',
      username: user?.username ?? '',
    });
  }

  private async createOwnerMembership(
    organization: OrganizationEntity,
    ownerUserId: string,
  ) {
    try {
      return await organizationMembershipRepository.create({
        organizationId: organization.id,
        userId: ownerUserId,
        role: 'org_owner',
      });
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        throw new ConflictError(
          'Organization membership already exists',
          ERROR_CODES.ORGANIZATION_MEMBERSHIP_ALREADY_EXISTS,
        );
      }

      throw error;
    }
  }
}

export function createOrganizationService() {
  return new OrganizationService();
}

export const organizationService = createOrganizationService();
