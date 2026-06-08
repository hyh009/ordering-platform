import type { OrganizationMembershipListActions } from '@/features/admin/organization/membership/actions';
import {
  createOrganizationMembershipListCommands,
  type LoadMembershipsInput,
  type LoadMembershipsResult,
  type OrganizationMembershipListCommands,
} from '@/features/admin/organization/membership/commands';
import {
  organizationMembershipMutationCommands,
  type SaveMembershipResult,
} from '@/features/admin/organization/membership/mutations/commands';

export type { LoadMembershipsResult, SaveMembershipResult };

export type OrganizationMembershipsPageCommands = Pick<
  OrganizationMembershipListCommands,
  'loadMemberships'
> & {
  addMember(
    organizationId: string,
    input: Parameters<typeof organizationMembershipMutationCommands.addMember>[1],
    reloadInput: LoadMembershipsInput,
  ): Promise<SaveMembershipResult>;
  updateMembership(
    organizationId: string,
    membershipId: string,
    input: Parameters<
      typeof organizationMembershipMutationCommands.updateMembership
    >[2],
    reloadInput: LoadMembershipsInput,
  ): Promise<SaveMembershipResult>;
};

export function createOrganizationMembershipsPageCommands(
  actions: OrganizationMembershipListActions,
): OrganizationMembershipsPageCommands {
  const base = createOrganizationMembershipListCommands(actions);

  const overrides = {
    async addMember(organizationId, input, reloadInput) {
      const result = await organizationMembershipMutationCommands.addMember(
        organizationId,
        input,
      );

      if (result.status === 'saved') {
        await base.loadMemberships(organizationId, reloadInput);
      }

      return result;
    },

    async updateMembership(organizationId, membershipId, input, reloadInput) {
      const result =
        await organizationMembershipMutationCommands.updateMembership(
          organizationId,
          membershipId,
          input,
        );

      if (result.status === 'saved') {
        await base.loadMemberships(organizationId, reloadInput);
      }

      return result;
    },
  } satisfies Partial<OrganizationMembershipsPageCommands>;

  return {
    loadMemberships: base.loadMemberships,
    ...overrides,
  };
}
