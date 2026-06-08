import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { OrganizationMembershipListActions } from './actions';

export type LoadMembershipsResult = { status: 'loaded' } | AdminCommandFailure;

export type LoadMembershipsInput = { limit: number; offset: number };

export type OrganizationMembershipListCommands = {
  loadMemberships(
    organizationId: string,
    input: LoadMembershipsInput,
  ): Promise<LoadMembershipsResult>;
};

export function createOrganizationMembershipListCommands(
  actions: OrganizationMembershipListActions,
): OrganizationMembershipListCommands {
  return {
    async loadMemberships(organizationId, input) {
      actions.loadStarted();

      try {
        const result = await organizationService.listOrganizationMemberships(
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
