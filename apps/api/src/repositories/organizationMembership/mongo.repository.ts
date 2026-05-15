import { randomUUID } from 'node:crypto';

import { OrganizationMembershipMongoModel } from '@src/models/organizationMembership/mongo';

import type { OrganizationMembershipEntity } from '@src/models/organizationMembership/model';
import type { CreateOrganizationMembershipInput } from '@src/repositories/organizationMembership/repository';

function toOrganizationMembershipEntity(
  membership: OrganizationMembershipEntity,
): OrganizationMembershipEntity {
  return {
    id: membership.id,
    organizationId: membership.organizationId,
    userId: membership.userId,
    role: membership.role,
    status: membership.status,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}

export const organizationMembershipMongoRepository = {
  async create(input: CreateOrganizationMembershipInput) {
    const membership = await OrganizationMembershipMongoModel.create({
      id: `org-membership-${randomUUID()}`,
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
      status: 'active',
    });

    return toOrganizationMembershipEntity(membership.toObject());
  },
};
