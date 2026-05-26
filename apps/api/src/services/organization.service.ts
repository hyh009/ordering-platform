import {
  toOrganizationDto,
  toOrganizationListItemDto,
} from '@src/models/organization/mapper';
import { toOrganizationMembershipDto } from '@src/models/organizationMembership/mapper';
import { organizationRepository } from '@src/repositories/organization/repository';
import { organizationMembershipRepository } from '@src/repositories/organizationMembership/repository';
import { userRepository } from '@src/repositories/user/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@src/utils/errors';
import { isMongoDuplicateKeyError } from '@src/utils/mongoError';

import type {
  ListOrganizationsQuery,
  ListOrganizationsSuccessResponse,
  OrganizationDto,
  OrganizationMembershipDto,
} from '@repo/shared';
import type { OrganizationEntity } from '@src/models/organization/model';

export type CreateOrganizationInput = {
  name: string;
  domain?: string | undefined;
  ownerUserId: string;
  contactEmail?: string | undefined;
  contactPhone?: OrganizationEntity['contactPhone'] | undefined;
  address?: OrganizationEntity['address'] | undefined;
};

export type CreateOrganizationResult = {
  organization: OrganizationDto;
  ownerMembership: OrganizationMembershipDto;
};

export type UpdateOrganizationInput = {
  name?: string | undefined;
  domain?: string | undefined;
  status?: OrganizationEntity['status'] | undefined;
  reviewStatus?: OrganizationEntity['reviewStatus'] | undefined;
  contactEmail?: string | null | undefined;
  contactPhone?: OrganizationEntity['contactPhone'] | null | undefined;
  address?: OrganizationEntity['address'] | null | undefined;
};

export type ListOrganizationsResult = ListOrganizationsSuccessResponse['data'];

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
      domain: input.domain,
      ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone ? { contactPhone: input.contactPhone } : {}),
      ...(input.address ? { address: input.address } : {}),
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
