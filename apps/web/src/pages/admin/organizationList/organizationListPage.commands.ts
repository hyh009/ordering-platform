import type { OrganizationListActions } from '@/features/admin/organization/list/actions';
import {
  createOrganizationListCommands,
  type LoadOrganizationsResult,
  type OrganizationListCommands,
  type SaveOrganizationListResult,
} from '@/features/admin/organization/list/commands';

export type { LoadOrganizationsResult };
export type SaveOrganizationResult = SaveOrganizationListResult;

export type OrganizationListPageCommands = Pick<
  OrganizationListCommands,
  'createOrganization' | 'loadOrganizations' | 'updateOrganization'
>;

export function createOrganizationListPageCommands(
  actions: OrganizationListActions,
): OrganizationListPageCommands {
  const base = createOrganizationListCommands(actions);

  const overrides = {} satisfies Partial<OrganizationListPageCommands>;

  return {
    createOrganization: base.createOrganization,
    loadOrganizations: base.loadOrganizations,
    updateOrganization: base.updateOrganization,
    ...overrides,
  };
}
