import type { TagListActions } from '@/features/menu/tagList/actions';
import {
  createTagListCommands,
  type LoadTagsResult,
  type SaveTagResult,
  type TagListCommands,
} from '@/features/menu/tagList/commands';

export type { LoadTagsResult, SaveTagResult };

export type TagListPageCommands = Pick<
  TagListCommands,
  'createTag' | 'loadTags' | 'updateTag'
>;

export function createTagListPageCommands(
  actions: TagListActions,
): TagListPageCommands {
  const base = createTagListCommands(actions);

  return {
    createTag: base.createTag,
    loadTags: base.loadTags,
    updateTag: base.updateTag,
  };
}
