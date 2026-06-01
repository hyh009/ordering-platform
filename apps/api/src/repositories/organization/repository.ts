import { organizationMongoRepository } from '@src/repositories/organization/mongo.repository';

import type { OrganizationEntity } from '@src/models/organization/model';

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone: OrganizationEntity['contactPhone'];
  address: OrganizationEntity['address'];
};

export type ListOrganizationsInput = {
  offset: number;
  limit: number;
  keyword?: string | undefined;
  status?: OrganizationEntity['status'] | undefined;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | undefined;
  sortDirection?: 'asc' | 'desc' | undefined;
};

export type ListOrganizationsResult = {
  organizations: OrganizationEntity[];
  total: number;
};

export type UpdateOrganizationInput = {
  name?: string | undefined;
  slug?: string | undefined;
  status?: OrganizationEntity['status'] | undefined;
  reviewStatus?: OrganizationEntity['reviewStatus'] | undefined;
  contactEmail?: string | undefined;
  contactPhone?: OrganizationEntity['contactPhone'] | undefined;
  address?: OrganizationEntity['address'] | undefined;
};

export type OrganizationRepository = {
  list(input: ListOrganizationsInput): Promise<ListOrganizationsResult>;
  findById(organizationId: string): Promise<OrganizationEntity | null>;
  findByIds(organizationIds: string[]): Promise<OrganizationEntity[]>;
  findByName(name: string): Promise<OrganizationEntity | null>;
  create(input: CreateOrganizationInput): Promise<OrganizationEntity>;
  update(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationEntity | null>;
};

export const organizationRepository: OrganizationRepository =
  organizationMongoRepository;
