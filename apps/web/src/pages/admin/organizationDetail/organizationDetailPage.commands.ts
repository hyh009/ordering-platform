import {
  createOrganizationDetailCommands,
  type LoadOrganizationDetailResult,
  type OrganizationDetailCommands,
  type SaveOrganizationDetailResult,
} from '@/features/organization/detail/commands';
import type { OrganizationDetailActions } from '@/features/organization/detail/actions';

export type LoadOrganizationResult = LoadOrganizationDetailResult;
export type { SaveOrganizationDetailResult };

export type OrganizationDetailPageCommands = Pick<
  OrganizationDetailCommands,
  | 'loadOrganization'
  | 'saveOrganizationDetail'
  | 'loadStores'
  | 'loadOwner'
>;

export function createOrganizationDetailPageCommands(
  actions: OrganizationDetailActions,
): OrganizationDetailPageCommands {
  const base = createOrganizationDetailCommands(actions);

  const overrides = {} satisfies Partial<OrganizationDetailPageCommands>;

  return {
    loadOrganization: base.loadOrganization,
    saveOrganizationDetail: base.saveOrganizationDetail,
    loadStores: base.loadStores,
    loadOwner: base.loadOwner,
    ...overrides,
  };
}
