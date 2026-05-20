import { organizationMongoRepository } from '@src/repositories/organization/mongo.repository';

import type { OrganizationEntity } from '@src/models/organization/model';

export type CreateOrganizationInput = {
  name: string;
};

export type ListOrganizationsInput = {
  offset: number;
  limit: number;
};

export type ListOrganizationsResult = {
  organizations: OrganizationEntity[];
  total: number;
};

export type UpdateOrganizationInput = {
  name?: string | undefined;
  status?: OrganizationEntity['status'] | undefined;
};

export type OrganizationRepository = {
  list(input: ListOrganizationsInput): Promise<ListOrganizationsResult>;
  findById(organizationId: string): Promise<OrganizationEntity | null>;
  create(input: CreateOrganizationInput): Promise<OrganizationEntity>;
  update(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationEntity | null>;
};

export const organizationRepository: OrganizationRepository =
  organizationMongoRepository;
