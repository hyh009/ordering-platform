import type { OrganizationStoreListActions } from '@/features/admin/organization/stores/list/actions';
import {
  createOrganizationStoreListCommands,
  type OrganizationStoreListCommands,
  type LoadOrganizationStoresResult,
} from '@/features/admin/organization/stores/list/commands';

export type { LoadOrganizationStoresResult };

export type StoreListPageCommands = Pick<
  OrganizationStoreListCommands,
  'loadStores'
>;

export function createStoreListPageCommands(
  actions: OrganizationStoreListActions,
): StoreListPageCommands {
  const base = createOrganizationStoreListCommands(actions);

  // To override a command:
  //   return { ...base, loadStores: async (...args) => { ... } };
  return base;
}
