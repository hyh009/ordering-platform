import { tDefault } from '@/app/i18n';
import { createTagSchema, updateTagSchema } from '@/models/tag';
import type {
  CreateTagRequest,
  Tag,
  TagActiveFilter,
  UpdateTagRequest,
} from '@/models/tag';
import { tagService } from '@/services/tag.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { TagListActions } from './actions';

export type TagCommandFieldErrors = Partial<Record<'name' | 'color', string>>;

export type LoadTagsResult =
  | {
      status: 'loaded';
    }
  | MerchantCommandFailure;

export type SaveTagResult =
  | {
      tag: Tag;
      status: 'saved';
    }
  | (MerchantCommandFailure & {
      fieldErrors?: TagCommandFieldErrors;
    });

function mapTagFieldErrors(
  issues: Array<{ path: PropertyKey[] }>,
): TagCommandFieldErrors {
  return Object.fromEntries(
    issues.map((issue) => {
      const field = String(issue.path[0] ?? '');
      const key = field.startsWith('name') ? 'name' : field;

      return [
        key,
        tDefault('merchant.tags.validation.invalid', 'This field is invalid.'),
      ];
    }),
  ) as TagCommandFieldErrors;
}

export type TagListCommands = {
  createTag(storeId: string, input: CreateTagRequest): Promise<SaveTagResult>;
  loadTags(storeId: string, isActive: TagActiveFilter): Promise<LoadTagsResult>;
  updateTag(
    storeId: string,
    tagId: string,
    input: UpdateTagRequest,
  ): Promise<SaveTagResult>;
};

export function createTagListCommands(
  actions: TagListActions,
): TagListCommands {
  return {
    async loadTags(storeId, isActive) {
      actions.loadStarted();

      try {
        const tags = await tagService.listTags(storeId, isActive);

        actions.loadSucceeded(tags);
        return {
          status: 'loaded',
        };
      } catch (error) {
        const failure = mapMerchantApiError(error);

        actions.loadFailed(failure.message);
        return failure;
      }
    },

    async createTag(storeId, input) {
      const validation = createTagSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapTagFieldErrors(validation.error.issues),
          message: tDefault(
            'merchant.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const tag = await tagService.createTag(storeId, input);

        actions.tagSaved(tag);
        return {
          tag,
          status: 'saved',
        };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },

    async updateTag(storeId, tagId, input) {
      const validation = updateTagSchema.safeParse(input);

      if (!validation.success) {
        return {
          fieldErrors: mapTagFieldErrors(validation.error.issues),
          message: tDefault(
            'merchant.errors.validation',
            'Check the highlighted fields and try again.',
          ),
          reason: 'invalid',
          status: 'failed',
        };
      }

      try {
        const tag = await tagService.updateTag(storeId, tagId, input);

        actions.tagSaved(tag);
        return {
          tag,
          status: 'saved',
        };
      } catch (error) {
        return mapMerchantApiError(error);
      }
    },
  };
}
