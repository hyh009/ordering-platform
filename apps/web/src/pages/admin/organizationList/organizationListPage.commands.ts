import type { OrganizationListActions } from '@/features/admin/organization/list/actions';
import {
  createOrganizationListCommands,
  type LoadOrganizationsResult,
  type OrganizationListCommands,
  type OrganizationListLoadInput,
} from '@/features/admin/organization/list/commands';
import {
  organizationMutationCommands,
  type SaveOrganizationResult,
} from '@/features/admin/organization/mutations/commands';
import type {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '@/models/organization';

export type { LoadOrganizationsResult, SaveOrganizationResult };

export type OrganizationListPageCommands = Pick<
  OrganizationListCommands,
  'loadOrganizations'
> & {
  createOrganization(
    input: CreateOrganizationRequest,
    reloadInput: OrganizationListLoadInput,
  ): Promise<SaveOrganizationResult>;
  updateOrganization(
    organizationId: string,
    input: UpdateOrganizationRequest,
    reloadInput: OrganizationListLoadInput,
  ): Promise<SaveOrganizationResult>;
};

export function createOrganizationListPageCommands(
  actions: OrganizationListActions,
): OrganizationListPageCommands {
  const base = createOrganizationListCommands(actions);

  const overrides = {
    async createOrganization(input, reloadInput) {
      const result = await organizationMutationCommands.createOrganization(input);

      if (result.status === 'saved') {
        await base.loadOrganizations(reloadInput);
      }

      return result;
    },

    async updateOrganization(organizationId, input, reloadInput) {
      const result = await organizationMutationCommands.updateOrganization(
        organizationId,
        input,
      );

      if (result.status === 'saved') {
        await base.loadOrganizations(reloadInput);
      }

      return result;
    },
  } satisfies Partial<OrganizationListPageCommands>;

  return {
    loadOrganizations: base.loadOrganizations,
    ...overrides,
  };
}
