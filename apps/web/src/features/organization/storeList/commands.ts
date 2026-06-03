import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { OrganizationStoreListActions } from './actions';

export type LoadOrganizationStoresResult = { status: 'loaded' } | AdminCommandFailure;

export type OrganizationStoreListCommands = {
  loadStores(
    organizationId: string,
    input: { limit: number; offset: number },
  ): Promise<LoadOrganizationStoresResult>;
};

export function createOrganizationStoreListCommands(
  actions: OrganizationStoreListActions,
): OrganizationStoreListCommands {
  return {
    async loadStores(organizationId, input) {
      actions.loadStarted();

      try {
        const result = await organizationService.listAdminStores(
          organizationId,
          input,
        );

        actions.loadSucceeded(result);
        return { status: 'loaded' };
      } catch (error) {
        const failure = mapAdminApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },
  };
}
