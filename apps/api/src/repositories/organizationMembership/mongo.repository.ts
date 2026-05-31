import { randomUUID } from 'node:crypto';

import { OrganizationMembershipMongoModel } from '@src/models/organizationMembership/mongo';

import type { OrganizationMembershipEntity } from '@src/models/organizationMembership/model';
import type {
  CreateOrganizationMembershipInput,
  ListOrganizationMembershipsInput,
  UpdateOrganizationMembershipInput,
} from '@src/repositories/organizationMembership/repository';
import type { ClientSession } from 'mongoose';

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
  async create(input: CreateOrganizationMembershipInput, session?: ClientSession) {
    const doc = new OrganizationMembershipMongoModel({
      id: `org-membership-${randomUUID()}`,
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
      status: 'active',
    });

    await doc.save({ session: session ?? null });
    return toOrganizationMembershipEntity(doc.toObject());
  },

  async listByOrganization(input: ListOrganizationMembershipsInput) {
    const filter = { organizationId: input.organizationId };
    const sort = { createdAt: 1 as const, id: 1 as const };

    const [docs, total] = await Promise.all([
      OrganizationMembershipMongoModel.find(filter)
        .sort(sort)
        .skip(input.offset)
        .limit(input.limit)
        .lean()
        .exec(),
      OrganizationMembershipMongoModel.countDocuments(filter).exec(),
    ]);

    return {
      memberships: docs.map(toOrganizationMembershipEntity),
      total,
    };
  },

  async findById(membershipId: string) {
    const doc = await OrganizationMembershipMongoModel.findOne({
      id: membershipId,
    })
      .lean()
      .exec();

    return doc ? toOrganizationMembershipEntity(doc) : null;
  },

  async findByUserAndOrganization(userId: string, organizationId: string) {
    const doc = await OrganizationMembershipMongoModel.findOne({
      userId,
      organizationId,
    })
      .lean()
      .exec();

    return doc ? toOrganizationMembershipEntity(doc) : null;
  },

  async update(membershipId: string, input: UpdateOrganizationMembershipInput) {
    const doc = await OrganizationMembershipMongoModel.findOneAndUpdate(
      { id: membershipId },
      { $set: input },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();

    return doc ? toOrganizationMembershipEntity(doc) : null;
  },
};
