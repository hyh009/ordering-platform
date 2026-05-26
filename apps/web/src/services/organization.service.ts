import { apiJson } from '@/api';
import { organizationPaths } from '@/api/paths/organization.paths';
import { organizationModel } from '@/models/organization';
import { toPaginationPage } from './utils/pagination';
import type {
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  GetOrganizationSuccessResponse,
  ListOrganizationsSuccessResponse,
  OrganizationListPage,
  UpdateOrganizationRequest,
  UpdateOrganizationSuccessResponse,
} from '@/models/organization';

export const organizationService = {
  async listOrganizations(input: { limit: number; offset: number }) {
    const params = new URLSearchParams({
      limit: String(input.limit),
      offset: String(input.offset),
    });
    const response = await apiJson<ListOrganizationsSuccessResponse>(
      `${organizationPaths.list}?${params.toString()}`,
    );

    return {
      organizations: response.data.organizations.map(
        organizationModel.deserializeListItem,
      ),
      pagination: toPaginationPage<OrganizationListPage>(
        response.data.pagination,
        {
          limit: input.limit,
          offset: input.offset,
          total: response.data.organizations.length,
        },
      ),
    };
  },

  async getOrganization(organizationId: string) {
    const response = await apiJson<GetOrganizationSuccessResponse>(
      organizationPaths.detail(organizationId),
    );

    return organizationModel.deserialize(response.data.organization);
  },

  async createOrganization(input: CreateOrganizationRequest) {
    const response = await apiJson<CreateOrganizationSuccessResponse>(
      organizationPaths.list,
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );

    return organizationModel.deserialize(response.data.organization);
  },

  async updateOrganization(
    organizationId: string,
    input: UpdateOrganizationRequest,
  ) {
    const response = await apiJson<UpdateOrganizationSuccessResponse>(
      organizationPaths.detail(organizationId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return organizationModel.deserialize(response.data.organization);
  },
};
