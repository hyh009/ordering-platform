import { toTagDto } from '@src/models/tag/mapper';
import { tagRepository } from '@src/repositories/tag/repository';
import { ERROR_CODES } from '@src/utils/errorCode';
import { NotFoundError } from '@src/utils/errors';

import type { TagActiveFilter, TagDto } from '@repo/shared';
import type { LocalizedString } from '@src/models/common/model';

export type CreateTagInput = {
  name: LocalizedString;
  color?: string | undefined;
  isActive?: boolean | undefined;
};

export type UpdateTagInput = {
  name?: LocalizedString | undefined;
  color?: string | undefined;
  isActive?: boolean | undefined;
};

export class TagService {
  // Store existence and the caller's organization are already resolved by the
  // requireOrgRole middleware (which looks the store up by :storeId and rejects
  // unknown stores with 403). These methods trust that resolution instead of
  // re-querying the store on every request.
  public async listTags(
    storeId: string,
    isActive: TagActiveFilter,
  ): Promise<TagDto[]> {
    const tags = await tagRepository.listByStore({
      storeId,
      ...(isActive === 'all' ? {} : { isActive: isActive === 'true' }),
    });

    return tags.map(toTagDto);
  }

  public async createTag(
    storeId: string,
    organizationId: string,
    input: CreateTagInput,
  ): Promise<TagDto> {
    const tag = await tagRepository.create({
      organizationId,
      storeId,
      name: input.name,
      color: input.color,
      isActive: input.isActive,
    });

    return toTagDto(tag);
  }

  public async updateTag(
    storeId: string,
    tagId: string,
    input: UpdateTagInput,
  ): Promise<TagDto> {
    const existing = await tagRepository.findById(tagId);

    if (!existing || existing.storeId !== storeId) {
      throw new NotFoundError('Tag not found', ERROR_CODES.TAG_NOT_FOUND);
    }

    const updated = await tagRepository.update(tagId, {
      name: input.name,
      color: input.color,
      isActive: input.isActive,
    });

    if (!updated) {
      throw new NotFoundError('Tag not found', ERROR_CODES.TAG_NOT_FOUND);
    }

    return toTagDto(updated);
  }
}

export function createTagService() {
  return new TagService();
}

export const tagService = createTagService();
