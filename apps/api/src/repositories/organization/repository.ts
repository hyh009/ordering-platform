import { organizationMongoRepository } from '@src/repositories/organization/mongo.repository';

import type { OrganizationEntity } from '@src/models/organization/model';

export type CreateOrganizationInput = {
  name: string;
};

export type OrganizationRepository = {
  findById(organizationId: string): Promise<OrganizationEntity | null>;
  create(input: CreateOrganizationInput): Promise<OrganizationEntity>;
};

export const organizationRepository: OrganizationRepository =
  organizationMongoRepository;
