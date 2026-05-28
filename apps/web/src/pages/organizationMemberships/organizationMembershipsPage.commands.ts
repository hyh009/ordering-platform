import type { OrganizationMembershipListActions } from '@/features/organization/membership/actions';
import {
  createOrganizationMembershipListCommands,
  type LoadMembershipsResult,
  type OrganizationMembershipListCommands,
  type SaveMembershipResult,
} from '@/features/organization/membership/commands';

export type { LoadMembershipsResult, SaveMembershipResult };

export type OrganizationMembershipsPageCommands = Pick<
  OrganizationMembershipListCommands,
  'addMember' | 'loadMemberships' | 'updateMembership'
>;

export function createOrganizationMembershipsPageCommands(
  actions: OrganizationMembershipListActions,
): OrganizationMembershipsPageCommands {
  const base = createOrganizationMembershipListCommands(actions);

  const overrides = {} satisfies Partial<OrganizationMembershipsPageCommands>;

  return {
    addMember: base.addMember,
    loadMemberships: base.loadMemberships,
    updateMembership: base.updateMembership,
    ...overrides,
  };
}
