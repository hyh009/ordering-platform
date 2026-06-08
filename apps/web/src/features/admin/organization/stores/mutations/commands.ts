import { tDefault } from '@/app/i18n';
import { mapStoreValidationIssuesToFieldErrors } from '@/features/components/store/storeForm/storeFormErrors';
import { createStoreSchema } from '@/models/store';
import type { CreateStoreRequest, Store } from '@/models/store';
import { organizationService } from '@/services/organization.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';

export type StoreMutationFieldErrors = ReturnType<
  typeof mapStoreValidationIssuesToFieldErrors
>;

export type SaveStoreResult =
  | { status: 'saved'; store: Store }
  | (AdminCommandFailure & {
      fieldErrors?: StoreMutationFieldErrors;
    });

function invalidStoreResult(fieldErrors: StoreMutationFieldErrors) {
  return {
    fieldErrors,
    message: tDefault(
      'admin.errors.validation',
      'Check the highlighted fields and try again.',
    ),
    reason: 'invalid',
    status: 'failed',
  } satisfies SaveStoreResult;
}

export function createOrganizationStoreMutationCommands() {
  return {
    async createStore(
      organizationId: string,
      input: CreateStoreRequest,
    ): Promise<SaveStoreResult> {
      const validation = createStoreSchema.safeParse(input);

      if (!validation.success) {
        return invalidStoreResult(
          mapStoreValidationIssuesToFieldErrors(
            validation.error.issues,
            input.locale.defaultLocale,
          ),
        );
      }

      try {
        const store = await organizationService.createAdminStore(
          organizationId,
          validation.data,
        );

        return { status: 'saved', store };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },
  };
}

export type OrganizationStoreMutationCommands = ReturnType<
  typeof createOrganizationStoreMutationCommands
>;
