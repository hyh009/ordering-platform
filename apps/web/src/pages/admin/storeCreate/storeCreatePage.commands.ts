import type { CreateStoreRequest } from '@repo/shared';
import type { Store } from '@/models/store';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';

export type CreateStoreResult =
  | { status: 'created'; store: Store }
  | AdminCommandFailure;

export type StoreCreatePageCommands = {
  createStore(
    organizationId: string,
    input: CreateStoreRequest,
  ): Promise<CreateStoreResult>;
};

export function createStoreCreatePageCommands(): StoreCreatePageCommands {
  return {
    async createStore(organizationId, input) {
      try {
        const store = await organizationService.createAdminStore(
          organizationId,
          input,
        );
        return { status: 'created', store };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },
  };
}
