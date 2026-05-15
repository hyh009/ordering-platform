import { organizationMembershipMongoRepository } from '@src/repositories/organizationMembership/mongo.repository';

import type {
  OrganizationMembershipEntity,
  OrganizationMembershipRole,
} from '@src/models/organizationMembership/model';

export type CreateOrganizationMembershipInput = {
  organizationId: string;
  userId: string;
  role: OrganizationMembershipRole;
};

export type OrganizationMembershipRepository = {
  create(
    input: CreateOrganizationMembershipInput,
  ): Promise<OrganizationMembershipEntity>;
};

export const organizationMembershipRepository: OrganizationMembershipRepository =
  organizationMembershipMongoRepository;
