import { updateOrganizationSchema } from '@repo/shared';
import { tDefault } from '@/app/i18n';
import type {
  Organization,
  UpdateOrganizationRequest,
} from '@/models/organization.types';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { OrganizationDetailActions } from './actions';

export type OrganizationDetailCommandFieldErrors = Partial<
  Record<'name' | 'status', string>
>;

export type LoadOrganizationDetailResult =
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
      fieldErrors?: OrganizationDetailCommandFieldErrors;
    });

export type OrganizationDetailCommands = {
  loadOrganization(organizationId: string): Promise<LoadOrganizationDetailResult>;
  saveOrganizationDetail(
    organizationId: string,
    input: UpdateOrganizationRequest,
  ): Promise<SaveOrganizationDetailResult>;
};

export function createOrganizationDetailCommands(
  actions: OrganizationDetailActions,
): OrganizationDetailCommands {
  return {
    async loadOrganization(organizationId) {
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

    async saveOrganizationDetail(organizationId, input) {
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
