import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from '@repo/shared';
import { tDefault } from '@/app/i18n';
import type { Organization } from '@/models/organization';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '@/models/organization';
import type { OrganizationListActions } from './actions';

export type OrganizationListCommandField = 'name' | 'ownerUserId' | 'status';
export type OrganizationListCommandFieldErrors = Partial<
  Record<OrganizationListCommandField, string>
>;

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
  }): Promise<LoadOrganizationsResult>;
  updateOrganization(
    organizationId: string,
    input: UpdateOrganizationRequest,
  ): Promise<SaveOrganizationListResult>;
};

function organizationValidationErrors() {
  return {
    name: tDefault(
      'admin.organizations.validation.nameRequired',
      'Organization name is required.',
    ),
    ownerUserId: tDefault(
      'admin.organizations.validation.ownerRequired',
      'Owner user ID is required.',
    ),
  };
}

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

  const messages = organizationValidationErrors();

  return {
    fieldErrors: Object.fromEntries(
      result.error.issues.map((issue) => [
        issue.path[0],
        messages[issue.path[0] as keyof typeof messages] ??
          tDefault('admin.validation.invalidField', 'This field is invalid.'),
      ]),
    ) as OrganizationListCommandFieldErrors,
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
    fieldErrors: {
      name: tDefault(
        'admin.organizations.validation.nameRequired',
        'Organization name is required.',
      ),
    },
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
        const result = await organizationService.listOrganizations(input);

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
