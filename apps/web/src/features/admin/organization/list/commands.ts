import type {
  OrganizationListSortBy,
  OrganizationListSortDirection,
  OrganizationReviewStatus,
  OrganizationStatus,
} from '@/models/organization';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { OrganizationListActions } from './actions';

export type LoadOrganizationsResult =
  | {
      status: 'loaded';
    }
  | AdminCommandFailure;

export type OrganizationListLoadInput = {
  limit: number;
  offset: number;
  keyword?: string;
  status?: OrganizationStatus;
  reviewStatus?: OrganizationReviewStatus;
  sortBy?: OrganizationListSortBy;
  sortDirection?: OrganizationListSortDirection;
};

export type OrganizationListCommands = {
  loadOrganizations(
    input: OrganizationListLoadInput,
  ): Promise<LoadOrganizationsResult>;
};

export function createOrganizationListCommands(
  actions: OrganizationListActions,
): OrganizationListCommands {
  return {
    async loadOrganizations(input) {
      actions.loadStarted();

      try {
        const result = await organizationService.listOrganizations({
          limit: input.limit,
          offset: input.offset,
          keyword: input.keyword,
          status: input.status,
          reviewStatus: input.reviewStatus,
          sortBy: input.sortBy,
          sortDirection: input.sortDirection,
        });

        actions.loadSucceeded({
          organizations: result.organizations,
          pagination: result.pagination,
        });
        return {
          status: 'loaded',
        };
      } catch (error) {
        const failure = mapAdminApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
