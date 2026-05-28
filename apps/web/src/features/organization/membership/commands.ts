import {
  createOrganizationMembershipSchema,
  updateOrganizationMembershipSchema,
} from '@repo/shared';
import { tDefault } from '@/app/i18n';
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
      const validation = createOrganizationMembershipSchema.safeParse(input);

      if (!validation.success) {
        return {
          message: tDefault(
            'admin.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const membership = await organizationService.addOrganizationMember(
          organizationId,
          input,
        );

        actions.memberAdded(membership);
        return { status: 'saved', membership };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },

    async updateMembership(organizationId, membershipId, input) {
      const validation = updateOrganizationMembershipSchema.safeParse(input);

      if (!validation.success) {
        return {
          message: tDefault(
            'admin.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

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
