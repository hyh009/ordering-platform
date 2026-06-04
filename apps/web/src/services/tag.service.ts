import { apiJson } from '@/api';
import { menuPaths } from '@/api/paths/menu.paths';
import { tagModel } from '@/models/tag';
import type {
  CreateTagRequest,
  CreateTagSuccessResponse,
  ListTagsSuccessResponse,
  TagActiveFilter,
  UpdateTagRequest,
  UpdateTagSuccessResponse,
} from '@/models/tag';
import { withActiveFilter } from './utils/activeFilter';

export const tagService = {
  async listTags(storeId: string, isActive: TagActiveFilter) {
    const response = await apiJson<ListTagsSuccessResponse>(
      withActiveFilter(menuPaths.tags(storeId), isActive),
    );

    return response.data.tags.map(tagModel.deserialize);
  },

  async createTag(storeId: string, input: CreateTagRequest) {
    const response = await apiJson<CreateTagSuccessResponse>(
      menuPaths.tags(storeId),
      {
        body: JSON.stringify(input),
        method: 'POST',
      },
    );

    return tagModel.deserialize(response.data.tag);
  },

  async updateTag(storeId: string, tagId: string, input: UpdateTagRequest) {
    const response = await apiJson<UpdateTagSuccessResponse>(
      menuPaths.tagDetail(storeId, tagId),
      {
        body: JSON.stringify(input),
        method: 'PATCH',
      },
    );

    return tagModel.deserialize(response.data.tag);
  },
};
