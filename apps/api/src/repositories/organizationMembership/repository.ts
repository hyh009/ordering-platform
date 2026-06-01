import { organizationMembershipMongoRepository } from '@src/repositories/organizationMembership/mongo.repository';

import type {
  OrganizationMembershipEntity,
  OrganizationMembershipRole,
  OrganizationMembershipStatus,
} from '@src/models/organizationMembership/model';
import type { ClientSession } from 'mongoose';

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
    session?: ClientSession,
  ): Promise<OrganizationMembershipEntity>;
  listByOrganization(
    input: ListOrganizationMembershipsInput,
  ): Promise<ListOrganizationMembershipsResult>;
  findById(
    membershipId: string,
  ): Promise<OrganizationMembershipEntity | null>;
  listByUser(userId: string): Promise<OrganizationMembershipEntity[]>;
  findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMembershipEntity | null>;
  update(
    membershipId: string,
    input: UpdateOrganizationMembershipInput,
  ): Promise<OrganizationMembershipEntity | null>;
};

export const organizationMembershipRepository: OrganizationMembershipRepository =
  organizationMembershipMongoRepository;
