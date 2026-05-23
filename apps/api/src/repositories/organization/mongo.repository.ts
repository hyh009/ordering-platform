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
    ...(organization.domain ? { domain: organization.domain } : {}),
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
    const filter: Record<string, any> = {};

    if (input.keyword) {
      const regex = new RegExp(input.keyword, 'i');
      filter.$or = [{ name: regex }, { domain: regex }];
    }

    if (input.status) {
      filter.status = input.status;
    }

    const sort: Record<string, 1 | -1> = {};
    if (input.sortBy) {
      sort[input.sortBy] = input.sortDirection === 'asc' ? 1 : -1;
    }
    // Secondary sort to ensure stable pagination
    if (!sort.id) {
      sort.id = 1;
    }

    const [organizations, total] = await Promise.all([
      OrganizationMongoModel.find(filter)
        .sort(sort)
        .skip(input.offset)
        .limit(input.limit)
        .lean<OrganizationEntity[]>()
        .exec(),
      OrganizationMongoModel.countDocuments(filter).exec(),
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

  async findByName(name: string) {
    const organization = await OrganizationMongoModel.findOne({
      name,
    })
      .lean<OrganizationEntity>()
      .exec();

    return organization ? toOrganizationEntity(organization) : null;
  },

  async create(input: CreateOrganizationInput) {
    const organization = await OrganizationMongoModel.create({
      id: `org-${randomUUID()}`,
      name: input.name.trim(),
      ...(input.domain ? { domain: input.domain.trim().toLowerCase() } : {}),
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
    const update: Partial<OrganizationEntity> = {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.domain ? { domain: input.domain.trim().toLowerCase() } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.reviewStatus ? { reviewStatus: input.reviewStatus } : {}),
      ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone
        ? { contactPhone: input.contactPhone.trim() }
        : {}),
      ...(input.address ? { address: input.address } : {}),
    };
    const unset: Record<string, string> = {
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
ization ? toOrganizationEntity(organization) : null;
  },
};
