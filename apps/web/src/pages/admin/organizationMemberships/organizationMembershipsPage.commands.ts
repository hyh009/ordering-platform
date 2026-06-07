import type { OrganizationMembershipListActions } from '@/features/admin/organization/membership/actions';
import {
  createOrganizationMembershipListCommands,
  type LoadMembershipsResult,
  type OrganizationMembershipListCommands,
  type SaveMembershipResult,
} from '@/features/admin/organization/membership/commands';

export type { LoadMembershipsResult, SaveMembershipResult };

export type OrganizationMembershipsPageCommands = Pick<
  OrganizationMembershipListCommands,
  'addMember' | 'loadMemberships' | 'updateMembership'
>;

export function createOrganizationMembershipsPageCommands(
  actions: OrganizationMembershipListActions,
): OrganizationMembershipsPageCommands {
  const base = createOrganizationMembershipListCommands(actions);

  // To override a command:
  //   return { ...base, loadMemberships: async (...args) => { ... } };
  return base;
}
