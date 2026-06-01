import { randomUUID } from 'node:crypto';

import {
  organizationAddressSchema,
  organizationPhoneSchema,
} from '@repo/shared';
import { OrganizationMongoModel } from '@src/models/organization/mongo';

import type { OrganizationEntity } from '@src/models/organization/model';
import type {
  CreateOrganizationInput,
  ListOrganizationsInput,
  UpdateOrganizationInput,
} from '@src/repositories/organization/repository';
import type { FilterQuery } from 'mongoose';

const organizationEntityKeyCoverage: Record<
  Exclude<
    keyof OrganizationEntity,
    | 'id'
    | 'name'
    | 'slug'
    | 'status'
    | 'reviewStatus'
    | 'contactEmail'
    | 'contactPhone'
    | 'address'
    | 'createdAt'
    | 'updatedAt'
  >,
  never
> = {};

function toValidContactPhone(value: unknown) {
  const result = organizationPhoneSchema.safeParse(value);

  return result.success ? result.data : undefined;
}

function toValidAddress(value: unknown) {
  const result = organizationAddressSchema.safeParse(value);

  return result.success ? result.data : undefined;
}

function toOrganizationEntity(
  organization: OrganizationEntity,
): OrganizationEntity {
  void organizationEntityKeyCoverage;

  const contactPhone = toValidContactPhone(organization.contactPhone);
  const address = toValidAddress(organization.address);

  if (!contactPhone || !address) {
    throw new Error('Database contains invalid organization address or phone');
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    reviewStatus: organization.reviewStatus ?? 'pending',
    contactEmail: organization.contactEmail,
    contactPhone,
    address,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

export const organizationMongoRepository = {
  async list(input: ListOrganizationsInput) {
    const filter: FilterQuery<OrganizationEntity> = {};

    if (input.keyword) {
      const regex = new RegExp(input.keyword, 'i');
      filter.$or = [{ name: regex }, { slug: regex }];
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

  async findByIds(organizationIds: string[]) {
    const organizations = await OrganizationMongoModel.find({
      id: { $in: organizationIds },
    })
      .lean<OrganizationEntity[]>()
      .exec();

    return organizations.map(toOrganizationEntity);
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
      slug: input.slug.trim().toLowerCase(),
      status: 'active',
      reviewStatus: 'pending',
      contactEmail: input.contactEmail,
      contactPhone: organizationPhoneSchema.parse(input.contactPhone),
      address: organizationAddressSchema.parse(input.address),
    });

    return toOrganizationEntity(organization.toObject());
  },

  async update(organizationId: string, input: UpdateOrganizationInput) {
    const update: Partial<OrganizationEntity> = {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.slug ? { slug: input.slug.trim().toLowerCase() } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.reviewStatus ? { reviewStatus: input.reviewStatus } : {}),
      ...(input.contactEmail ? { contactEmail: input.contactEmail } : {}),
      ...(input.contactPhone
        ? { contactPhone: organizationPhoneSchema.parse(input.contactPhone) }
        : {}),
      ...(input.address
        ? { address: organizationAddressSchema.parse(input.address) }
        : {}),
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
