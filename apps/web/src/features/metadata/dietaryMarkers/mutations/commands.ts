import { tDefault } from '@/app/i18n';
import {
  createDietaryMarkerSchema,
  updateDietaryMarkerSchema,
} from '@/models/metadata';
import type {
  CreateDietaryMarkerRequest,
  DietaryMarker,
  UpdateDietaryMarkerRequest,
} from '@/models/metadata';
import { metadataService } from '@/services/metadata.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import { mapMetadataFieldErrors } from '../../metadataFieldErrors';

export type DietaryMarkerCommandFieldErrors = Partial<
  Record<'key' | 'name', string>
>;

export type SaveDietaryMarkerResult =
  | {
      dietaryMarker: DietaryMarker;
      status: 'saved';
    }
  | (AdminCommandFailure & {
      fieldErrors?: DietaryMarkerCommandFieldErrors;
    });

export type DietaryMarkerMutationCommands = {
  createDietaryMarker(
    input: CreateDietaryMarkerRequest,
  ): Promise<SaveDietaryMarkerResult>;
  updateDietaryMarker(
    dietaryMarkerId: string,
    input: UpdateDietaryMarkerRequest,
  ): Promise<SaveDietaryMarkerResult>;
};

export function createDietaryMarkerMutationCommands(): DietaryMarkerMutationCommands {
  return {
    async createDietaryMarker(input) {
      const validation = createDietaryMarkerSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapMetadataFieldErrors<DietaryMarkerCommandFieldErrors>(
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
        const dietaryMarker = await metadataService.createDietaryMarker(input);

        return {
          dietaryMarker,
          status: 'saved',
        };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },

    async updateDietaryMarker(dietaryMarkerId, input) {
      const validation = updateDietaryMarkerSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapMetadataFieldErrors<DietaryMarkerCommandFieldErrors>(
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
        const dietaryMarker = await metadataService.updateDietaryMarker(
          dietaryMarkerId,
          input,
        );

        return {
          dietaryMarker,
          status: 'saved',
        };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },
  };
}
