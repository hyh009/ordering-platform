import {
  createDietaryMarkerSchema,
  updateDietaryMarkerSchema,
} from '@repo/shared';
import { tDefault } from '@/app/i18n';
import type { DietaryMarkerListActions } from '@/features/metadata/actions/dietaryMarkerList.actions';
import type {
  CreateDietaryMarkerRequest,
  DietaryMarker,
  MetadataActiveFilter,
  UpdateDietaryMarkerRequest,
} from '@/models/metadata.types';
import { metadataService } from '@/services/metadata.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/pages/admin.errors';
import type { DietaryMarkerFormFieldErrors } from './useDietaryMarkerForm';

export type LoadDietaryMarkersResult =
  | {
      status: 'loaded';
    }
  | AdminCommandFailure;

export type SaveDietaryMarkerResult =
  | {
      dietaryMarker: DietaryMarker;
      status: 'saved';
    }
  | (AdminCommandFailure & {
      fieldErrors?: DietaryMarkerFormFieldErrors;
    });

function fieldErrorForPath(path: string) {
  if (path === 'key') {
    return tDefault(
      'admin.metadata.validation.key',
      'Use lowercase letters, numbers, hyphens, or underscores.',
    );
  }

  if (path === 'name.zh-TW') {
    return tDefault(
      'admin.metadata.validation.zhTwRequired',
      'Chinese name is required.',
    );
  }

  return tDefault('admin.validation.invalidField', 'This field is invalid.');
}

function mapDietaryMarkerFieldErrors(issues: Array<{ path: PropertyKey[] }>) {
  return Object.fromEntries(
    issues.map((issue) => {
      const path = issue.path.map(String).join('.');
      const field = path === 'name.zh-TW' ? 'zhTw' : String(issue.path[0]);

      return [field, fieldErrorForPath(path)];
    }),
  ) as DietaryMarkerFormFieldErrors;
}

export function createDietaryMarkerListPageCommands(
  actions: DietaryMarkerListActions,
) {
  return {
    async loadDietaryMarkers(
      isActive: MetadataActiveFilter,
    ): Promise<LoadDietaryMarkersResult> {
      actions.loadStarted();

      try {
        const dietaryMarkers =
          await metadataService.listDietaryMarkers(isActive);

        actions.loadSucceeded(dietaryMarkers);
        return {
          status: 'loaded',
        };
      } catch (error) {
        const failure = mapAdminApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },

    async createDietaryMarker(
      input: CreateDietaryMarkerRequest,
    ): Promise<SaveDietaryMarkerResult> {
      const validation = createDietaryMarkerSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapDietaryMarkerFieldErrors(validation.error.issues),
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

        actions.dietaryMarkerSaved(dietaryMarker);
        return {
          dietaryMarker,
          status: 'saved',
        };
      } catch (error) {
        return mapAdminApiError(error);
      }
    },

    async updateDietaryMarker(
      dietaryMarkerId: string,
      input: UpdateDietaryMarkerRequest,
    ): Promise<SaveDietaryMarkerResult> {
      const validation = updateDietaryMarkerSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapDietaryMarkerFieldErrors(validation.error.issues),
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

        actions.dietaryMarkerSaved(dietaryMarker);
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
