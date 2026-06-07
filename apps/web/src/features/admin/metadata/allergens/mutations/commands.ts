import { tDefault } from '@/app/i18n';
import { createAllergenSchema, updateAllergenSchema } from '@/models/metadata';
import type {
  Allergen,
  CreateAllergenRequest,
  UpdateAllergenRequest,
} from '@/models/metadata';
import { metadataService } from '@/services/metadata.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import { mapMetadataFieldErrors } from '../../metadataFieldErrors';

export type AllergenCommandFieldErrors = Partial<
  Record<'key' | 'name', string>
>;

export type SaveAllergenResult =
  | {
      allergen: Allergen;
      status: 'saved';
    }
  | (AdminCommandFailure & {
      fieldErrors?: AllergenCommandFieldErrors;
    });

export type AllergenMutationCommands = {
  createAllergen(input: CreateAllergenRequest): Promise<SaveAllergenResult>;
  updateAllergen(
    allergenId: string,
    input: UpdateAllergenRequest,
  ): Promise<SaveAllergenResult>;
};

export function createAllergenMutationCommands(): AllergenMutationCommands {
  return {
    async createAllergen(input) {
      const validation = createAllergenSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapMetadataFieldErrors<AllergenCommandFieldErrors>(
            validation.error.issues,
          ),
          message: tDefault(
            'admin.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const allergen = await metadataService.createAllergen(input);

        return {
          allergen,
          status: 'saved',
        };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },

    async updateAllergen(allergenId, input) {
      const validation = updateAllergenSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapMetadataFieldErrors<AllergenCommandFieldErrors>(
            validation.error.issues,
          ),
          message: tDefault(
            'admin.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const allergen = await metadataService.updateAllergen(
          allergenId,
          input,
        );

        return {
          allergen,
          status: 'saved',
        };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },
  };
}
