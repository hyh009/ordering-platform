import {
  createOrganizationStoreMutationCommands,
  type StoreMutationFieldErrors,
} from '@/features/admin/organization/stores/mutations/commands';
import type { CreateStoreRequest, Store } from '@/models/store';
import type { AdminCommandFailure } from '@/services/utils/adminApiError';

export type CreateStoreResult =
  | { status: 'created'; store: Store }
  | (AdminCommandFailure & {
      fieldErrors?: StoreMutationFieldErrors;
    });

export type StoreCreatePageCommands = {
  createStore(
    organizationId: string,
    input: CreateStoreRequest,
  ): Promise<CreateStoreResult>;
};

export function createStoreCreatePageCommands(): StoreCreatePageCommands {
  const mutationCommands = createOrganizationStoreMutationCommands();

  return {
    async createStore(organizationId, input) {
      const result = await mutationCommands.createStore(organizationId, input);

      if (result.status !== 'saved') {
        return result;
      }

      return { status: 'created', store: result.store };
    },
  };
}
