import { apiJson } from '@/api';
import { organizationPaths } from '@/api/paths/organization.paths';
import { organizationModel } from '@/models/organization';
import { organizationMembershipModel } from '@/models/organizationMembership';
import { storeModel } from '@/models/store';
import type { StoreListItem } from '@/models/store';
import { toPaginationPage } from './utils/pagination';
import type {
  CreateOrganizationRequest,
  CreateOrganizationSuccessResponse,
  GetOrganizationSuccessResponse,
  ListOrganizationsSuccessResponse,
  OrganizationListPage,
  OrganizationReviewStatus,
  UpdateOrganizationRequest,
  UpdateOrganizationSuccessResponse,
} from '@/models/organization';
import type {
  CreateOrganizationMembershipRequest,
  CreateOrganizationMembershipSuccessResponse,
  ListOrganizationMembershipsSuccessResponse,
  OrganizationMembershipListPage,
  UpdateOrganizationMembershipRequest,
  UpdateOrganizationMembershipSuccessResponse,
} from '@/models/organizationMembership';
import type {
  CreateStoreRequest,
  CreateStoreSuccessResponse,
  ListStoresSuccessResponse,
} from '@repo/shared';

export const organizationService = {
  async listOrganizations(input: {
    limit: number;
    offset: number;
    reviewStatus?: OrganizationReviewStatus;
  }) {
    const params = new URLSearchParams({
      limit: String(input.limit),
      offset: String(input.offset),
    });
    if (input.reviewStatus) {
      params.set('reviewStatus', input.reviewStatus);
    }
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
          total: response.data.pagination.total,
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

  async listOrganizationMemberships(
    organizationId: string,
    input: { limit: number; offset: number },
  ) {
    const params = new URLSearchParams({
      limit: String(input.limit),
      offset: String(input.offset),
    });
    const response = await apiJson<ListOrganizationMembershipsSuccessResponse>(
      `${organizationPaths.memberships(organizationId)}?${params.toString()}`,
    );

    return {
      memberships: response.data.memberships.map(
        organizationMembershipModel.deserialize,
      ),
      pagination: toPaginationPage<OrganizationMembershipListPage>(
        response.data.pagination,
        {
          limit: input.limit,
          offset: input.offset,
          total: response.data.pagination.total,
        },
      ),
    };
  },

  async addOrganizationMember(
    organizationId: string,
    input: CreateOrganizationMembershipRequest,
  ) {
    const response = await apiJson<CreateOrganizationMembershipSuccessResponse>(
      organizationPaths.memberships(organizationId),
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );

    return organizationMembershipModel.deserialize(response.data.membership);
  },

  async updateOrganizationMembership(
    organizationId: string,
    membershipId: string,
    input: UpdateOrganizationMembershipRequest,
  ) {
    const response = await apiJson<UpdateOrganizationMembershipSuccessResponse>(
      organizationPaths.membership(organizationId, membershipId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return organizationMembershipModel.deserialize(response.data.membership);
  },

  async listAdminStores(
    organizationId: string,
    input: { limit: number; offset: number } = { limit: 20, offset: 0 },
  ) {
    const params = new URLSearchParams({
      limit: String(input.limit),
      offset: String(input.offset),
    });
    const response = await apiJson<ListStoresSuccessResponse>(
      `${organizationPaths.stores(organizationId)}?${params.toString()}`,
    );

    return {
      stores: response.data.stores as StoreListItem[],
      total: response.data.pagination.total,
    };
  },

  async createAdminStore(organizationId: string, input: CreateStoreRequest) {
    const response = await apiJson<CreateStoreSuccessResponse>(
      organizationPaths.stores(organizationId),
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );

    return storeModel.deserialize(response.data.store);
  },
};
