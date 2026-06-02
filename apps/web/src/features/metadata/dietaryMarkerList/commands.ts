import { tDefault } from '@/app/i18n';
import {
  createDietaryMarkerSchema,
  updateDietaryMarkerSchema,
} from '@/models/metadata';
import type {
  CreateDietaryMarkerRequest,
  DietaryMarker,
  MetadataActiveFilter,
  UpdateDietaryMarkerRequest,
} from '@/models/metadata';
import { metadataService } from '@/services/metadata.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { DietaryMarkerListActions } from './actions';

export type DietaryMarkerCommandFieldErrors = Partial<
  Record<'key' | 'zhTw' | 'en', string>
>;

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
      fieldErrors?: DietaryMarkerCommandFieldErrors;
    });

export type DietaryMarkerListCommands = {
  createDietaryMarker(
    input: CreateDietaryMarkerRequest,
  ): Promise<SaveDietaryMarkerResult>;
  loadDietaryMarkers(
    isActive: MetadataActiveFilter,
  ): Promise<LoadDietaryMarkersResult>;
  updateDietaryMarker(
    dietaryMarkerId: string,
    input: UpdateDietaryMarkerRequest,
  ): Promise<SaveDietaryMarkerResult>;
};

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
  ) as DietaryMarkerCommandFieldErrors;
}

export function createDietaryMarkerListCommands(
  actions: DietaryMarkerListActions,
): DietaryMarkerListCommands {
  return {
    async loadDietaryMarkers(isActive) {
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

    async createDietaryMarker(input) {
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

    async updateDietaryMarker(dietaryMarkerId, input) {
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
