import { tDefault } from '@/app/i18n';
import { createTagSchema, updateTagSchema } from '@/models/tag';
import type { CreateTagRequest, Tag, UpdateTagRequest } from '@/models/tag';
import { tagService } from '@/services/tag.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';

export type TagCommandFieldErrors = Partial<Record<'name' | 'color', string>>;

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

export type TagMutationCommands = {
  createTag(storeId: string, input: CreateTagRequest): Promise<SaveTagResult>;
  updateTag(
    storeId: string,
    tagId: string,
    input: UpdateTagRequest,
  ): Promise<SaveTagResult>;
};

export function createTagMutationCommands(): TagMutationCommands {
  return {
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
