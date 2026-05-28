import { organizationMembershipMongoRepository } from '@src/repositories/organizationMembership/mongo.repository';

import type {
  OrganizationMembershipEntity,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
} from '@src/models/organizationMembership/model';

export type CreateOrganizationMembershipInput = {
  organizationId: string;
  userId: string;
  role: OrganizationMembershipRole;
};

export type ListOrganizationMembershipsInput = {
  organizationId: string;
  offset: number;
  limit: number;
};

export type ListOrganizationMembershipsResult = {
  memberships: OrganizationMembershipEntity[];
  total: number;
};

export type UpdateOrganizationMembershipInput = {
  role?: OrganizationMembershipRole | undefined;
  status?: OrganizationMembershipStatus | undefined;
};

export type OrganizationMembershipRepository = {
  create(
    input: CreateOrganizationMembershipInput,
  ): Promise<OrganizationMembershipEntity>;
  listByOrganization(
    input: ListOrganizationMembershipsInput,
  ): Promise<ListOrganizationMembershipsResult>;
  findById(
    membershipId: string,
  ): Promise<OrganizationMembershipEntity | null>;
  update(
    membershipId: string,
    input: UpdateOrganizationMembershipInput,
  ): Promise<OrganizationMembershipEntity | null>;
};

export const organizationMembershipRepository: OrganizationMembershipRepository =
  organizationMembershipMongoRepository;
