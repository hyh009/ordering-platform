import type { TagListActions } from '@/features/menu/tags/list/actions';
import {
  createTagListCommands,
  type LoadTagsResult,
  type TagListCommands,
} from '@/features/menu/tags/list/commands';
import {
  createTagMutationCommands,
  type SaveTagResult,
} from '@/features/menu/tags/mutations/commands';
import type {
  CreateTagRequest,
  TagActiveFilter,
  UpdateTagRequest,
} from '@/models/tag';

export type { LoadTagsResult, SaveTagResult };

export type TagListPageCommands = Pick<TagListCommands, 'loadTags'> & {
  createTag(
    storeId: string,
    isActive: TagActiveFilter,
    input: CreateTagRequest,
  ): Promise<SaveTagResult>;
  updateTag(
    storeId: string,
    isActive: TagActiveFilter,
    tagId: string,
    input: UpdateTagRequest,
  ): Promise<SaveTagResult>;
};

export function createTagListPageCommands(
  actions: TagListActions,
): TagListPageCommands {
  const listCommands = createTagListCommands(actions);
  const mutationCommands = createTagMutationCommands();

  return {
    async createTag(storeId, isActive, input) {
      const result = await mutationCommands.createTag(storeId, input);

      if (result.status === 'saved') {
        await listCommands.loadTags(storeId, isActive);
      }

      return result;
    },

    loadTags: listCommands.loadTags,

    async updateTag(storeId, isActive, tagId, input) {
      const result = await mutationCommands.updateTag(storeId, tagId, input);

      if (result.status === 'saved') {
        await listCommands.loadTags(storeId, isActive);
      }

      return result;
    },
  };
}
