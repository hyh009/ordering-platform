import { tDefault } from '@/app/i18n';
import { createAllergenSchema, updateAllergenSchema } from '@/models/metadata';
import type {
  Allergen,
  CreateAllergenRequest,
  MetadataActiveFilter,
  UpdateAllergenRequest,
} from '@/models/metadata';
import { metadataService } from '@/services/metadata.service';
import {
  mapAdminApiError,
  type AdminCommandFailure,
} from '@/services/utils/adminApiError';
import type { AllergenListActions } from './actions';

export type AllergenCommandFieldErrors = Partial<
  Record<'key' | 'zhTw' | 'en', string>
>;

export type LoadAllergensResult =
  | {
      status: 'loaded';
    }
  | AdminCommandFailure;

export type SaveAllergenResult =
  | {
      allergen: Allergen;
      status: 'saved';
    }
  | (AdminCommandFailure & {
      fieldErrors?: AllergenCommandFieldErrors;
    });

export type AllergenListCommands = {
  createAllergen(input: CreateAllergenRequest): Promise<SaveAllergenResult>;
  loadAllergens(isActive: MetadataActiveFilter): Promise<LoadAllergensResult>;
  updateAllergen(
    allergenId: string,
    input: UpdateAllergenRequest,
  ): Promise<SaveAllergenResult>;
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

function mapAllergenFieldErrors(issues: Array<{ path: PropertyKey[] }>) {
  return Object.fromEntries(
    issues.map((issue) => {
      const path = issue.path.map(String).join('.');
      const field = path === 'name.zh-TW' ? 'zhTw' : String(issue.path[0]);

      return [field, fieldErrorForPath(path)];
    }),
  ) as AllergenCommandFieldErrors;
}

export function createAllergenListCommands(
  actions: AllergenListActions,
): AllergenListCommands {
  return {
    async loadAllergens(isActive) {
      actions.loadStarted();

      try {
        const allergens = await metadataService.listAllergens(isActive);

        actions.loadSucceeded(allergens);
        return {
          status: 'loaded',
        };
      } catch (error) {
        const failure = mapAdminApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },

    async createAllergen(input) {
      const validation = createAllergenSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapAllergenFieldErrors(validation.error.issues),
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

        actions.allergenSaved(allergen);
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
          fieldErrors: mapAllergenFieldErrors(validation.error.issues),
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

        actions.allergenSaved(allergen);
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
