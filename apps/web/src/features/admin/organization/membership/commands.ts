import type { OrganizationMembership } from '@/models/organizationMembership';
import type {
  CreateOrganizationMembershipRequest,
  UpdateOrganizationMembershipRequest,
} from '@/models/organizationMembership';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { OrganizationMembershipListActions } from './actions';

export type LoadMembershipsResult = { status: 'loaded' } | AdminCommandFailure;

export type SaveMembershipResult =
  | { status: 'saved'; membership: OrganizationMembership }
  | AdminCommandFailure;

export type OrganizationMembershipListCommands = {
  loadMemberships(
    organizationId: string,
    input: { limit: number; offset: number },
  ): Promise<LoadMembershipsResult>;
  addMember(
    organizationId: string,
    input: CreateOrganizationMembershipRequest,
  ): Promise<SaveMembershipResult>;
  updateMembership(
    organizationId: string,
    membershipId: string,
    input: UpdateOrganizationMembershipRequest,
  ): Promise<SaveMembershipResult>;
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

    async addMember(organizationId, input) {
      try {
        const membership = await organizationService.addOrganizationMember(
          organizationId,
          input,
        );

        return { status: 'saved', membership };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },

    async updateMembership(organizationId, membershipId, input) {
      try {
        const membership = await organizationService.updateOrganizationMembership(
          organizationId,
          membershipId,
          input,
        );

        actions.membershipSaved(membership);
        return { status: 'saved', membership };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },
  };
}
