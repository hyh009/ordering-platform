import { tDefault } from '@/app/i18n';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from '@/models/organization';
import type {
  Organization,
  OrganizationListSortBy,
  OrganizationListSortDirection,
  OrganizationReviewStatus,
  OrganizationStatus,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '@/models/organization';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import {
  mapOrganizationValidationIssuesToFieldErrors,
  type OrganizationFormFieldErrors,
} from '@/features/components/organization/organizationForm/organizationFormErrors';
import type { OrganizationListActions } from './actions';

export type OrganizationListCommandFieldErrors = OrganizationFormFieldErrors;

export type LoadOrganizationsResult =
  | {
      status: 'loaded';
    }
  | AdminCommandFailure;

export type SaveOrganizationListResult =
  | {
      organization: Organization;
      status: 'saved';
    }
  | (AdminCommandFailure & {
      fieldErrors?: OrganizationListCommandFieldErrors;
    });

export type OrganizationListCommands = {
  createOrganization(
    input: CreateOrganizationRequest,
  ): Promise<SaveOrganizationListResult>;
  loadOrganizations(input: {
    limit: number;
    offset: number;
    keyword?: string;
    status?: OrganizationStatus;
    reviewStatus?: OrganizationReviewStatus;
    sortBy?: OrganizationListSortBy;
    sortDirection?: OrganizationListSortDirection;
  }): Promise<LoadOrganizationsResult>;
  updateOrganization(
    organizationId: string,
    input: UpdateOrganizationRequest,
  ): Promise<SaveOrganizationListResult>;
};

function validateCreate(
  input: CreateOrganizationRequest,
):
  | { success: true }
  | { success: false; fieldErrors: OrganizationListCommandFieldErrors } {
  const result = createOrganizationSchema.safeParse(input);

  if (result.success) {
    return {
      success: true,
    };
  }

  return {
    fieldErrors: mapOrganizationValidationIssuesToFieldErrors(
      result.error.issues,
    ),
    success: false,
  };
}

function validateUpdate(
  input: UpdateOrganizationRequest,
):
  | { success: true }
  | { success: false; fieldErrors: OrganizationListCommandFieldErrors } {
  const result = updateOrganizationSchema.safeParse(input);

  if (result.success) {
    return {
      success: true,
    };
  }

  return {
    fieldErrors: mapOrganizationValidationIssuesToFieldErrors(
      result.error.issues,
    ),
    success: false,
  };
}

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

    async createOrganization(input) {
      const validation = validateCreate(input);

      if (!validation.success) {
        return {
          fieldErrors: validation.fieldErrors,
          message: tDefault(
            'admin.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const organization =
          await organizationService.createOrganization(input);

        return {
          organization,
          status: 'saved',
        };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },

    async updateOrganization(organizationId, input) {
      const validation = validateUpdate(input);

      if (!validation.success) {
        return {
          fieldErrors: validation.fieldErrors,
          message: tDefault(
            'admin.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const organization = await organizationService.updateOrganization(
          organizationId,
          input,
        );

        return {
          organization,
          status: 'saved',
        };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },
  };
}
