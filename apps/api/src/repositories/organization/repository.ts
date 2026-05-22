import { organizationMongoRepository } from '@src/repositories/organization/mongo.repository';

import type { OrganizationEntity } from '@src/models/organization/model';

export type CreateOrganizationInput = {
  name: string;
  contactEmail?: string | undefined;
  contactPhone?: string | undefined;
  address?: OrganizationEntity['address'] | undefined;
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
  reviewStatus?: OrganizationEntity['reviewStatus'] | undefined;
  contactEmail?: string | null | undefined;
  contactPhone?: string | null | undefined;
  address?: OrganizationEntity['address'] | null | undefined;
};

export type OrganizationRepository = {
  list(input: ListOrganizationsInput): Promise<ListOrganizationsResult>;
  findById(organizationId: string): Promise<OrganizationEntity | null>;
  findByName(name: string): Promise<OrganizationEntity | null>;
  create(input: CreateOrganizationInput): Promise<OrganizationEntity>;
  update(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationEntity | null>;
};

export const organizationRepository: OrganizationRepository =
  organizationMongoRepository;
