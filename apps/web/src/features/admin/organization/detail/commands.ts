import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { OrganizationDetailActions } from './actions';

export type LoadOrganizationDetailResult =
  | { status: 'loaded' }
  | AdminCommandFailure;

export type OrganizationDetailCommands = {
  loadOrganization(
    organizationId: string,
  ): Promise<LoadOrganizationDetailResult>;
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
