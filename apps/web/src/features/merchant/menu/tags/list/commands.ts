import type { TagActiveFilter } from '@/models/tag';
import { tagService } from '@/services/tag.service';
import {
  mapMerchantApiError,
  type MerchantCommandFailure,
} from '@/services/utils/merchantApiError';
import type { TagListActions } from './actions';

export type LoadTagsResult =
  | {
      status: 'loaded';
    }
  | MerchantCommandFailure;

export type TagListCommands = {
  loadTags(storeId: string, isActive: TagActiveFilter): Promise<LoadTagsResult>;
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
  };
}
