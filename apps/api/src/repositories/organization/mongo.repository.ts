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
    reviewStatus: organization.reviewStatus ?? 'pending',
    ...(organization.contactEmail
      ? { contactEmail: organization.contactEmail }
      : {}),
    ...(organization.contactPhone
      ? { contactPhone: organization.contactPhone }
      : {}),
    ...(organization.address ? { address: organization.address } : {}),
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
      reviewStatus: 'pending',
      ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone
        ? { contactPhone: input.contactPhone.trim() }
        : {}),
      ...(input.address ? { address: input.address } : {}),
    });

    return toOrganizationEntity(organization.toObject());
  },

  async update(organizationId: string, input: UpdateOrganizationInput) {
    const update: UpdateOrganizationInput = {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.reviewStatus ? { reviewStatus: input.reviewStatus } : {}),
      ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone
        ? { contactPhone: input.contactPhone.trim() }
        : {}),
      ...(input.address ? { address: input.address } : {}),
    };
    const unset = {
      ...(input.contactEmail === null ? { contactEmail: '' } : {}),
      ...(input.contactPhone === null ? { contactPhone: '' } : {}),
      ...(input.address === null ? { address: '' } : {}),
    };

    const organization = await OrganizationMongoModel.findOneAndUpdate(
      { id: organizationId },
      {
        ...(Object.keys(update).length > 0 ? { $set: update } : {}),
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      },
      { new: true, runValidators: true },
    )
      .lean<OrganizationEntity>()
      .exec();

    return organization ? toOrganizationEntity(organization) : null;
  },
};
