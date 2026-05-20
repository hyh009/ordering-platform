import { updateOrganizationSchema } from '@repo/shared';
import { tDefault } from '@/app/i18n';
import type { OrganizationDetailActions } from '@/features/organization/actions/organizationDetail.actions';
import type {
  Organization,
  UpdateOrganizationRequest,
} from '@/models/organization.types';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/pages/admin.errors';
import type { OrganizationFormFieldErrors } from '@/pages/organizationList/useOrganizationForm';

export type LoadOrganizationResult =
  | {
      status: 'loaded';
    }
  | AdminCommandFailure;

export type SaveOrganizationDetailResult =
  | {
      organization: Organization;
      status: 'saved';
    }
  | (AdminCommandFailure & {
      fieldErrors?: OrganizationFormFieldErrors;
    });

export function createOrganizationDetailPageCommands(
  actions: OrganizationDetailActions,
) {
  return {
    async loadOrganization(
      organizationId: string,
    ): Promise<LoadOrganizationResult> {
      actions.loadStarted();

      try {
        const organization =
          await organizationService.getOrganization(organizationId);

        actions.loadSucceeded(organization);
        return {
          status: 'loaded',
        };
      } catch (error) {
        const failure = mapAdminApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },

    async updateOrganization(
      organizationId: string,
      input: UpdateOrganizationRequest,
    ): Promise<SaveOrganizationDetailResult> {
      const validation = updateOrganizationSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: {
            name: tDefault(
              'admin.organizations.validation.nameRequired',
              'Organization name is required.',
            ),
          },
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
