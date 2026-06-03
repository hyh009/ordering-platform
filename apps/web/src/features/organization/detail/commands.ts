import { tDefault } from '@/app/i18n';
import {
  mapOrganizationValidationIssuesToFieldErrors,
  type OrganizationFormFieldErrors,
} from '@/features/organization/components/organizationForm/organizationFormErrors';
import { updateOrganizationSchema } from '@/models/organization';
import type {
  Organization,
  OrganizationReviewStatus,
  UpdateOrganizationRequest,
} from '@/models/organization';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { OrganizationDetailActions } from './actions';

export type OrganizationDetailCommandFieldErrors = OrganizationFormFieldErrors;

export type LoadOrganizationDetailResult =
  | { status: 'loaded' }
  | AdminCommandFailure;

export type SaveOrganizationDetailResult =
  | { organization: Organization; status: 'saved' }
  | (AdminCommandFailure & {
      fieldErrors?: OrganizationDetailCommandFieldErrors;
    });

export type OrganizationDetailCommands = {
  loadOrganization(
    organizationId: string,
  ): Promise<LoadOrganizationDetailResult>;
  saveOrganizationDetail(
    organizationId: string,
    input: UpdateOrganizationRequest,
  ): Promise<SaveOrganizationDetailResult>;
  reviewOrganization(
    organizationId: string,
    reviewStatus: OrganizationReviewStatus,
  ): Promise<SaveOrganizationDetailResult>;
  loadStores(organizationId: string): Promise<LoadOrganizationDetailResult>;
  loadOwner(organizationId: string): Promise<void>;
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
        return { status: 'loaded' };
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
          fieldErrors: mapOrganizationValidationIssuesToFieldErrors(
            validation.error.issues,
          ),
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
        return { organization, status: 'saved' };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },

    async reviewOrganization(organizationId, reviewStatus) {
      try {
        const organization = await organizationService.updateOrganization(
          organizationId,
          { reviewStatus },
        );

        actions.organizationSaved(organization);
        return { organization, status: 'saved' };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },

    async loadStores(organizationId) {
      actions.storesLoadStarted();

      try {
        const result =
          await organizationService.listAdminStores(organizationId);

        actions.storesLoadSucceeded(result.stores);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapAdminApiError(error);

        actions.storesLoadFailed(failure.message);
        return failure;
      }
    },

    async loadOwner(organizationId) {
      actions.ownerLoadStarted();

      try {
        const result = await organizationService.listOrganizationMemberships(
          organizationId,
          { limit: 10, offset: 0 },
        );
        const owner =
          result.memberships.find((m) => m.role === 'org_owner') ?? null;

        actions.ownerLoadSucceeded(owner);
      } catch {
        actions.ownerLoadFailed();
      }
    },
  };
}
