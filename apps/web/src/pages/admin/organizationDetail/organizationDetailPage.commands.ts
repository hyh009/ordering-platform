import {
  createOrganizationDetailCommands,
  type LoadOrganizationDetailResult,
  type OrganizationDetailCommands,
  type SaveOrganizationDetailResult,
} from '@/features/admin/organization/detail/commands';
import type { OrganizationDetailActions } from '@/features/admin/organization/detail/actions';

export type LoadOrganizationResult = LoadOrganizationDetailResult;
export type { SaveOrganizationDetailResult };

export type OrganizationDetailPageCommands = Pick<
  OrganizationDetailCommands,
  | 'loadOrganization'
  | 'saveOrganizationDetail'
  | 'reviewOrganization'
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
    reviewOrganization: base.reviewOrganization,
    loadStores: base.loadStores,
    loadOwner: base.loadOwner,
    ...overrides,
  };
}
