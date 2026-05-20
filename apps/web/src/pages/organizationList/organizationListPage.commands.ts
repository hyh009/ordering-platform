import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from '@repo/shared';
import { tDefault } from '@/app/i18n';
import type { OrganizationListActions } from '@/features/organization/actions/organizationList.actions';
import type { Organization } from '@/models/organization.types';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/pages/admin.errors';
import type { OrganizationFormFieldErrors } from './useOrganizationForm';
import type {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '@/models/organization.types';

export type LoadOrganizationsResult =
  | {
      status: 'loaded';
    }
  | AdminCommandFailure;

export type SaveOrganizationResult =
  | {
      organization: Organization;
      status: 'saved';
    }
  | (AdminCommandFailure & {
      fieldErrors?: OrganizationFormFieldErrors;
    });

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
  | { success: false; fieldErrors: OrganizationFormFieldErrors } {
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
    ) as OrganizationFormFieldErrors,
    success: false,
  };
}

function validateUpdate(
  input: UpdateOrganizationRequest,
):
  | { success: true }
  | { success: false; fieldErrors: OrganizationFormFieldErrors } {
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

export function createOrganizationListPageCommands(
  actions: OrganizationListActions,
) {
  return {
    async loadOrganizations(input: {
      limit: number;
      offset: number;
    }): Promise<LoadOrganizationsResult> {
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

    async createOrganization(
      input: CreateOrganizationRequest,
    ): Promise<SaveOrganizationResult> {
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

        actions.organizationSaved(organization);
        return {
          organization,
          status: 'saved',
        };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },

    async updateOrganization(
      organizationId: string,
      input: UpdateOrganizationRequest,
    ): Promise<SaveOrganizationResult> {
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

        actions.organizationSaved(organization);
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
