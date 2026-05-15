import {
  toOrganizationDto,
  type OrganizationEntity,
} from '@src/models/organization/model';
import { toOrganizationMembershipDto } from '@src/models/organizationMembership/model';
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

import type { OrganizationDto, OrganizationMembershipDto } from '@repo/shared';

export type CreateOrganizationInput = {
  name: string;
  ownerUserId: string;
};

export type CreateOrganizationResult = {
  organization: OrganizationDto;
  ownerMembership: OrganizationMembershipDto;
};

export class OrganizationService {
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
