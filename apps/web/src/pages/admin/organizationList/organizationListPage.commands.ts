import type { OrganizationListActions } from '@/features/organization/list/actions';
import {
  createOrganizationListCommands,
  type LoadOrganizationsResult,
  type OrganizationListCommands,
  type SaveOrganizationListResult,
} from '@/features/organization/list/commands';

export type { LoadOrganizationsResult };
export type SaveOrganizationResult = SaveOrganizationListResult;

export type OrganizationListPageCommands = Pick<
  OrganizationListCommands,
  | 'createOrganization'
  | 'loadOrganizations'
  | 'reviewOrganization'
  | 'updateOrganization'
>;

export function createOrganizationListPageCommands(
  actions: OrganizationListActions,
): OrganizationListPageCommands {
  const base = createOrganizationListCommands(actions);

  const overrides = {} satisfies Partial<OrganizationListPageCommands>;

  return {
    createOrganization: base.createOrganization,
    loadOrganizations: base.loadOrganizations,
    reviewOrganization: base.reviewOrganization,
    updateOrganization: base.updateOrganization,
    ...overrides,
  };
}
