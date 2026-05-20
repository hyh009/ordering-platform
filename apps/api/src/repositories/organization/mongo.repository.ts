import { randomUUID } from 'node:crypto';

import { OrganizationMongoModel } from '@src/models/organization/mongo';

import type { OrganizationEntity } from '@src/models/organization/model';
import type {
  CreateOrganizationInput,
  ListOrganizationsInput,
  UpdateOrganizationInput,
} from '@src/repositories/organization/repository';

function toOrganizationEntity(
  organization: OrganizationEntity,
): OrganizationEntity {
  return {
    id: organization.id,
    name: organization.name,
    status: organization.status,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

export const organizationMongoRepository = {
  async list(input: ListOrganizationsInput) {
    const [organizations, total] = await Promise.all([
      OrganizationMongoModel.find({})
        .sort({ name: 1, id: 1 })
        .skip(input.offset)
        .limit(input.limit)
        .lean<OrganizationEntity[]>()
        .exec(),
      OrganizationMongoModel.countDocuments({}).exec(),
    ]);

    return {
      organizations: organizations.map(toOrganizationEntity),
      total,
    };
  },

  async findById(organizationId: string) {
    const organization = await OrganizationMongoModel.findOne({
      id: organizationId,
    })
      .lean<OrganizationEntity>()
      .exec();

    return organization ? toOrganizationEntity(organization) : null;
  },

  async create(input: CreateOrganizationInput) {
    const organization = await OrganizationMongoModel.create({
      id: `org-${randomUUID()}`,
      name: input.name.trim(),
      status: 'active',
    });

    return toOrganizationEntity(organization.toObject());
  },

  async update(organizationId: string, input: UpdateOrganizationInput) {
    const update: UpdateOrganizationInput = {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.status ? { status: input.status } : {}),
    };

    const organization = await OrganizationMongoModel.findOneAndUpdate(
      { id: organizationId },
      { $set: update },
      { new: true, runValidators: true },
    )
      .lean<OrganizationEntity>()
      .exec();

    return organization ? toOrganizationEntity(organization) : null;
  },
};
