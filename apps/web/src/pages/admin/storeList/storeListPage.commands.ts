import type { OrganizationStoreListActions } from '@/features/organization/storeList/actions';
import {
  createOrganizationStoreListCommands,
  type OrganizationStoreListCommands,
  type LoadOrganizationStoresResult,
} from '@/features/organization/storeList/commands';

export type { LoadOrganizationStoresResult };

export type StoreListPageCommands = Pick<OrganizationStoreListCommands, 'loadStores'>;

export function createStoreListPageCommands(
  actions: OrganizationStoreListActions,
): StoreListPageCommands {
  const base = createOrganizationStoreListCommands(actions);

  // To override a command:
  //   return { ...base, loadStores: async (...args) => { ... } };
  return base;
}
