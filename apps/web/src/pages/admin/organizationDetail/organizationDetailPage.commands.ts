import {
  createOrganizationDetailCommands,
  type LoadOrganizationDetailResult,
  type OrganizationDetailCommands,
} from '@/features/admin/organization/detail/commands';
import type { OrganizationDetailActions } from '@/features/admin/organization/detail/actions';
import {
  organizationMutationCommands,
  type SaveOrganizationResult,
} from '@/features/admin/organization/mutations/commands';

export type LoadOrganizationResult = LoadOrganizationDetailResult;
export type SaveOrganizationDetailResult = SaveOrganizationResult;

export type OrganizationDetailPageCommands = Pick<
  OrganizationDetailCommands,
  'loadOrganization' | 'loadStores' | 'loadOwner'
> & {
  reviewOrganization: typeof organizationMutationCommands.reviewOrganization;
  saveOrganizationDetail: typeof organizationMutationCommands.updateOrganization;
};

export function createOrganizationDetailPageCommands(
  actions: OrganizationDetailActions,
): OrganizationDetailPageCommands {
  const base = createOrganizationDetailCommands(actions);

  const overrides = {
    async reviewOrganization(organizationId, reviewStatus) {
      const result = await organizationMutationCommands.reviewOrganization(
        organizationId,
        reviewStatus,
      );

      if (result.status === 'saved') {
        await base.loadOrganization(organizationId);
      }

      return result;
    },
    async saveOrganizationDetail(organizationId, input) {
      const result = await organizationMutationCommands.updateOrganization(
        organizationId,
        input,
      );

      if (result.status === 'saved') {
        await base.loadOrganization(organizationId);
      }

      return result;
    },
  } satisfies Partial<OrganizationDetailPageCommands>;

  return {
    loadOrganization: base.loadOrganization,
    loadStores: base.loadStores,
    loadOwner: base.loadOwner,
    ...overrides,
  };
}
